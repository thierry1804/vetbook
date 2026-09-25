// Modèles d'e-mails (texte + HTML). Français uniquement, comme l'application.
import { appUrl } from './mailer.js';

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function layout(title, intro, buttonLabel, url, outro) {
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f7f6;font-family:Arial,Helvetica,sans-serif;color:#12211f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-size:20px;font-weight:700;color:#0f766e">App’lika</td></tr>
<tr><td style="padding-top:20px;font-size:22px;font-weight:700">${esc(title)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#3e4947">${esc(intro)}</td></tr>
<tr><td style="padding:24px 0"><a href="${esc(url)}" style="background:#0f766e;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px;display:inline-block">${esc(buttonLabel)}</a></td></tr>
<tr><td style="font-size:13px;line-height:1.6;color:#64748b">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br><span style="word-break:break-all">${esc(url)}</span></td></tr>
<tr><td style="padding-top:16px;font-size:13px;line-height:1.6;color:#64748b">${esc(outro)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${title}\n\n${intro}\n\n${buttonLabel} : ${url}\n\n${outro}\n`;
  return { html, text };
}

export function verifyEmail(token, firstName) {
  const url = `${appUrl()}/?verify=${encodeURIComponent(token)}`;
  const l = layout('Confirmez votre adresse e-mail', `${firstName ? `Bonjour ${firstName}, m` : 'M'}erci d’avoir créé votre compte. Confirmez votre adresse pour sécuriser votre carnet et recevoir vos rappels.`, 'Confirmer mon adresse', url, 'Ce lien est valable 48 heures. Si vous n’êtes pas à l’origine de cette inscription, ignorez ce message.');
  return { subject: 'Confirmez votre adresse e-mail', ...l };
}

export function changeEmail(token, newEmail) {
  const url = `${appUrl()}/?verify=${encodeURIComponent(token)}`;
  const l = layout('Confirmez votre nouvelle adresse', `Vous avez demandé à utiliser ${newEmail} pour votre compte App’lika. Confirmez ce changement pour l’appliquer.`, 'Confirmer le changement', url, 'Ce lien est valable 48 heures. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : votre adresse actuelle reste inchangée.');
  return { subject: 'Confirmez votre nouvelle adresse e-mail', ...l };
}

export function resetPassword(token) {
  const url = `${appUrl()}/?reset=${encodeURIComponent(token)}`;
  const l = layout('Réinitialisez votre mot de passe', 'Une demande de réinitialisation de mot de passe a été faite pour votre compte. Choisissez un nouveau mot de passe avec le bouton ci-dessous.', 'Choisir un nouveau mot de passe', url, 'Ce lien est valable 1 heure et ne peut servir qu’une fois. Si vous n’avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.');
  return { subject: 'Réinitialisation de votre mot de passe', ...l };
}

export function householdInvite(token, ownerName) {
  const url = `${appUrl()}/?invite=${encodeURIComponent(token)}`;
  const l = layout(`${ownerName || 'Un proche'} vous invite`, `${ownerName || 'Un proche'} souhaite partager avec vous les carnets de santé de ses compagnons sur App’lika, en lecture seule. Connectez-vous (ou créez un compte avec cette adresse) pour accepter.`, 'Voir l’invitation', url, 'Cette invitation est valable 14 jours.');
  return { subject: `${ownerName || 'Un proche'} partage ses carnets avec vous`, ...l };
}

export function passwordChanged() {
  const url = `${appUrl()}/`;
  const l = layout('Votre mot de passe a été modifié', 'Le mot de passe de votre compte App’lika vient d’être changé, et vos autres appareils ont été déconnectés.', 'Ouvrir App’lika', url, 'Si ce n’est pas vous, réinitialisez immédiatement votre mot de passe avec « Mot de passe oublié » sur l’écran de connexion.');
  return { subject: 'Votre mot de passe a été modifié', ...l };
}
