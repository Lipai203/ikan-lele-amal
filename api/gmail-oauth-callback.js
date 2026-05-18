import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

function getEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKEN_PATH = path.join(__dirname, ".gmail_token.json");

export default async function handler(req, res) {
  try {
    const code = req.query?.code;
    const bodyCode = req.body?.code;
    const authCode = code || bodyCode;

    if (!authCode || typeof authCode !== "string") {
      return res
        .status(400)
        .json({
          success: false,
          error: "Missing query param 'code' from OAuth callback",
        });
    }

    const clientId = getEnv("GOOGLE_CLIENT_ID");
    const clientSecret = getEnv("GOOGLE_CLIENT_SECRET");
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      "http://localhost:3000/api/gmail-oauth-callback";

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(authCode);

    if (!tokens?.refresh_token) {
      return res.status(400).json({
        success: false,
        error:
          "No refresh_token returned. Pastikan akses offline + prompt=consent dan belum pernah approve sebelumnya.",
      });
    }

    const stored = {
      refresh_token: tokens.refresh_token,
      scope: tokens.scope || "gmail.modify",
      generatedAt: Date.now(),
    };

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(stored, null, 2), "utf-8");

    return res.status(200).json({
      success: true,
      message: "Refresh token stored successfully.",
      tokenPath: TOKEN_PATH,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

