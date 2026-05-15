// Auto reply service berdasarkan keyword pesan pelanggan.
// Tidak pakai database. Hanya pencocokan keyword sederhana (rule-based).

import { detectKeyword, buildFallbackReplyText } from './autoReplyKeywords.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('"', '"')
    .replaceAll("'", '&#039;');
}

function textToHtmlParagraphs(text) {
  const lines = String(text ?? '').split('\n');
  return lines
    .map((line) => (line.trim() ? `<p>${escapeHtml(line)}</p>` : '<div style="height:8px"></div>'))
    .join('');
}

export function buildAutoReply(pesan, { nama } = {}) {
  const kw = detectKeyword(pesan);

  if (!kw) {
    const replyText = buildFallbackReplyText(nama);
    const replyHtml = `
      <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
        ${textToHtmlParagraphs(replyText)}
        <div style="margin-top:14px; font-size:12px; color:#555;">
          Hormat kami,<br/>Lele Sehat Prima
        </div>
      </div>
    `;

    return { matched: null, replyText, replyHtml };
  }

  const replyText = kw.replyText(nama);
  const replyHtml = `
    <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
      ${textToHtmlParagraphs(replyText)}
      <div style="margin-top:14px; font-size:12px; color:#555;">
        Hormat kami,<br/>Lele Sehat Prima
      </div>
    </div>
  `;

  return { matched: kw.matchedLabel, replyText, replyHtml };
}

