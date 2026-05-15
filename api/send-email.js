import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { nama, email, whatsapp, pesan } = req.body;

    // ===== VALIDASI SEDERHANA =====
    if (!nama || !email || !pesan) {
      return res.status(400).json({ success: false, error: "Data tidak lengkap" });
    }

    // ===== TRANSPORT EMAIL =====
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // ===== KEYWORD BOT =====
    const text = (pesan || "").toLowerCase();

    let replyMessage = `
      Terima kasih telah menghubungi Lele Sehat Prima.<br><br>
      Kami sudah menerima pesan Anda dan akan segera merespon.
    `;

    if (text.includes("harga")) {
      replyMessage = "Harga bibit lele mulai dari Rp120 per ekor tergantung ukuran.";
    } 
    else if (text.includes("bibit")) {
      replyMessage = "Kami menyediakan bibit lele ukuran 5–7 cm dan 7–9 cm.";
    } 
    else if (text.includes("pengiriman")) {
      replyMessage = "Kami melayani pengiriman luar kota dengan packing oksigen.";
    } 
    else if (text.includes("jam")) {
      replyMessage = "Jam operasional Senin–Sabtu pukul 08.00–17.00 WIB.";
    } 
    else if (text.includes("alamat")) {
      replyMessage = "Lokasi kami berada di area peternakan Lele Sehat Prima (Jakarta).";
    } 
    else if (text.includes("stok")) {
      replyMessage = "Stok bibit selalu tersedia setiap hari, silakan hubungi kami.";
    }

    // ===== EMAIL KE ADMIN =====
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: "Permintaan dari Website Lele",
      html: `
        <h2>Pesan Baru dari Website</h2>
        <p><b>Nama:</b> ${nama}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>WhatsApp:</b> ${whatsapp || "-"}</p>
        <p><b>Pesan:</b> ${pesan}</p>
      `,
    });

    // ===== AUTO REPLY KE PELANGGAN =====
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Balasan Otomatis - Lele Sehat Prima",
      html: `
        <h3>Halo ${nama},</h3>
        <p>${replyMessage}</p>
        <br>
        <p>Terima kasih telah menghubungi kami.</p>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Email berhasil dikirim & auto reply aktif",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: "Server error saat mengirim email",
    });
  }
}