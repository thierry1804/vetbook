// Foyer : le propriétaire invite des proches (par e-mail) à consulter ses carnets en lecture seule.
//   GET    /api/household                     — mon foyer (membres, invitations) et les foyers où je suis invité
//   POST   /api/household/invites   { email } — invite (e-mail avec lien)
//   DELETE /api/household/invites/:id         — annule une invitation
//   DELETE /api/household/members/:memberId   — retire un membre
//   POST   /api/household/accept    { token } — accepte une invitation (adresse du compte = adresse invitée)
//   DELETE /api/household/memberships/:ownerId — quitte un foyer
//   GET    /api/household/:ownerId/pets        — carnets d'un foyer (membre, ou propriétaire lui-même)
//   GET    /api/household/:ownerId/photo/:id   — photo d'un carnet du foyer
import { hashToken, isValidEmail, requireUser } from '../_lib/auth.js';
import { withClient } from '../_lib/db.js';
import { sendMail } from '../_lib/mailer.js';
import { householdInvite } from '../_lib/emails.js';
import { getObject } from '../_lib/minio.js';
import { newRawToken } from '../_lib/tokens.js';
import { petSnapshot } from '../_lib/snapshot.js';

const UUID = /^[0-9a-f-]{36}$/i;
const INVITE_DAYS = 14;
const MAX_MEMBERS = 10;

async function isMemberOf(client, ownerId, userId) {
  if (ownerId === userId) return true;
  const r = await client.query('select 1 from household_members where owner_id = $1 and member_id = $2', [ownerId, userId]);
  return !!r.rows[0];
}

export async function household(req, res) {
  const session = await requireUser(req, res);
  if (!session) return;
  const p = req.params || {};

  try {
    if (req.method === 'GET' && !p.ownerId) {
      const out = await withClient(async (c) => {
        const members = (await c.query(
          `select m.member_id, m.role, m.created_at, u.email, u.name from household_members m join users u on u.id = m.member_id
            where m.owner_id = $1 order by m.created_at`, [session.userId])).rows;
        const invites = (await c.query(
          `select id, email, role, expires_at, created_at from household_invites
            where owner_id = $1 and accepted_at is null and revoked_at is null and expires_at > now() order by created_at desc`, [session.userId])).rows;
        const memberships = (await c.query(
          `select m.owner_id, m.role, m.created_at, u.name, u.email from household_members m join users u on u.id = m.owner_id
            where m.member_id = $1 order by m.created_at`, [session.userId])).rows;
        return { members, invites, memberships };
      });
      res.status(200).json({
        members: out.members.map((m) => ({ id: m.member_id, name: m.name, email: m.email, role: m.role, since: m.created_at })),
        invites: out.invites.map((i) => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expires_at, createdAt: i.created_at })),
        memberships: out.memberships.map((m) => ({ ownerId: m.owner_id, ownerName: m.name || m.email, role: m.role, since: m.created_at })),
        limits: { maxMembers: MAX_MEMBERS },
      });
      return;
    }

    if (req.method === 'POST' && p.sub === 'invites') {
      const email = req.body && typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      if (!isValidEmail(email)) { res.status(400).json({ error: 'Adresse e-mail invalide.' }); return; }
      const out = await withClient(async (c) => {
        const me = (await c.query('select email, name, first_name from users where id = $1', [session.userId])).rows[0];
        if (me.email === email) return { error: 'SELF' };
        const count = (await c.query(
          `select (select count(*) from household_members where owner_id = $1) + (select count(*) from household_invites where owner_id = $1 and accepted_at is null and revoked_at is null and expires_at > now()) as n`,
          [session.userId])).rows[0].n;
        if (Number(count) >= MAX_MEMBERS) return { error: 'LIMIT' };
        const already = (await c.query('select 1 from household_members m join users u on u.id = m.member_id where m.owner_id = $1 and u.email = $2', [session.userId, email])).rows[0];
        if (already) return { error: 'ALREADY' };
        await c.query('update household_invites set revoked_at = now() where owner_id = $1 and email = $2 and accepted_at is null and revoked_at is null', [session.userId, email]);
        const raw = newRawToken();
        const ins = await c.query(
          `insert into household_invites (owner_id, email, token_hash, expires_at) values ($1, $2, $3, now() + ($4 || ' days')::interval) returning id, expires_at`,
          [session.userId, email, hashToken(raw), String(INVITE_DAYS)]);
        return { raw, invite: ins.rows[0], ownerName: me.name || me.first_name };
      });
      const errors = { SELF: 'Vous ne pouvez pas vous inviter vous-même.', LIMIT: `Votre foyer est limité à ${MAX_MEMBERS} personnes.`, ALREADY: 'Cette personne fait déjà partie de votre foyer.' };
      if (out.error) { res.status(400).json({ error: errors[out.error] }); return; }
      await sendMail({ to: email, ...householdInvite(out.raw, out.ownerName) });
      res.status(201).json({ id: out.invite.id, email, expiresAt: out.invite.expires_at });
      return;
    }

    if (req.method === 'DELETE' && p.sub === 'invites' && p.id) {
      const r = await withClient((c) => c.query('update household_invites set revoked_at = now() where id = $1 and owner_id = $2 and revoked_at is null and accepted_at is null returning id', [p.id, session.userId]));
      if (!r.rows[0]) { res.status(404).json({ error: 'Invitation introuvable.' }); return; }
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'DELETE' && p.sub === 'members' && p.id) {
      if (!UUID.test(p.id)) { res.status(400).json({ error: 'Identifiant invalide.' }); return; }
      const r = await withClient((c) => c.query('delete from household_members where owner_id = $1 and member_id = $2 returning member_id', [session.userId, p.id]));
      if (!r.rows[0]) { res.status(404).json({ error: 'Membre introuvable.' }); return; }
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'POST' && p.sub === 'accept') {
      const token = req.body && typeof req.body.token === 'string' ? req.body.token : '';
      const out = await withClient(async (c) => {
        const inv = (await c.query(
          `select id, owner_id, email, role from household_invites
            where token_hash = $1 and accepted_at is null and revoked_at is null and expires_at > now()`, [hashToken(token)])).rows[0];
        if (!inv) return { error: 'INVALID' };
        const me = (await c.query('select id, email from users where id = $1', [session.userId])).rows[0];
        if (me.email !== inv.email) return { error: 'EMAIL', invited: inv.email };
        if (inv.owner_id === me.id) return { error: 'INVALID' };
        await c.query('insert into household_members (owner_id, member_id, role) values ($1, $2, $3) on conflict do nothing', [inv.owner_id, me.id, inv.role]);
        await c.query('update household_invites set accepted_at = now() where id = $1', [inv.id]);
        const owner = (await c.query('select name, email from users where id = $1', [inv.owner_id])).rows[0];
        return { ownerId: inv.owner_id, ownerName: owner.name || owner.email };
      });
      if (out.error === 'INVALID') { res.status(400).json({ error: 'Cette invitation est invalide, expirée ou déjà utilisée.' }); return; }
      if (out.error === 'EMAIL') { res.status(403).json({ error: `Cette invitation est destinée à ${out.invited}. Connectez-vous avec cette adresse pour l’accepter.` }); return; }
      res.status(200).json({ ok: true, ownerId: out.ownerId, ownerName: out.ownerName });
      return;
    }

    if (req.method === 'DELETE' && p.sub === 'memberships' && p.id) {
      if (!UUID.test(p.id)) { res.status(400).json({ error: 'Identifiant invalide.' }); return; }
      const r = await withClient((c) => c.query('delete from household_members where owner_id = $1 and member_id = $2 returning owner_id', [p.id, session.userId]));
      if (!r.rows[0]) { res.status(404).json({ error: 'Foyer introuvable.' }); return; }
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'GET' && p.ownerId && p.sub === 'pets') {
      if (!UUID.test(p.ownerId)) { res.status(400).json({ error: 'Identifiant invalide.' }); return; }
      const out = await withClient(async (c) => {
        if (!(await isMemberOf(c, p.ownerId, session.userId))) return null;
        const owner = (await c.query("select coalesce(nullif(o.name, ''), u.name, u.email) as name from users u left join owners o on o.user_id = u.id where u.id = $1", [p.ownerId])).rows[0];
        const pets = (await c.query('select * from pets where user_id = $1 order by created_at asc', [p.ownerId])).rows;
        const list = [];
        for (const pet of pets) list.push({ petId: pet.id, ...(await petSnapshot(c, pet, { includeNotes: true, includePhotos: true })) });
        return { ownerName: owner && owner.name, pets: list };
      });
      if (!out) { res.status(404).json({ error: 'Foyer introuvable.' }); return; }
      res.status(200).json(out);
      return;
    }

    if (req.method === 'GET' && p.ownerId && p.sub === 'photo' && p.id) {
      if (!UUID.test(p.ownerId) || !UUID.test(p.id)) { res.status(400).json({ error: 'Identifiant invalide.' }); return; }
      const photo = await withClient(async (c) => {
        if (!(await isMemberOf(c, p.ownerId, session.userId))) return null;
        return (await c.query('select storage_path, content_type from photos where id = $1 and user_id = $2', [p.id, p.ownerId])).rows[0] || null;
      });
      if (!photo || !photo.storage_path) { res.status(404).json({ error: 'Photo introuvable.' }); return; }
      const obj = await getObject(photo.storage_path);
      res.setHeader('Content-Type', photo.content_type || obj.ContentType || 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=300');
      obj.Body.pipe(res);
      return;
    }

    res.status(405).json({ error: 'Méthode non autorisée.' });
  } catch (err) {
    console.error('household', err);
    if (!res.headersSent) res.status(500).json({ error: 'Foyer indisponible.' });
  }
}
