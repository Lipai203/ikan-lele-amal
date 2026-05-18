// api/aiService.js
// AI reply generation menggunakan OpenAI GPT-4o-mini.

import OpenAI from "openai";

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), ms))
  ]);
}

function sanitizeForPrompt(text, maxLen = 4000) {
  // Anti CRLF & length limit untuk prompt
  return String(text ?? '')
    .replaceAll('\r', ' ')
    .replaceAll('\n', ' ')
    .trim()
    .slice(0, maxLen);
}

export async function generateAIReply({ nama, email, whatsapp, pesan, conversationContext }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error('Missing OPENAI_API_KEY');
    err.code = 'NO_OPENAI_KEY';
    throw err;
  }

  const openai = new OpenAI({ apiKey });

  const safeNama = sanitizeForPrompt(nama, 120);
  const safeEmail = sanitizeForPrompt(email, 200);
  const safeWa = sanitizeForPrompt(whatsapp || '-', 120);
  const safePesan = sanitizeForPrompt(pesan, 3000);
  const safeContext = sanitizeForPrompt(conversationContext || '', 1400);

  const systemPrompt =
    'Kamu adalah AI Customer Service profesional untuk bisnis peternakan lele “Lele Sehat Prima”. ' +
    'Tugasmu membaca seluruh isi email pelanggan, memahami maksudnya (meski berbeda kalimat/typo), ' +
    'lalu membalas natural seperti admin/customer service manusia. ' +
    'Jawab singkat, jelas (sekitar 90–140 kata), ramah, dan profesional. ' +
    'Selalu relevan dengan pembibitan, pembesaran, panen lele, konsultasi budidaya, serta pemesanan bibit/hasil panen. ' +
    'Jika pertanyaan di luar topik, tolak dengan sopan. ' +
    'Gunakan percakapan konteks yang diberikan untuk follow-up. ' +
    'JANGAN mengandalkan pencocokan keyword sederhana. Jangan menyebut proses deteksi keyword.';

  const userPrompt = `
Data pelanggan:
- Nama: ${safeNama}
- Email: ${safeEmail}
- WhatsApp: ${safeWa}

Konteks percakapan sebelumnya (jika ada):
${safeContext || '- (tidak ada)'}

Isi email pelanggan (dibaca penuh):
${safePesan}

Kebutuhan jawaban:
- fokus peternakan lele
- bahasa Indonesia natural
- boleh menjawab beberapa pertanyaan sekaligus
- jika pertanyaan tidak jelas, minta detail singkat yang dibutuhkan
- jika pelanggan menanyakan harga: jelaskan bahwa harga tergantung jumlah & lokasi, dan arahkan untuk detail via WhatsApp
- jika pelanggan ingin konsultasi: arahkan untuk chat WhatsApp dengan data kebutuhan
- jika AI bingung, pakai fallback: "Mohon maaf, kami belum memahami detail kebutuhan Anda..."\r\n`;

  try {
    // Timeout untuk request OpenAI
    const controller = null; // placeholder; Vercel Node 24 + openai biasanya cukup dengan promise timeout

    const result = await withTimeout(
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 220
      }),
      12000
    );

    const content = result?.choices?.[0]?.message?.content;
    if (!content) {
      const err = new Error('AI returned empty content');
      err.code = 'EMPTY_AI_REPLY';
      throw err;
    }

    // Normalize jadi plain text pendek
    const reply = String(content)
      .replaceAll('\r', ' ')
      .replaceAll('\n\n\n', '\n\n')
      .trim();

    return reply;
  } catch (err) {
    // Lempar lagi agar send-email.js bisa fallback
    err.ai = true;
    throw err;
  }
}

