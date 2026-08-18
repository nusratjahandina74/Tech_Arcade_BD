const nodemailer = require("nodemailer");

// Configure via env vars — works with Gmail SMTP (with an app password), a
// free-tier transactional provider (Brevo, Resend, Mailgun), or any SMTP
// server. If SMTP_HOST isn't set yet, emails just get logged to the console
// so the whole flow (e.g. password reset) can be tested before you've picked
// a provider.

let transporter = null;
function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587/25
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, html }) {
  const transport = getTransport();

  if (!transport) {
    console.log(`[email:SIMULATED] to ${to} — "${subject}"\n(no SMTP_HOST configured yet — see backend/.env.example)`);
    return { simulated: true };
  }

  await transport.sendMail({
    from: process.env.EMAIL_FROM || '"TechArcade" <no-reply@techarcade.com>',
    to,
    subject,
    html,
  });
  return { simulated: false };
}

module.exports = { sendEmail };
