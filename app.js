// ====== WA: GANTI NOMOR INI dengan nomor perusahaan Anda ======
// format: 62xxxx atau nomor tanpa tanda +, misalnya: 6281234567890
const WA_NUMBER = '6281234567890';

// ====== EMAIL: tujuan perusahaan untuk form kontak ======
const COMPANY_EMAIL = 'senasaka141210@gmail.com';

function buildMailtoUrl({ nama, email, whatsapp, pesan }) {
  const subject = 'Permintaan Informasi Lele (Website)';


  const body = [
    'Halo Pak/Bu,',
    '',
    'Saya ingin bertanya tentang pembibitan/pembesaran/panen.',
    '',
    `Nama: ${nama || '-'}`,
    `Email: ${email || '-'}`
    `WhatsApp: ${whatsapp || '-'}`
    `Kebutuhan: ${pesan || '-'}`,
    '',
    'Terima kasih.'
  ].join('\n');

  const params = new URLSearchParams({
    subject,
    body
  });

  return `mailto:${COMPANY_EMAIL}?${params.toString()}`;
}

// ====== Form Kontak (Kirim Pesan) ======
// Untuk kirim email TANPA membuka Gmail, submit form akan POST ke backend.
// Jalankan server dulu di folder server, lalu pastikan BASE_URL sesuai.
// Vercel serverless endpoint (production):
// Gunakan relative path agar kompatibel saat domain berubah.
const SEND_EMAIL_ENDPOINT = '/api/send-email';

function getFieldValue(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function showAlert(msg) {
  // simple alert sesuai requirement
  alert(msg);
}

function validateFormOrAlert({ nama, email, whatsapp, pesan }) {
  if (!nama) return showAlert('Nama wajib diisi.'), false;
  if (!email) return showAlert('Email wajib diisi.'), false;
  if (!whatsapp) return showAlert('WhatsApp wajib diisi.'), false;
  if (!pesan) return showAlert('Pesan wajib diisi.'), false;
  return true;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), ms))
  ]);
}




function setFormSubmitting(submitting) {
  if (!contactForm) return;

  const btn = contactForm.querySelector('button[type="submit"]');
  const inputs = contactForm.querySelectorAll('input, textarea, button[type="submit"]');

  if (btn) {
    btn.disabled = submitting;
    btn.style.opacity = submitting ? '0.7' : '1';
    btn.style.cursor = submitting ? 'not-allowed' : 'pointer';
    btn.setAttribute('aria-busy', submitting ? 'true' : 'false');

    // Loading state sesuai requirement
    const currentTextEl = btn.querySelector('span')?.nextSibling;
    const saved = btn.getAttribute('data-default-text');
    if (!saved) {
      // simpan teks default tanpa ikon
      btn.setAttribute('data-default-text', btn.textContent.replace('✉️', '').replace('Kirim Pesan', 'Kirim Pesan').trim());
    }

    if (submitting) {
      btn.textContent = 'Mengirim...';
    } else {
      const defaultText = btn.getAttribute('data-default-text');
      btn.textContent = defaultText || 'Kirim Pesan';
      // kembalikan ikon envelope jika ada
      if (!btn.querySelector('span')) {
        btn.prepend(document.createElement('span'));
      }
    }
  }

  inputs.forEach((el) => {
    if (el.tagName === 'BUTTON') return;
    el.disabled = submitting;
  });
}


const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nama = document.getElementById('nama')?.value?.trim();
    const email = document.getElementById('email')?.value?.trim();
    const whatsapp = document.getElementById('whatsapp')?.value?.trim();
    const pesan = document.getElementById('pesan')?.value?.trim();


    // Area status (buat inline jika belum ada)
    let statusEl = document.getElementById('contactStatus');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'contactStatus';
      statusEl.className = 'fineprint';
      contactForm.appendChild(statusEl);
    }

    // validasi form + alert sesuai requirement
    if (!validateFormOrAlert({ 
  nama, 
  email, 
  whatsapp, 
  pesan 
})) {
  return;
}

    try {
      statusEl.textContent = 'Mengirim pesan...';
      setFormSubmitting(true);


      // simple timeout agar bisa tangkap kasus server timeout
      const resp = await withTimeout(
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nama, email, whatsapp, pesan })
        }),
        15000
      );


      if (!resp.ok) {
        const result = await resp.json().catch(() => null);
        console.error('[contact] api response not ok', {
          status: resp.status,
          statusText: resp.statusText,
          result
        });
        const msg = result?.error || 'Gagal mengirim email.';
        throw new Error(msg);
      }

      const result = await resp.json().catch(() => null);
      if (!result || result.success !== true) {
        console.error('[contact] api returned unsuccessful result', result);
        const msg = result?.error || 'Gagal mengirim email.';
        throw new Error(msg);
      }

      statusEl.textContent = 'Pesan terkirim! Terima kasih.';
      contactForm.reset();
    } catch (err) {
      console.error('[contact] send-email failed', err);
      // Error handling detail
      // - jaringan: biasanya TypeError (fetch)
      // - timeout: message = 'Request timeout'
      // - API error: message dari server
      let msg = err && err.message ? err.message : 'Gagal mengirim email.';
      if (msg === 'Request timeout') msg = 'Server timeout. Coba lagi sebentar lagi.';
      statusEl.textContent = `Pengiriman gagal: ${msg}`;


      // Fallback untuk situasi backend belum aktif (optional): gunakan mailto
      // agar pengguna tetap bisa menghubungi via email client.
      const fallbackMailtoUrl = buildMailtoUrl({ 
            nama, 
            email, 
            whatsapp, 
            pesan 
  });
      // Jangan paksa navigate agar tetap sesuai permintaan tanpa membuka Gmail.
      // Namun jika Anda ingin tetap membuka: uncomment line berikut.
      // window.location.href = fallbackMailtoUrl;

    } finally {
      setFormSubmitting(false);
    }
  });
}


// ====== WA Pop-up ======
const waToggle = document.getElementById('waToggle');
const waPop = document.getElementById('waPop');
const waClose = document.getElementById('waClose');
const waOpen = document.getElementById('waOpen');


function normalizeWaNumber(n) {
  // requirement:
  // - hilangkan '+'
  // - hilangkan spasi
  // - hilangkan angka 0 depan (sekali)
  const raw = String(n ?? '').replaceAll('+', '').replaceAll(' ', '').trim();
  const wospaces = raw.replaceAll('-', '');
  return wospaces.startsWith('0') ? wospaces.slice(1) : wospaces;
}

function buildWaLink() {
  const text = encodeURIComponent('Halo, saya ingin tanya tentang layanan pertenakan/pesan lele.');
  // format: https://wa.me/628xxxxxxxxxx?text=...
  const number = normalizeWaNumber('6281357068983');
  return `https://wa.me/${number}?text=${text}`;
}




if (waOpen) {
  waOpen.href = buildWaLink();
}

const waMsg = document.getElementById('waMsg');
if (waMsg) {
waMsg.textContent = `Klik “Buka WhatsApp” untuk mengarah ke nomor: 6281357068983`;
}


function openPop() {
  if (!waPop) return;
  waPop.classList.add('open');
  waPop.setAttribute('aria-hidden', 'false');
}
function closePop() {
  if (!waPop) return;
  waPop.classList.remove('open');
  waPop.setAttribute('aria-hidden', 'true');
}

if (waToggle) {
  waToggle.addEventListener('click', () => {
    if (waPop && waPop.classList.contains('open')) closePop();
    else openPop();
  });
}
if (waClose) {
  waClose.addEventListener('click', closePop);
}

// click outside to close
if (waPop && waToggle) {
  document.addEventListener('click', (e) => {
    const isClickInside = waPop.contains(e.target) || waToggle.contains(e.target);
    if (!isClickInside) closePop();
  });
}

// ====== Footer year ======
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// ====== Reveal on scroll ======
const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReduced) {
  const els = Array.from(document.querySelectorAll('.reveal'));
  const io = new IntersectionObserver(
    (entries) => {
      for (const ent of entries) {
        if (ent.isIntersecting) {
          ent.target.classList.add('visible');
          io.unobserve(ent.target);
        }
      }
    },
    { threshold: 0.14 }
  );

  els.forEach((el) => io.observe(el));
}

// ====== Fade in page on load ======
(function pageFadeIn() {
  // Helps when navigating between html pages.
  document.documentElement.classList.add('js');
  const main = document.querySelector('main');
  if (main && !prefersReduced) {
    main.classList.add('page-fade');
  }
})();

