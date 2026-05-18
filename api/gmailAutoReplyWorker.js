import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";

import { generateAIReply } from "./aiService.js";

function getEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKEN_PATH = path.join(__dirname, ".gmail_token.json");

function loadStoredToken() {
  const raw = fs.readFileSync(TOKEN_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  if (!parsed?.refresh_token) throw new Error("Refresh token not found in .gmail_token.json");
  return parsed;
}

function normalizeText(s, maxLen = 20000) {
  const str = String(s ?? "");
  return str.replaceAll(/\r/g, " ").replaceAll(/\n/g, " ").replaceAll(/\s+/g, " ").trim().slice(0, maxLen);
}

function decodeBase64Url(data) {
  const buff = Buffer.from(String(data || "").replace(/-/g, "+").replace(/_/g, "/"), "base64");
  return buff.toString("utf-8");
}

function pickHeader(headers, name) {
  const h = headers?.find((x) => String(x.name || "").toLowerCase() === String(name).toLowerCase());
  return h?.value || "";
}

function shouldSkipMessage({ from, subject, isAutoReplied, bodyText }) {
  // Anti-loop utama: skip dari akun perusahaan yang dipakai untuk reply
  const companyEmail = String(process.env.EMAIL_USER || "").toLowerCase();
  if (companyEmail && from && String(from).toLowerCase().includes(companyEmail)) return true;

  // Skip jika menandakan auto reply (konservatif)
  if (isAutoReplied) return true;

  // Skip content yang jelas bukan business (spam/promotions) secara ringan
  const txt = normalizeText(bodyText, 4000).toLowerCase();
  const promoSignals = ["promo", "diskon", "sale", "iklan", "subscription", "berlangganan"];
  if (promoSignals.some((p) => txt.includes(p))) return true;

  return false;
}

const inMemoryLocks = new Set();

export async function checkInboxAndAutoReply({ aiMaxWords = 500 } = {}) {
  const stored = loadStoredToken();

  const clientId = getEnv("GOOGLE_CLIENT_ID");
  const clientSecret = getEnv("GOOGLE_CLIENT_SECRET");

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: stored.refresh_token });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Ambil unread messages
  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: "is:unread -in:chats",
    maxResults: 5,
  });

  const messages = listRes.data?.messages || [];
  for (const m of messages) {
    const messageId = m.id;
    const lockKey = `msg:${messageId}`;
    if (inMemoryLocks.has(lockKey)) continue;
    inMemoryLocks.add(lockKey);

    try {
      const msgRes = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      const payload = msgRes.data;
      const headers = payload.payload?.headers || [];

      const from = pickHeader(headers, "From");
      const subject = pickHeader(headers, "Subject");
      const to = pickHeader(headers, "To");
      const messageThreadId = payload.threadId;

      // Extract body text
      const bodyText = (() => {
        const parts = payload.payload?.parts;
        if (!parts || parts.length === 0) return "";
        // simple recursive search
        const stack = [...parts];
        while (stack.length) {
          const p = stack.shift();
          if (p?.parts) stack.push(...p.parts);
          const mime = String(p?.mimeType || "");
          const data = p?.body?.data;
          if (!data) continue;
          if (mime.includes("text/plain")) return decodeBase64Url(data);
          // fallback to text/html stripping is out of scope here
        }
        return "";
      })();

      const isAutoReplied = (String(subject || "").toLowerCase().includes("balasan otomatis") ||
        String(subject || "").toLowerCase().includes("autoreply"));

      if (shouldSkipMessage({ from, subject, isAutoReplied, bodyText })) {
        // mark read to avoid reprocessing
        await gmail.users.messages.modify({
          userId: "me",
          id: messageId,
          requestBody: { removeLabelIds: ["UNREAD"] },
        });
        continue;
      }

      const customerName = (() => {
        // naive: take part before @ if email in from
        const emailMatch = String(from || "").match(/<([^>]+)>/);
        const mail = (emailMatch?.[1] || from || "").trim();
        const namePart = mail.split("@")[0] || "Pak/Bu";
        return namePart.replaceAll(/[._-]/g, " ").trim().slice(0, 40);
      })();

      // Conversation context sederhana: gunakan threadId sebagai kunci in-memory
      // (tanpa DB) untuk follow-up di instance yang sama.
      const threadMemory = (checkInboxAndAutoReply._threadMemory = checkInboxAndAutoReply._threadMemory || new Map());
      const prev = threadMemory.get(messageThreadId);
      const conversationContext = prev?.context || "";

      const pesan = normalizeText(bodyText, 8000);

      const aiReply = await generateAIReply({
        nama: customerName,
        email: pickHeader(headers, "Reply-To") || pickHeader(headers, "From"),
        whatsapp: "-",
        pesan,
        conversationContext,
      });

      const replyText = String(aiReply || "").slice(0, 1000);

      // Build raw RFC822 email for reply-in-thread
      // Note: untuk simplicity, kita reply sebagai plain text.
      const replyLines = [
        `To: ${from}`,
        `Subject: Re: ${subject || ""}`,
        `In-Reply-To: ${messageId}`,
        `References: ${messageId}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        replyText,
      ];

      const rawMessage = Buffer.from(replyLines.join("\r\n"))
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");

      // Send reply. To ensure it is in the same thread, set threadId.
      await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: rawMessage,
          threadId: messageThreadId,
        },
      });

      // mark as read
      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: { removeLabelIds: ["UNREAD"] },
      });

      // update thread context
      const trimmedPesan = pesan.slice(0, 220);
      const trimmedReply = replyText.slice(0, 220);
      threadMemory.set(messageThreadId, {
        context: `Pesan: ${trimmedPesan}\nBalasan: ${trimmedReply}`,
        updatedAt: Date.now(),
      });
    } finally {
      inMemoryLocks.delete(lockKey);
    }
  }
}

