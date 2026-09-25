// Envoi d'e-mails transactionnels (vérification, mot de passe oublié, invitations).
// SMTP_HOST défini : envoi réel via SMTP. Sinon (installation locale sans serveur de courrier) le message
// est écrit dans les logs de l'API, avec ses liens, pour que les parcours restent testables.
import nodemailer from 'nodemailer';

let transport;

function getTransport() {
  if (transport !== undefined) return transport;
  if (!process.env.SMTP_HOST) {
    transport = null;
    return transport;
  }
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined,
  });
  return transport;
}

export function appUrl() {
  return (process.env.APP_URL || 'http://localhost:3080').replace(/\/+$/, '');
}

export async function sendMail({ to, subject, text, html }) {
  const from = process.env.MAIL_FROM || 'App’lika <no-reply@applika.local>';
  const t = getTransport();
  if (!t) {
    console.log(`[mail:console] à ${to} · ${subject}\n${text}\n`);
    return { delivered: false, console: true };
  }
  try {
    await t.sendMail({ from, to, subject, text, html });
    return { delivered: true };
  } catch (err) {
    console.error('mailer', err && err.message);
    return { delivered: false, error: true };
  }
}
