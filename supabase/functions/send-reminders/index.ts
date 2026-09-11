// App'lika — Fonction Edge Supabase planifiée (cron quotidien).
//
// Vérifie les rappels dus (vaccins, vermifuges, soins d'hygiène,
// anniversaires) tous comptes confondus, et envoie une notification Web
// Push à chaque abonnement (push_subscriptions) de l'utilisateur concerné.
//
// Duplique volontairement les mêmes fenêtres de déclenchement que
// checkBrowserNotifications() côté client (app.js) : c'est le repli
// "app ouverte" qui reste actif pour les navigateurs/appareils sans
// support push. Les deux doivent être maintenues en synchro à la main —
// il n'y a pas de code partageable entre le navigateur et ce runtime Deno.
//
// Ne couvre pas (pas encore implémenté) : rappels de médicaments, résumé
// mensuel, événements du calendrier canin — prévus dans une prochaine
// itération, une fois ce premier envoi validé en conditions réelles.
//
// ── Déploiement (depuis un poste avec la CLI Supabase, une fois) ──
//   supabase functions deploy send-reminders
//   supabase secrets set \
//     VAPID_PUBLIC_KEY=... \
//     VAPID_PRIVATE_KEY=... \
//     VAPID_SUBJECT=mailto:toi@example.com
//   (SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont déjà fournis
//   automatiquement par la plateforme aux Edge Functions.)
//
// ── Planification (à faire une fois dans Supabase) ──
// Option A (recommandée) : Dashboard → Edge Functions → send-reminders
//   → onglet "Cron" → expression quotidienne, ex. "0 8 * * *" (8h UTC).
// Option B : pg_cron + pg_net, depuis le SQL Editor :
//   select cron.schedule(
//     'vetbook-send-reminders',
//     '0 8 * * *',
//     $$ select net.http_post(
//          url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
//          headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_KEY>')
//        ); $$
//   );

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@example.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type Reminder = { userId: string; petId: string; title: string; body: string };

function daysDiff(dateStr: string): number {
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(dateStr + 'T00:00:00');
  return Math.round((d.getTime() - todayMid.getTime()) / 86400000);
}

async function collectReminders(): Promise<Reminder[]> {
  const reminders: Reminder[] = [];

  const { data: pets, error: petsErr } = await supabase.from('pets').select('id, user_id, name, dob');
  if (petsErr) throw petsErr;
  const petById = new Map((pets || []).map((p) => [p.id, p]));

  const { data: prefs, error: prefsErr } = await supabase.from('notification_prefs').select('*');
  if (prefsErr) throw prefsErr;
  const prefsByPet = new Map((prefs || []).map((p) => [p.pet_id, p]));

  // Vaccins : en retard (n'importe quel retard) OU dans les 7 prochains jours.
  const { data: vaccines, error: vErr } = await supabase
    .from('vaccinations').select('pet_id, user_id, name, next').not('next', 'is', null);
  if (vErr) throw vErr;
  for (const v of vaccines || []) {
    const pref = prefsByPet.get(v.pet_id);
    if (pref && pref.vaccine_reminder === false) continue;
    const pet = petById.get(v.pet_id);
    if (!pet) continue;
    const diff = daysDiff(v.next);
    if (diff < 0) {
      reminders.push({ userId: v.user_id, petId: v.pet_id, title: 'Vaccin en retard', body: pet.name + ' : ' + v.name });
    } else if (diff <= 7) {
      reminders.push({ userId: v.user_id, petId: v.pet_id, title: 'Rappel vaccin', body: pet.name + ' : ' + v.name + ' dans ' + diff + ' j' });
    }
  }

  // Vermifuges : dans les 7 prochains jours uniquement (pas d'alerte de retard, comme côté client).
  const { data: dewormings, error: dErr } = await supabase
    .from('dewormings').select('pet_id, user_id, name, next').not('next', 'is', null);
  if (dErr) throw dErr;
  for (const d of dewormings || []) {
    const pref = prefsByPet.get(d.pet_id);
    if (pref && pref.deworming_reminder === false) continue;
    const pet = petById.get(d.pet_id);
    if (!pet) continue;
    const diff = daysDiff(d.next);
    if (diff < 0 || diff > 7) continue;
    reminders.push({ userId: d.user_id, petId: d.pet_id, title: 'Rappel vermifuge', body: pet.name + ' : ' + d.name + ' dans ' + diff + ' j' });
  }

  // Soins d'hygiène : dans les 7 prochains jours.
  const { data: hygiene, error: hErr } = await supabase
    .from('hygiene_events').select('pet_id, user_id, type, next').not('next', 'is', null);
  if (hErr) throw hErr;
  for (const h of hygiene || []) {
    const pref = prefsByPet.get(h.pet_id);
    if (pref && pref.hygiene_reminder === false) continue;
    const pet = petById.get(h.pet_id);
    if (!pet) continue;
    const diff = daysDiff(h.next);
    if (diff < 0 || diff > 7) continue;
    reminders.push({ userId: h.user_id, petId: h.pet_id, title: 'Rappel soin', body: pet.name + ' : ' + h.type + ' dans ' + diff + ' j' });
  }

  // Anniversaires : jour exact (mois + jour), tous les ans.
  const today = new Date();
  for (const pet of pets || []) {
    if (!pet.dob) continue;
    const pref = prefsByPet.get(pet.id);
    if (pref && pref.birthday_reminder === false) continue;
    const dob = new Date(pet.dob + 'T00:00:00');
    if (dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate()) {
      reminders.push({ userId: pet.user_id, petId: pet.id, title: 'Joyeux anniversaire !', body: pet.name + ' fête son anniversaire aujourd\'hui 🎉' });
    }
  }

  return reminders;
}

async function sendToUser(userId: string, title: string, body: string): Promise<void> {
  const { data: subs, error } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId);
  if (error) throw error;

  await Promise.all((subs || []).map(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    try {
      await webpush.sendNotification(pushSubscription, JSON.stringify({ title, body, url: './' }));
    } catch (err) {
      // 404/410 = abonnement expiré (désinstallation, changement de navigateur...) : on nettoie.
      const statusCode = err && typeof err === 'object' && 'statusCode' in err ? (err as { statusCode: number }).statusCode : null;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      } else {
        console.error('Échec envoi push', sub.endpoint, err);
      }
    }
  }));
}

Deno.serve(async (_req) => {
  try {
    const reminders = await collectReminders();

    // Regroupe par utilisateur pour éviter d'envoyer plusieurs notifications
    // séparées si plusieurs animaux/rappels tombent le même jour.
    const byUser = new Map<string, Reminder[]>();
    for (const r of reminders) {
      if (!byUser.has(r.userId)) byUser.set(r.userId, []);
      byUser.get(r.userId)!.push(r);
    }

    let usersNotified = 0;
    for (const [userId, list] of byUser) {
      if (list.length === 1) {
        await sendToUser(userId, list[0].title, list[0].body);
      } else {
        await sendToUser(userId, "App'lika — " + list.length + ' rappels', list.map((r) => r.body).join(' · '));
      }
      usersNotified++;
    }

    return new Response(JSON.stringify({ ok: true, usersNotified, reminderCount: reminders.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
