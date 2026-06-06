import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

// Email service. EMAIL_ENABLED=false (dev) -> credentials are logged to the
// console instead of sent. Set EMAIL_ENABLED=true + SMTP_* to send for real.
let _transporter = null;
function transporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465, // implicit TLS on 465, STARTTLS otherwise
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  return _transporter;
}

// Sent when an admin provisions an account: the user's credentials + login link.
// The temporary password must be changed on first login (enforced server-side).
export async function sendAccessEmail(email, { firstName, tempPassword } = {}) {
  const link = `${config.appUrl}/login`;
  const subject = 'Vos accès à Strategor';
  const text =
    `Bonjour${firstName ? ' ' + firstName : ''},\n\n` +
    `Un compte Strategor a été créé pour vous.\n\n` +
    `Email : ${email}\n` +
    `Mot de passe temporaire : ${tempPassword}\n\n` +
    `Connectez-vous ici : ${link}\n` +
    `Vous devrez définir un nouveau mot de passe lors de votre première connexion.\n`;

  if (!config.email.enabled) {
    console.log(`[email:dev] Accès ${email} -> ${link} (mot de passe temporaire : ${tempPassword})`);
    return;
  }
  await transporter().sendMail({ from: config.email.from, to: email, subject, text });
}
