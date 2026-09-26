#!/usr/bin/env node
// Crée (ou réinitialise) un compte du backoffice avec 2FA TOTP obligatoire.
// Usage : node scripts/create-admin.mjs --email a@b.mg --name "Nom" [--role super_admin] [--reset-2fa]
// Mot de passe : variable ADMIN_PASSWORD, sinon généré et affiché UNE fois.
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { withClient } from '../api/_lib/db.js';
import { ensureSchema } from '../api/_lib/schema.js';
import { seedAdminDefaults } from '../api/_lib/admin-seed.js';
import { newTotpSecret, otpauthUrl } from '../api/_lib/totp.js';
import { ROLES } from '../api/_lib/admin-auth.js';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const email = arg('email'); const name = arg('name', 'Admin'); const role = arg('role', 'super_admin');
if (!email) { console.error('--email requis'); process.exit(1); }
if (!ROLES[role]) { console.error('Rôle inconnu. Rôles : ' + Object.keys(ROLES).join(', ')); process.exit(1); }

await ensureSchema();
await seedAdminDefaults();
const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
const secret = newTotpSecret();
const hash = await argon2.hash(password, { type: argon2.argon2id });
const exists = (await withClient((c) => c.query('select id from admin_users where lower(email) = lower($1)', [email]))).rows[0];
if (exists && !process.argv.includes('--reset-2fa')) { console.error('Ce compte existe déjà (--reset-2fa pour réinitialiser mot de passe + 2FA).'); process.exit(2); }
await withClient((c) => c.query(
  `insert into admin_users (email, name, password_hash, role_code, totp_secret, totp_enabled) values ($1,$2,$3,$4,$5,true)
   on conflict (email) do update set password_hash = excluded.password_hash, totp_secret = excluded.totp_secret, totp_enabled = true,
     role_code = excluded.role_code, failed_attempts = 0, locked_until = null, status = 'actif'`,
  [email.toLowerCase(), name, hash, role, secret]));
console.log(`Compte ${role} : ${email}`);
if (!process.env.ADMIN_PASSWORD) console.log(`Mot de passe (à changer/conserver en lieu sûr) : ${password}`);
console.log(`2FA — secret : ${secret}`);
console.log(`2FA — URI : ${otpauthUrl(secret, email)}`);
process.exit(0);
