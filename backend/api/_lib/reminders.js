// Logique des rappels quotidiens (vaccins, vermifuges, hygiène, médicaments,
// anniversaires, résumé mensuel, événements canins) + envoi Web Push.
// Runtime-agnostic : appelée à la fois par scripts/send-reminders.mjs (cron
// système sur le VPS) et, si besoin un jour, par un handler HTTP.
//
// Duplique volontairement les mêmes fenêtres de déclenchement que
// checkBrowserNotifications() côté client (app.js) : c'est le repli
// "app ouverte" qui reste actif pour les appareils sans abonnement push.
// Les deux doivent être maintenues en synchro à la main.
import webpush from 'web-push';
import { withClient } from './db.js';
import { sendMail } from './mailer.js';
import { appUrl } from './mailer.js';

function daysDiff(dateStr) {
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(dateStr + 'T00:00:00');
  return Math.round((d.getTime() - todayMid.getTime()) / 86400000);
}

// Préférences de notification du compte (users.preferences.notifications), avec les valeurs par défaut historiques.
const NOTIF_DEFAULTS = { push: true, email: false, vaccineLeadDays: 7, dewormingLeadDays: 7, hygieneLeadDays: 7, medicationLeadDays: 7, quietHours: { enabled: false, from: '22:00', to: '07:00' } };

function notifPrefs(raw) {
  const n = (raw && raw.notifications) || {};
  const lead = (v, d) => (Number.isInteger(v) && v >= 1 && v <= 90 ? v : d);
  return {
    push: n.push !== false,
    email: n.email === true,
    vaccineLeadDays: lead(n.vaccineLeadDays, NOTIF_DEFAULTS.vaccineLeadDays),
    dewormingLeadDays: lead(n.dewormingLeadDays, NOTIF_DEFAULTS.dewormingLeadDays),
    hygieneLeadDays: lead(n.hygieneLeadDays, NOTIF_DEFAULTS.hygieneLeadDays),
    medicationLeadDays: lead(n.medicationLeadDays, NOTIF_DEFAULTS.medicationLeadDays),
    quietHours: Object.assign({}, NOTIF_DEFAULTS.quietHours, n.quietHours || {}),
  };
}

function minutesOf(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// Heures calmes : pas de notification push entre `from` et `to` (heure du serveur), la fenêtre peut passer minuit.
export function inQuietHours(q, now = new Date()) {
  if (!q || !q.enabled) return false;
  const from = minutesOf(q.from);
  const to = minutesOf(q.to);
  if (from == null || to == null || from === to) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  return from < to ? cur >= from && cur < to : cur >= from || cur < to;
}

async function collectReminders(client, userPrefs) {
  const reminders = [];
  const lead = (userId, key) => (userPrefs.get(userId) || notifPrefs(null))[key];

  const { rows: pets } = await client.query("select id, user_id, name, dob::text as dob from pets");
  const petById = new Map(pets.map((p) => [p.id, p]));

  const { rows: prefs } = await client.query('select * from notification_prefs');
  const prefsByPet = new Map(prefs.map((p) => [p.pet_id, p]));

  // Vaccins : en retard (n'importe quel retard) OU dans les 7 prochains jours.
  const { rows: vaccines } = await client.query(
    "select pet_id, user_id, name, next::text as next from vaccinations where next is not null"
  );
  for (const v of vaccines) {
    const pref = prefsByPet.get(v.pet_id);
    if (pref && pref.vaccine_reminder === false) continue;
    const pet = petById.get(v.pet_id);
    if (!pet) continue;
    const diff = daysDiff(v.next);
    if (diff < 0) {
      reminders.push({ userId: v.user_id, petId: v.pet_id, title: 'Vaccin en retard', body: `${pet.name} : ${v.name}` });
    } else if (diff <= lead(v.user_id, 'vaccineLeadDays')) {
      reminders.push({ userId: v.user_id, petId: v.pet_id, title: 'Rappel vaccin', body: `${pet.name} : ${v.name} dans ${diff} j` });
    }
  }

  // Vermifuges : dans les 7 prochains jours uniquement (pas d'alerte de retard, comme côté client).
  const { rows: dewormings } = await client.query(
    "select pet_id, user_id, name, next::text as next from dewormings where next is not null"
  );
  for (const d of dewormings) {
    const pref = prefsByPet.get(d.pet_id);
    if (pref && pref.deworming_reminder === false) continue;
    const pet = petById.get(d.pet_id);
    if (!pet) continue;
    const diff = daysDiff(d.next);
    if (diff < 0 || diff > lead(d.user_id, 'dewormingLeadDays')) continue;
    reminders.push({ userId: d.user_id, petId: d.pet_id, title: 'Rappel vermifuge', body: `${pet.name} : ${d.name} dans ${diff} j` });
  }

  // Soins d'hygiène : dans les 7 prochains jours.
  const { rows: hygiene } = await client.query(
    "select pet_id, user_id, type, next::text as next from hygiene_events where next is not null"
  );
  for (const h of hygiene) {
    const pref = prefsByPet.get(h.pet_id);
    if (pref && pref.hygiene_reminder === false) continue;
    const pet = petById.get(h.pet_id);
    if (!pet) continue;
    const diff = daysDiff(h.next);
    if (diff < 0 || diff > lead(h.user_id, 'hygieneLeadDays')) continue;
    reminders.push({ userId: h.user_id, petId: h.pet_id, title: 'Rappel soin', body: `${pet.name} : ${h.type} dans ${diff} j` });
  }

  // Médicaments : fin de traitement dans les 7 prochains jours (actifs uniquement).
  const { rows: medications } = await client.query(
    "select pet_id, user_id, name, active, end_date::text as end_date from medications where end_date is not null"
  );
  for (const m of medications) {
    if (m.active === false) continue;
    const pref = prefsByPet.get(m.pet_id);
    if (pref && pref.medication_reminder === false) continue;
    const pet = petById.get(m.pet_id);
    if (!pet) continue;
    const diff = daysDiff(m.end_date);
    if (diff < 0 || diff > lead(m.user_id, 'medicationLeadDays')) continue;
    reminders.push({ userId: m.user_id, petId: m.pet_id, title: 'Fin de traitement', body: `${pet.name} : ${m.name} se termine dans ${diff} j` });
  }

  // Anniversaires : jour exact (mois + jour), tous les ans.
  const { rows: petsWithDob } = await client.query("select id, user_id, name, dob::text as dob from pets where dob is not null");
  const today = new Date();
  for (const pet of petsWithDob) {
    const pref = prefsByPet.get(pet.id);
    if (pref && pref.birthday_reminder === false) continue;
    const dob = new Date(pet.dob + 'T00:00:00');
    if (dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate()) {
      reminders.push({ userId: pet.user_id, petId: pet.id, title: 'Joyeux anniversaire !', body: `${pet.name} fête son anniversaire aujourd'hui 🎉` });
    }
  }

  return reminders;
}

// Calendrier des événements canins — copie volontaire de DEFAULT_DOG_EVENTS
// (app.js) : aucun code partagé possible entre le navigateur et ce runtime
// Node, à maintenir manuellement en synchro si la liste change côté client.
const DOG_EVENTS = [
  { month: 2, title: 'Salon International de l\'Agriculture' },
  { month: 3, title: 'Exposition Canine de Paris' },
  { month: 4, title: 'Journée mondiale du chien de sauvetage' },
  { month: 4, title: 'Journée mondiale des animaux de compagnie' },
  { month: 5, title: 'Fête de la Nature' },
  { month: 6, title: 'Game Fair' },
  { month: 8, title: 'Journée mondiale du chien' },
  { month: 9, title: 'Septembre : mois de l\'adoption' },
  { month: 10, title: 'Journée mondiale des animaux' },
  { month: 10, title: 'Exposition Canine d\'Automne' },
  { month: 11, title: 'Semaine Vétérinaire' },
  { month: 12, title: 'Journée du bénévolat animalier' },
  { month: 12, title: 'Noël des animaux' },
];

// Résumé mensuel : ping léger "c'est prêt" par pet, pas de calcul de contenu
// ici (fait côté client à l'ouverture, voir computeMonthlySummary() dans
// app.js) — évite de dupliquer la logique d'agrégation dans ce runtime.
// Idempotent via last_monthly_summary_sent : peu importe quel jour le cron
// tourne, chaque pet n'est notifié qu'une fois par mois.
async function sendMonthlySummaryPings(client, userPrefs) {
  const { rows: pets } = await client.query(
    `select p.id as pet_id, p.user_id, p.name,
            np.last_monthly_summary_sent::text as last_sent
     from pets p
     join notification_prefs np on np.pet_id = p.id
     where np.monthly_summary = true`
  );

  const todayFirstOfMonth = new Date();
  todayFirstOfMonth.setDate(1);
  const currentMonthKey = todayFirstOfMonth.toISOString().slice(0, 10);

  let sent = 0;
  for (const pet of pets) {
    const lastSentMonth = pet.last_sent ? pet.last_sent.slice(0, 7) : null;
    const currentMonth = currentMonthKey.slice(0, 7);
    if (lastSentMonth === currentMonth) continue;

    await sendToUser(client, pet.user_id, "App'lika — Résumé mensuel", `Le résumé du mois de ${pet.name} est prêt.`, userPrefs);
    await client.query('update notification_prefs set last_monthly_summary_sent = $1 where pet_id = $2', [currentMonthKey, pet.pet_id]);
    sent++;
  }
  return sent;
}

// Événements canins : rappel groupé, une fois par mois (1er du mois),
// contenu global (pas de filtre par animal) — voir toggleDogEventsReminder()
// côté client et users.dog_events_reminder côté schéma.
async function sendDogEventsReminders(client, userPrefs) {
  const today = new Date();
  if (today.getDate() !== 1) return 0;

  const monthEvents = DOG_EVENTS.filter((e) => e.month === today.getMonth() + 1);
  if (monthEvents.length === 0) return 0;

  const { rows: users } = await client.query('select id from users where dog_events_reminder = true');
  const body = monthEvents.map((e) => e.title).join(', ');
  for (const u of users) {
    await sendToUser(client, u.id, "App'lika — Événements canins du mois", body, userPrefs);
  }
  return users.length;
}

// Envoie sur les canaux choisis par l'utilisateur : push (sauf heures calmes) et/ou e-mail.
async function sendToUser(client, userId, title, body, userPrefs) {
  const prefs = (userPrefs && userPrefs.get(userId)) || notifPrefs(null);
  if (prefs.email) {
    const { rows } = await client.query('select email from users where id = $1', [userId]);
    if (rows[0]) {
      await sendMail({
        to: rows[0].email,
        subject: title,
        text: `${body}\n\nOuvrir App\u2019lika : ${appUrl()}/\n\nVous recevez ce message car les rappels par e-mail sont activés dans votre profil.`,
      });
    }
  }
  if (!prefs.push || inQuietHours(prefs.quietHours)) return;
  const { rows: subs } = await client.query('select * from push_subscriptions where user_id = $1', [userId]);

  await Promise.all(subs.map(async (sub) => {
    const pushSubscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
    try {
      await webpush.sendNotification(pushSubscription, JSON.stringify({ title, body, url: './' }));
    } catch (err) {
      // 404/410 = abonnement expiré (désinstallation, changement de navigateur...) : on nettoie.
      const statusCode = err && typeof err === 'object' && 'statusCode' in err ? err.statusCode : null;
      if (statusCode === 404 || statusCode === 410) {
        await client.query('delete from push_subscriptions where endpoint = $1', [sub.endpoint]);
      } else {
        console.error('Échec envoi push', sub.endpoint, err);
      }
    }
  }));
}

// Point d'entrée unique : configure VAPID puis exécute tous les rappels dans
// une seule connexion DB. Retourne un résumé chiffré (pas de détails par
// utilisateur, pour rester léger dans les logs cron).
export async function runReminders() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:contact@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  return withClient(async (client) => {
    const { rows: prefRows } = await client.query('select id, preferences from users');
    const userPrefs = new Map(prefRows.map((r) => [r.id, notifPrefs(r.preferences)]));
    const reminders = await collectReminders(client, userPrefs);

    // Regroupe par utilisateur pour éviter d'envoyer plusieurs notifications
    // séparées si plusieurs animaux/rappels tombent le même jour.
    const byUser = new Map();
    for (const r of reminders) {
      if (!byUser.has(r.userId)) byUser.set(r.userId, []);
      byUser.get(r.userId).push(r);
    }

    let usersNotified = 0;
    for (const [userId, list] of byUser) {
      if (list.length === 1) {
        await sendToUser(client, userId, list[0].title, list[0].body, userPrefs);
      } else {
        await sendToUser(client, userId, `App'lika — ${list.length} rappels`, list.map((r) => r.body).join(' · '), userPrefs);
      }
      usersNotified++;
    }

    const monthlySummariesSent = await sendMonthlySummaryPings(client, userPrefs);
    const dogEventsUsersNotified = await sendDogEventsReminders(client, userPrefs);

    return { usersNotified, reminderCount: reminders.length, monthlySummariesSent, dogEventsUsersNotified };
  });
}
