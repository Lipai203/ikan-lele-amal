# TODO - Upgrade Sistem Auto Reply Email (AI Customer Service Kontekstual)

## Completed
- [x] Matikan fallback keyword sederhana di `api/send-email.js`
- [x] Tambahkan conversation memory in-memory + kirim `conversationContext` ke `generateAIReply()`
- [x] Update `api/aiService.js` agar prompt memakai konteks percakapan dan melarang ketergantungan keyword

## Gmail Inbox AI Auto-Reply (dari nol karena refresh token belum ada)
- [ ] Buat endpoint OAuth untuk generate refresh token
  - [x] `api/gmail-oauth-url.js`
  - [x] `api/gmail-oauth-callback.js`
- [ ] Buat worker polling inbox Gmail
  - [x] `api/gmailAutoReplyWorker.js`
  - [x] `api/gmailAutoReplyPoller.js`
- [ ] Tambahkan runner untuk mulai polling di server lokal / Node runtime
  - [ ] (Opsional) endpoint trigger: `POST /api/start-gmail-poller` atau script node
- [ ] Buat dokumentasi cara pakai
  - [ ] Cara akses `gmail-oauth-url` → consent → dapatkan `refresh_token`
  - [ ] Cara menjalankan poller lokal (interval 15 detik)

## Uji manual (wajib setelah polling jalan)
- [ ] Pertanyaan panjang + typo ringan
- [ ] Follow-up pertanyaan ambigu di thread yang sama
- [ ] Di luar topik → harus fallback penolakan sopan
- [ ] Anti-loop: kirim ulang email dari akun perusahaan → tidak dibalas

