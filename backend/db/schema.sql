-- App'lika — schéma Postgres local (Docker).
-- Appliqué au démarrage de l'API (api/_lib/schema.js) ou via
-- `node scripts/apply-schema.mjs`. Idempotent (IF NOT EXISTS).
--
-- Isolation par utilisateur dans l'API (JWT cookie), jamais depuis le
-- payload client. Photos binaires dans MinIO ; métadonnées ici
-- (photos.storage_path = clé objet MinIO).

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  -- Identifiant Google (claim "sub" du ID token), pour la connexion via
  -- Google Identity Services (api/auth/google.js). NULL pour les comptes
  -- créés uniquement par lien magique. Un compte email existant est relié
  -- automatiquement à ce sub lors d'une première connexion Google avec le
  -- même email (voir api/auth/google.js pour la logique de rattachement).
  google_sub text unique,
  -- Nom complet et photo de profil renvoyés par le ID token Google (claims
  -- "name"/"picture", scope OAuth par défaut, non sensible). Absents pour
  -- un compte créé uniquement par lien magique. Mis à jour à chaque
  -- connexion Google (voir api/auth/google.js) pour rester synchronisés
  -- avec le compte Google — jamais modifiables depuis l'app elle-même.
  name text,
  picture_url text,
  -- Préférence de compte (pas liée à un animal) : rappel groupé mensuel
  -- des événements canins du calendrier. Voir api/cron/send-reminders.js.
  dog_events_reminder boolean not null default true,
  created_at timestamptz not null default now()
);

-- Migration pour les installations existantes (create table if not exists
-- ne modifie pas une table déjà créée) :
alter table users add column if not exists dog_events_reminder boolean not null default true;
alter table users add column if not exists google_sub text unique;
alter table users add column if not exists name text;
alter table users add column if not exists picture_url text;
alter table users add column if not exists password_hash text;

-- ═══════════════════════════════════════════════════════════════
-- 1 animal = 1 "pets" row. Toutes les autres tables référencent
-- pets(id) et portent aussi user_id (redondant mais évite un JOIN
-- pour vérifier l'appartenance côté API).
--
-- local_id : identifiant numérique généré côté app (state.nextId)
-- avant toute synchronisation. Conservé + contraint UNIQUE pour que
-- pousser deux fois la même donnée locale mette à jour au lieu de
-- dupliquer (upsert via ON CONFLICT côté API).
-- ═══════════════════════════════════════════════════════════════

create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  local_id bigint not null,
  name text not null,
  species text,
  race text,
  sex text,
  dob date,
  weight numeric,
  color text,
  chip text,
  sterilise text,
  notes text,
  height numeric,
  theme_color text,
  avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

create table if not exists owners (
  user_id uuid primary key references users(id) on delete cascade,
  name text,
  phone text,
  email text,
  clinic text,
  address text,
  updated_at timestamptz not null default now()
);

create table if not exists vaccinations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  local_id bigint not null,
  date date not null,
  name text not null,
  next date,
  frequency_days integer,
  vet text,
  created_at timestamptz not null default now(),
  unique (pet_id, local_id)
);

create table if not exists dewormings (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  local_id bigint not null,
  date date not null,
  name text not null,
  next date,
  frequency_days integer,
  type text,
  created_at timestamptz not null default now(),
  unique (pet_id, local_id)
);

create table if not exists consultations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  local_id bigint not null,
  date date not null,
  vet text,
  reason text,
  diagnosis text,
  treatment text,
  cost numeric,
  notes text,
  created_at timestamptz not null default now(),
  unique (pet_id, local_id)
);

create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  local_id bigint not null,
  name text not null,
  dosage text,
  frequency text,
  start_date date,
  end_date date,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (pet_id, local_id)
);

create table if not exists hygiene_events (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  local_id bigint not null,
  type text not null,
  date date not null,
  next date,
  frequency_days integer,
  notes text,
  created_at timestamptz not null default now(),
  unique (pet_id, local_id)
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  local_id bigint not null,
  date date not null,
  type text not null,
  duration text,
  distance text,
  notes text,
  created_at timestamptz not null default now(),
  unique (pet_id, local_id)
);

create table if not exists heat_cycles (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  local_id bigint not null,
  start_date date not null,
  end_date date,
  intensity text,
  notes text,
  created_at timestamptz not null default now(),
  unique (pet_id, local_id)
);

create table if not exists journal_notes (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  local_id bigint not null,
  date date not null,
  title text not null,
  content text,
  category text,
  symptom_type text,
  severity text,
  created_at timestamptz not null default now(),
  unique (pet_id, local_id)
);

create table if not exists weight_history (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  local_id bigint not null,
  date date not null,
  weight numeric not null,
  created_at timestamptz not null default now(),
  unique (pet_id, local_id)
);

-- Suivi de la taille au garrot dans le temps (même principe que
-- weight_history) — pets.height reste la dernière valeur connue.
create table if not exists height_history (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  local_id bigint not null,
  date date not null,
  height numeric not null,
  created_at timestamptz not null default now(),
  unique (pet_id, local_id)
);

-- Métadonnées uniquement (le fichier reste local en IndexedDB pour
-- l'instant — voir data-layer.js, sync photo = amélioration future).
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  local_id bigint not null,
  date date,
  caption text,
  storage_path text,
  content_type text,
  byte_size bigint,
  created_at timestamptz not null default now(),
  unique (pet_id, local_id)
);

alter table photos add column if not exists content_type text;
alter table photos add column if not exists byte_size bigint;

create table if not exists nutrition_meals (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  local_id bigint not null,
  date date not null,
  type text not null,
  time text,
  food text,
  quantity text,
  unit text,
  created_at timestamptz not null default now(),
  unique (pet_id, local_id)
);

create table if not exists nutrition_daily_plan (
  pet_id uuid primary key references pets(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  target_calories text,
  meals_per_day text,
  food_brand text,
  portion_size text
);

create table if not exists pedigree (
  pet_id uuid primary key references pets(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  registry text,
  registry_number text,
  chip_number text,
  sire_name text,
  sire_registry text,
  dam_name text,
  dam_registry text,
  paternal_grandsire text,
  paternal_granddam text,
  maternal_grandsire text,
  maternal_granddam text
);

create table if not exists notification_prefs (
  pet_id uuid primary key references pets(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  vaccine_reminder boolean not null default true,
  deworming_reminder boolean not null default true,
  hygiene_reminder boolean not null default true,
  birthday_reminder boolean not null default true,
  medication_reminder boolean not null default true,
  monthly_summary boolean not null default false,
  -- Dernier mois (1er jour, ex. 2026-09-01) pour lequel une notification
  -- "résumé prêt" a déjà été envoyée à ce pet — évite les doublons entre
  -- deux exécutions du cron. Voir api/cron/send-reminders.js.
  last_monthly_summary_sent date
);

-- Migration pour les installations existantes :
alter table notification_prefs add column if not exists medication_reminder boolean not null default true;
alter table notification_prefs add column if not exists last_monthly_summary_sent date;

-- Carnet vétérinaires : global au compte, pas lié à un animal précis.
create table if not exists vet_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  local_id bigint not null,
  name text not null,
  clinic text,
  phone text,
  email text,
  address text,
  lat double precision,
  lng double precision,
  hours text,
  emergency boolean not null default false,
  favorite boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, local_id)
);

-- Abonnements Web Push.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- Jetons de connexion par lien magique (courte durée de vie, usage unique).
create table if not exists auth_login_tokens (
  token_hash text primary key,
  email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════
-- Index sur les clés étrangères les plus utilisées.
-- ═══════════════════════════════════════════════════════════════

create index if not exists idx_vaccinations_pet on vaccinations(pet_id);
create index if not exists idx_dewormings_pet on dewormings(pet_id);
create index if not exists idx_consultations_pet on consultations(pet_id);
create index if not exists idx_medications_pet on medications(pet_id);
create index if not exists idx_hygiene_events_pet on hygiene_events(pet_id);
create index if not exists idx_activities_pet on activities(pet_id);
create index if not exists idx_heat_cycles_pet on heat_cycles(pet_id);
create index if not exists idx_journal_notes_pet on journal_notes(pet_id);
create index if not exists idx_weight_history_pet on weight_history(pet_id);
create index if not exists idx_height_history_pet on height_history(pet_id);
create index if not exists idx_photos_pet on photos(pet_id);
create index if not exists idx_nutrition_meals_pet on nutrition_meals(pet_id);
create index if not exists idx_pets_user on pets(user_id);
create index if not exists idx_vet_contacts_user on vet_contacts(user_id);
create index if not exists idx_auth_login_tokens_expires on auth_login_tokens(expires_at);

-- ═══════════════════════════════════════════════════════════════
-- Profil utilisateur, sécurité du compte, partage
-- ═══════════════════════════════════════════════════════════════

alter table users add column if not exists first_name text;
alter table users add column if not exists last_name text;
alter table users add column if not exists phone text;
alter table users add column if not exists locale text not null default 'fr';
alter table users add column if not exists email_verified_at timestamptz;
alter table users add column if not exists pending_email text;
alter table users add column if not exists terms_accepted_at timestamptz;
alter table users add column if not exists terms_version text;
alter table users add column if not exists avatar_key text;
alter table users add column if not exists avatar_type text;
alter table users add column if not exists avatar_updated_at timestamptz;
-- Toute session émise avant cette date est invalide (« se déconnecter partout », changement de mot de passe).
-- Valeur initiale « epoch » pour les comptes existants (leurs sessions restent valides), puis now() pour les nouveaux.
alter table users add column if not exists session_epoch timestamptz not null default 'epoch';
alter table users alter column session_epoch set default now();
alter table users add column if not exists preferences jsonb not null default '{}'::jsonb;
alter table users add column if not exists emergency_contact jsonb not null default '{}'::jsonb;
alter table users add column if not exists updated_at timestamptz not null default now();

-- Sessions : une ligne par appareil connecté (identifiant = claim "sid" du JWT).
create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text,
  ip text,
  revoked_at timestamptz
);
create index if not exists user_sessions_user_idx on user_sessions (user_id);

-- Jetons à usage unique envoyés par e-mail : vérification, mot de passe oublié, changement d'adresse, invitation.
-- Seul le hachage du jeton est stocké.
create table if not exists user_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  purpose text not null,
  token_hash text not null unique,
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists user_tokens_user_purpose_idx on user_tokens (user_id, purpose);

-- Lien de partage en lecture seule d'un animal (vétérinaire) : valable jusqu'à expires_at, révocable.
create table if not exists share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  token_hash text not null unique,
  label text,
  include_notes boolean not null default false,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists share_links_user_idx on share_links (user_id);

-- Foyer : le propriétaire invite une personne (par e-mail) à consulter ses carnets.
create table if not exists household_invites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  email text not null,
  role text not null default 'reader',
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists household_invites_owner_idx on household_invites (owner_id);

create table if not exists household_members (
  owner_id uuid not null references users(id) on delete cascade,
  member_id uuid not null references users(id) on delete cascade,
  role text not null default 'reader',
  created_at timestamptz not null default now(),
  primary key (owner_id, member_id)
);

alter table share_links add column if not exists include_contact boolean not null default false;
alter table share_links add column if not exists include_photos boolean not null default false;
