// ====== WA: GANTI NOMOR INI dengan nomor perusahaan Anda ======
// format: 62xxxx atau nomor tanpa tanda +, misalnya: 6281234567890
const WA_NUMBER = '6281234567890';

// ====== EMAIL: tujuan perusahaan untuk form kontak ======
const COMPANY_EMAIL = 'senasaka141210@gmail.com';

function buildMailtoUrl({ nama, kontak, pesan }) {
  const subject = 'Permintaan Informasi Lele (Website)';


  const body = [
    'Halo Pak/Bu,',
    '',
    'Saya ingin bertanya tentang pembibitan/pembesaran/panen.',
    '',
    `Nama: ${nama || '-'}`,
    `Kontak/Email: ${kontak || '-'}`,
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
const EMAIL_API_BASE_URL = 'http://localhost:3000';
const SEND_EMAIL_ENDPOINT = `${EMAIL_API_BASE_URL}/api/send-email`;

function setFormSubmitting(submitting) {
  if (!contactForm) return;
  const btn = contactForm.querySelector('button[type="submit"]');
  const inputs = contactForm.querySelectorAll('input, textarea, button[type="submit"]');

  if (btn) {
    btn.disabled = submitting;
    btn.style.opacity = submitting ? '0.7' : '1';
    btn.style.cursor = submitting ? 'not-allowed' : 'pointer';
    btn.setAttribute('aria-busy', submitting ? 'true' : 'false');
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
    const kontak = document.getElementById('kontak')?.value?.trim();
    const pesan = document.getElementById('pesan')?.value?.trim();

    // Area status (buat inline jika belum ada)
    let statusEl = document.getElementById('contactStatus');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'contactStatus';
      statusEl.className = 'fineprint';
      contactForm.appendChild(statusEl);
    }

    try {
      statusEl.textContent = 'Mengirim pesan...';
      setFormSubmitting(true);

      const resp = await fetch(SEND_EMAIL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, kontak, pesan })
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        const msg = data?.error || 'Gagal mengirim email.';
        throw new Error(msg);
      }

      await resp.json();
      statusEl.textContent = 'Pesan terkirim! Terima kasih.';
      contactForm.reset();
    } catch (err) {
      statusEl.textContent = `Pengiriman gagal: ${err.message}`;

      // Fallback untuk situasi backend belum aktif (optional): gunakan mailto
      // agar pengguna tetap bisa menghubungi via email client.
      const fallbackMailtoUrl = buildMailtoUrl({ nama, kontak, pesan });
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


function buildWaLink() {
  const text = encodeURIComponent('Halo, saya ingin tanya tentang layanan pertenakan/pesan lele.');
  return `https://wa.me/${+6281357068983}?text=${text}`;
}

if (waOpen) {
  waOpen.href = buildWaLink();
}

const waMsg = document.getElementById('waMsg');
if (waMsg) {
  waMsg.textContent = `Klik “Buka WhatsApp” untuk mengarah ke nomor: ${+6281357068983}`;
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

