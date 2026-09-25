// Test de bout en bout du profil, de la sécurité du compte et du partage.
// À lancer dans le conteneur, avec Mailpit actif pour lire les e-mails :
//   SMTP_HOST=mailpit SMTP_PORT=1025 docker compose --profile mail up -d
//   docker compose exec -e MAILPIT=http://mailpit:8025 api node scripts/smoke-account.mjs
// Crée deux comptes jetables (smoke-...@example.com) et les supprime à la fin.
const API = process.env.API_URL || 'http://127.0.0.1:3000';
const MAILPIT = process.env.MAILPIT || 'http://mailpit:8025';
const stamp = Date.now();
let failures = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? '  ✓' : '  ✗'} ${name}${cond ? '' : ' ' + extra}`); if (!cond) failures++; };

class Client {
  constructor() { this.cookie = ''; }
  async call(method, path, body, { raw } = {}) {
    const headers = {};
    if (this.cookie) headers.cookie = this.cookie;
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(API + path, { method, headers, body: payload });
    const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of set) { const kv = c.split(';')[0]; if (kv.endsWith('=')) this.cookie = ''; else this.cookie = kv; }
    if (raw) return res;
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* non JSON */ }
    return { status: res.status, json, text };
  }
}

async function lastMailTo(email, subjectPart) {
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent('to:' + email)}`);
    const j = await r.json();
    const m = (j.messages || []).find((x) => !subjectPart || (x.Subject || '').includes(subjectPart));
    if (m) { const full = await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json(); return full; }
    await new Promise((s) => setTimeout(s, 250));
  }
  return null;
}
const tokenFrom = (mail, key) => { const m = new RegExp(`[?&]${key}=([A-Za-z0-9_-]+)`).exec(mail.Text || ''); return m && m[1]; };

const a = new Client();
const emailA = `smoke-a-${stamp}@example.com`;
const emailB = `smoke-b-${stamp}@example.com`;
const emailA2 = `smoke-a2-${stamp}@example.com`;

console.log('Inscription');
let r = await a.call('POST', '/api/auth/register', { email: emailA, password: 'motdepasse1' });
ok('prénom et consentement exigés', r.status === 400, r.text);
r = await a.call('POST', '/api/auth/register', { email: emailA, password: 'motdepasse1', firstName: 'Ada', acceptTerms: false });
ok('consentement refusé sans acceptation', r.status === 400);
r = await a.call('POST', '/api/auth/register', { email: emailA, password: 'motdepasse1', firstName: 'Ada', lastName: 'Lovelace', acceptTerms: true });
ok('compte créé', r.status === 201 && r.json.firstName === 'Ada' && r.json.name === 'Ada Lovelace' && r.json.emailVerified === false, r.text);

console.log('Vérification de l’adresse');
let mail = await lastMailTo(emailA, 'Confirmez');
ok('e-mail de confirmation reçu', !!mail);
const verifyToken = mail && tokenFrom(mail, 'verify');
r = await new Client().call('POST', '/api/auth/verify-email', { token: verifyToken });
ok('lien valide', r.status === 200 && r.json.kind === 'verify', r.text);
r = await new Client().call('POST', '/api/auth/verify-email', { token: verifyToken });
ok('lien à usage unique', r.status === 400);
r = await a.call('GET', '/api/user/profile');
ok('profil vérifié', r.status === 200 && r.json.emailVerified === true && r.json.consent.acceptedAt, r.text);

console.log('Profil');
r = await a.call('PATCH', '/api/user/profile', { firstName: 'Ada', lastName: 'Byron', phone: '06 12 34 56 78',
  emergencyContact: { name: 'Charles', relation: 'Frère', phone: '07 00 00 00 00' },
  preferences: { dateFormat: 'iso', weekStart: 'sun', notifications: { email: true, vaccineLeadDays: 21, quietHours: { enabled: true, from: '21:30', to: '07:15' } }, accessibility: { textSize: 'large', reduceMotion: true }, units: { weight: 'lb' } } });
ok('mise à jour', r.status === 200 && r.json.lastName === 'Byron' && r.json.phone === '06 12 34 56 78' && r.json.preferences.weekStart === 'sun', r.text);
ok('préférences validées', r.json.preferences.notifications.vaccineLeadDays === 21 && r.json.preferences.accessibility.textSize === 'large' && r.json.preferences.units.weight === 'lb' && r.json.emergencyContact.name === 'Charles');
r = await a.call('PATCH', '/api/user/profile', { phone: 'abc' });
ok('téléphone invalide refusé', r.status === 400);
r = await a.call('PATCH', '/api/user/profile', { preferences: { notifications: { vaccineLeadDays: 9999, quietHours: { from: '99:99' } }, dateFormat: 'nope', accessibility: { textSize: 'huge' } } });
ok('valeurs hors bornes ramenées aux défauts', r.json.preferences.notifications.vaccineLeadDays === 7 && r.json.preferences.dateFormat === 'fr-short' && r.json.preferences.accessibility.textSize === 'normal' && r.json.preferences.notifications.quietHours.from === '22:00', r.text);
r = await a.call('PATCH', '/api/user/profile', { firstName: '   ' });
ok('prénom vide refusé', r.status === 400);

console.log('Photo de profil');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
let fd = new FormData(); fd.append('file', new Blob([png], { type: 'image/png' }), 'a.png');
r = await a.call('POST', '/api/user/avatar', fd);
ok('téléversement', r.status === 200 && r.json.hasCustomAvatar === true && /\/api\/user\/avatar\?v=/.test(r.json.picture), r.text);
let img = await a.call('GET', '/api/user/avatar', undefined, { raw: true });
ok('lecture', img.status === 200 && (img.headers.get('content-type') || '').includes('image/png'));
fd = new FormData(); fd.append('file', new Blob(['x'], { type: 'text/plain' }), 'a.txt');
r = await a.call('POST', '/api/user/avatar', fd);
ok('type non image refusé', r.status === 400);
r = await a.call('DELETE', '/api/user/avatar');
ok('suppression', r.status === 200 && r.json.hasCustomAvatar === false);

console.log('Mot de passe');
r = await a.call('POST', '/api/user/change-password', { currentPassword: 'faux', newPassword: 'nouveaumdp1' });
ok('mot de passe actuel erroné refusé', r.status === 400);
const other = new Client();
r = await other.call('POST', '/api/auth/login', { email: emailA, password: 'motdepasse1' });
ok('second appareil connecté', r.status === 200);
r = await a.call('GET', '/api/user/sessions');
ok('liste des appareils (2)', r.status === 200 && r.json.sessions.length === 2 && r.json.sessions.filter((s) => s.current).length === 1, r.text);
r = await a.call('POST', '/api/user/change-password', { currentPassword: 'motdepasse1', newPassword: 'nouveaumdp1' });
ok('changement', r.status === 200, r.text);
r = await other.call('GET', '/api/auth/me');
ok('les autres appareils sont déconnectés', r.status === 401);
r = await a.call('GET', '/api/auth/me');
ok('cet appareil reste connecté', r.status === 200);
r = await new Client().call('POST', '/api/auth/login', { email: emailA, password: 'motdepasse1' });
ok('ancien mot de passe refusé', r.status === 401);

console.log('Mot de passe oublié');
r = await new Client().call('POST', '/api/auth/forgot-password', { email: `inconnu-${stamp}@example.com` });
ok('compte inconnu : même réponse', r.status === 200 && r.json.ok === true);
r = await new Client().call('POST', '/api/auth/forgot-password', { email: emailA });
mail = await lastMailTo(emailA, 'Réinitialisation');
ok('e-mail de réinitialisation reçu', !!mail);
const resetToken = mail && tokenFrom(mail, 'reset');
r = await new Client().call('POST', '/api/auth/reset-password', { token: resetToken, password: 'court' });
ok('mot de passe trop court refusé', r.status === 400);
const dev = new Client();
r = await dev.call('POST', '/api/auth/login', { email: emailA, password: 'nouveaumdp1' });
r = await new Client().call('POST', '/api/auth/reset-password', { token: resetToken, password: 'reinitialise1' });
ok('réinitialisation', r.status === 200, r.text);
r = await dev.call('GET', '/api/auth/me');
ok('sessions existantes révoquées', r.status === 401);
r = await new Client().call('POST', '/api/auth/reset-password', { token: resetToken, password: 'reinitialise2' });
ok('lien à usage unique', r.status === 400);
r = await a.call('POST', '/api/auth/login', { email: emailA, password: 'reinitialise1' });
ok('connexion avec le nouveau mot de passe', r.status === 200);

console.log('Changement d’adresse');
r = await a.call('POST', '/api/user/change-email', { newEmail: emailA2, password: 'faux' });
ok('mot de passe exigé', r.status === 400);
r = await a.call('POST', '/api/user/change-email', { newEmail: emailA2, password: 'reinitialise1' });
ok('demande envoyée', r.status === 200 && r.json.pendingEmail === emailA2, r.text);
mail = await lastMailTo(emailA2, 'nouvelle adresse');
ok('e-mail reçu à la nouvelle adresse', !!mail);
r = await new Client().call('POST', '/api/auth/verify-email', { token: mail && tokenFrom(mail, 'verify') });
ok('confirmation', r.status === 200 && r.json.kind === 'change-email', r.text);
r = await a.call('GET', '/api/user/profile');
ok('adresse mise à jour', r.json.email === emailA2 && !r.json.pendingEmail, r.text);

console.log('Appareils');
const phone = new Client();
await phone.call('POST', '/api/auth/login', { email: emailA2, password: 'reinitialise1' });
r = await a.call('GET', '/api/user/sessions');
const target = r.json.sessions.find((s) => !s.current);
ok('second appareil listé', !!target);
r = await a.call('DELETE', `/api/user/sessions/${target.id}`);
ok('fermeture d’un appareil', r.status === 200);
r = await phone.call('GET', '/api/auth/me');
ok('appareil fermé déconnecté', r.status === 401);
await phone.call('POST', '/api/auth/login', { email: emailA2, password: 'reinitialise1' });
r = await a.call('POST', '/api/user/sessions/revoke-others');
ok('me déconnecter partout', r.status === 200);
r = await phone.call('GET', '/api/auth/me');
ok('autres appareils déconnectés', r.status === 401);
r = await a.call('GET', '/api/auth/me');
ok('cet appareil reste connecté', r.status === 200);

console.log('Consentement');
r = await a.call('POST', '/api/user/consent', { accept: true });
ok('enregistré', r.status === 200);

console.log('Partage vétérinaire');
const state = { animals: [{ id: 1, animal: { name: 'Rex', species: 'Canine', race: 'Labrador', sex: 'Mâle', dob: '2022-01-01', weight: 30, weightHistory: [{ id: 1, date: '2026-01-01', weight: 29 }], heightHistory: [], color: '', chip: '250268700000001', sterilise: 'Non', notes: '' },
  vaccines: [{ id: 2, name: 'Rage', date: '2026-01-01', next: '2027-01-01', frequencyDays: 365, vet: 'Dr Test' }], dewormings: [], consultations: [], medications: [], notes: [{ id: 3, date: '2026-02-01', title: 'Note privée', content: 'secret', category: 'sante' }], hygiene: [], heatCycles: [], activities: [], nutrition: { meals: [], dailyPlan: {} }, pedigree: null, notifications: { vaccineReminder: true, dewormingReminder: true, hygieneReminder: true, birthdayReminder: true, medicationReminder: true, monthlySummary: false } }],
  nextId: 10, currentAnimalId: 1, owner: { name: 'Ada', phone: '06 99 99 99 99', email: emailA2, clinic: 'Clinique Test', address: 'secret' } };
r = await a.call('POST', '/api/sync/push', { state });
ok('données synchronisées', r.status === 200, r.text);
r = await a.call('POST', '/api/share/links', { petLocalId: 999, days: 7 });
ok('animal inconnu refusé', r.status === 404);
r = await a.call('POST', '/api/share/links', { petLocalId: 1, days: 7, label: 'Dr Martin' });
ok('lien créé', r.status === 201 && /share\.html\?t=/.test(r.json.url), r.text);
const shareToken = r.json.url.split('t=')[1]; const shareId = r.json.id;
r = await new Client().call('GET', `/api/share/public/${shareToken}`);
ok('lecture publique', r.status === 200 && r.json.animal.name === 'Rex' && r.json.vaccines.length === 1, r.text);
ok('notes privées exclues par défaut', r.json.notes === undefined);
ok('coordonnées exclues par défaut', r.json.owner.phone === null && r.json.owner.clinic === null && r.json.owner.name === 'Ada');
ok('pas d’adresse ni d’e-mail du propriétaire', !JSON.stringify(r.json).includes('secret') && !JSON.stringify(r.json).includes(emailA2));
r = await a.call('POST', '/api/share/links', { petLocalId: 1, days: 3, includeNotes: true, includeContact: true });
const full = await new Client().call('GET', `/api/share/public/${r.json.url.split('t=')[1]}`);
ok('options : notes et coordonnées inclus', full.json.notes && full.json.notes.length === 1 && full.json.owner.phone === '06 99 99 99 99');
r = await new Client().call('GET', '/api/share/public/jeton-invalide-jeton-invalide');
ok('jeton inconnu', r.status === 404);
r = await a.call('GET', '/api/share/links');
ok('liste des liens', r.status === 200 && r.json.links.length === 2 && r.json.links.find((l) => l.id === shareId).viewCount === 1, r.text);
r = await a.call('DELETE', `/api/share/links/${shareId}`);
ok('révocation', r.status === 200);
r = await new Client().call('GET', `/api/share/public/${shareToken}`);
ok('lien révoqué inaccessible', r.status === 404);

console.log('Foyer');
const b = new Client();
r = await b.call('POST', '/api/auth/register', { email: emailB, password: 'motdepasse2', firstName: 'Bob', acceptTerms: true });
ok('second compte créé', r.status === 201);
r = await a.call('POST', '/api/household/invites', { email: emailA2 });
ok('auto-invitation refusée', r.status === 400);
r = await a.call('POST', '/api/household/invites', { email: emailB });
ok('invitation envoyée', r.status === 201, r.text);
mail = await lastMailTo(emailB, 'partage');
ok('e-mail d’invitation reçu', !!mail);
const inviteToken = mail && tokenFrom(mail, 'invite');
const c = new Client();
await c.call('POST', '/api/auth/register', { email: `smoke-c-${stamp}@example.com`, password: 'motdepasse3', firstName: 'Cy', acceptTerms: true });
r = await c.call('POST', '/api/household/accept', { token: inviteToken });
ok('une autre adresse ne peut pas accepter', r.status === 403, r.text);
r = await b.call('POST', '/api/household/accept', { token: inviteToken });
ok('acceptation par l’adresse invitée', r.status === 200 && r.json.ownerName, r.text);
r = await b.call('POST', '/api/household/accept', { token: inviteToken });
ok('invitation à usage unique', r.status === 400);
r = await b.call('GET', '/api/household');
const ownerId = r.json.memberships[0] && r.json.memberships[0].ownerId;
ok('foyer visible côté invité', r.status === 200 && r.json.memberships.length === 1, r.text);
r = await b.call('GET', `/api/household/${ownerId}/pets`);
ok('carnets en lecture seule', r.status === 200 && r.json.pets.length === 1 && r.json.pets[0].animal.name === 'Rex' && r.json.pets[0].notes.length === 1, r.text);
r = await c.call('GET', `/api/household/${ownerId}/pets`);
ok('un tiers n’a pas accès', r.status === 404);
// Un membre du foyer qui pousse ses propres données (même identifiant local 1) ne doit jamais toucher celles du propriétaire.
const hostile = { animals: [{ ...state.animals[0], animal: { ...state.animals[0].animal, name: 'Piraté' } }], nextId: 10, currentAnimalId: 1, owner: {} };
r = await b.call('POST', '/api/sync/push', { state: hostile });
const ownerPull = await a.call('GET', '/api/sync/pull');
ok('l’invité ne peut pas modifier les carnets du foyer', r.status === 200 && ownerPull.json.state.animals[0].animal.name === 'Rex', ownerPull.text.slice(0, 200));
r = await a.call('GET', '/api/household');
ok('membre listé côté propriétaire', r.json.members.length === 1 && r.json.members[0].email === emailB, r.text);
r = await a.call('DELETE', `/api/household/members/${r.json.members[0].id}`);
ok('retrait du membre', r.status === 200);
r = await b.call('GET', `/api/household/${ownerId}/pets`);
ok('accès retiré', r.status === 404);

console.log('Suppression du compte');
r = await a.call('DELETE', '/api/user/account', { password: 'faux' });
ok('mot de passe exigé', r.status === 400);
r = await a.call('DELETE', '/api/user/account', { password: 'reinitialise1' });
ok('compte supprimé', r.status === 200, r.text);
r = await a.call('GET', '/api/auth/me');
ok('session invalide après suppression', r.status === 401);
r = await new Client().call('POST', '/api/auth/login', { email: emailA2, password: 'reinitialise1' });
ok('connexion impossible', r.status === 401);
r = await new Client().call('GET', `/api/share/public/${r && shareToken}`);
ok('liens de partage supprimés avec le compte', r.status === 404);
for (const [cl, pw, em] of [[b, 'motdepasse2', emailB], [c, 'motdepasse3', `smoke-c-${stamp}@example.com`]]) {
  await cl.call('DELETE', '/api/user/account', { password: pw });
}

console.log(failures ? `\n${failures} échec(s)` : '\nTout est vert.');
process.exit(failures ? 1 : 0);
