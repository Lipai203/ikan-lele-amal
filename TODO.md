# TODO - Upgrade Auto Reply Email jadi AI Customer Service Kontekstual

## Step 1: Analisis & plan final
- [x] AI hanya dipakai (tanpa keyword matching) + fallback generik
- [x] Identifikasi alur saat ini: AI + fallback keyword
- [x] Validasi requirement: harus non-keyword & konteks percakapan

## Step 2: Implementasi perubahan kode
- [x] Matikan fallback keyword:
  - [x] Hapus penggunaan `detectKeyword()` dan `buildAutoReply()` dari `api/send-email.js`
- [x] Implementasi conversation memory sederhana:
  - [x] Buat in-memory cache Map (key: whatsapp/email)
  - [x] Simpan ringkasan konteks percakapan
  - [x] Kirim konteks tersebut ke `generateAIReply()`
- [x] Update `api/aiService.js` agar menerima `conversationContext` dan memakainya dalam prompt

## Step 3: Rapikan impor
- [ ] Hilangkan import yang tidak lagi dipakai (autoReplyKeywords/autoReplyService) dari `api/send-email.js`

## Step 4: Uji manual
- [ ] Kirim beberapa input test (follow-up, typo, panjang, ambigu)
- [ ] Pastikan respon tetap ramah, singkat, relevan lele
- [ ] Pastikan AI menolak di luar topik

