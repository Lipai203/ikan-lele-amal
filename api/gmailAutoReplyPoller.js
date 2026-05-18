import { checkInboxAndAutoReply } from "./gmailAutoReplyWorker.js";

// Poller: untuk runtime yang berjalan terus (mis. node server). 
// Untuk Vercel serverless, setInterval tidak dijamin terus hidup.
// Di proyek ini, file dibuat agar mudah jalan lokal/dev.

export function startGmailAutoReplyPoller({ intervalMs = 15000 } = {}) {
  let timer = null;
  let running = false;

  async function tick() {
    if (running) return;
    running = true;
    try {
      await checkInboxAndAutoReply();
    } catch (err) {
      console.error("[gmail-auto-reply] tick error:", err?.message || err);
    } finally {
      running = false;
    }
  }

  timer = setInterval(tick, intervalMs);
  // immediate first run
  tick();

  return {
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}

