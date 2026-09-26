-- App'lika — schéma du backoffice (spec « VetBook — Spécification du backoffice », 26/09/2026).
-- Appliqué après schema.sql au démarrage de l'API (api/_lib/schema.js). Idempotent.
-- Périmètre : socle MVP (admin, RBAC, audit, référentiels versionnés, contenus, annuaire,
-- abonnements, exploitation). Reporté : campaigns, email_templates, gdpr_requests, practices*.

-- ═══ Comptes utilisateurs : statut (seule colonne modifiée sur une table existante) ═══
alter table users add column if not exists status text not null default 'actif';
alter table users add column if not exists suspended_at timestamptz;
alter table users add column if not exists suspension_reason text;

-- ═══ Admin : comptes distincts des utilisateurs, RBAC, sessions, audit ═══
create table if not exists admin_roles (
  code text primary key,
  label text not null
);

create table if not exists admin_role_permissions (
  role_code text not null references admin_roles(code) on delete cascade,
  permission text not null,
  primary key (role_code, permission)
);

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  password_hash text not null,
  role_code text not null references admin_roles(code),
  totp_secret text,
  totp_enabled boolean not null default false,
  status text not null default 'actif',
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admin_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ip text,
  user_agent text,
  revoked_at timestamptz
);
create index if not exists admin_sessions_admin_idx on admin_sessions (admin_id);

-- Journal d'audit : ajout seul (les UPDATE/DELETE sont refusés par un déclencheur).
create table if not exists admin_audit_log (
  id bigserial primary key,
  admin_id uuid references admin_users(id) on delete set null,
  admin_email text,
  action text not null,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  reason text,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on admin_audit_log (created_at desc);
create index if not exists admin_audit_target_idx on admin_audit_log (target_type, target_id);

create or replace function admin_audit_immutable() returns trigger as $$
begin
  raise exception 'admin_audit_log est en ajout seul';
end;
$$ language plpgsql;

drop trigger if exists admin_audit_no_update on admin_audit_log;
create trigger admin_audit_no_update before update or delete on admin_audit_log
  for each row execute function admin_audit_immutable();

-- ═══ Référentiels métier, publiés par versions figées ═══
create table if not exists ref_species (
  code text primary key,
  label text not null,
  sort_order integer not null default 0,
  status text not null default 'actif'
);

create table if not exists ref_breeds (
  id bigserial primary key,
  species_code text not null references ref_species(code),
  name text not null,
  aliases text[] not null default '{}',
  weight_min numeric,
  weight_max numeric,
  height_min numeric,
  height_max numeric,
  fci_number text,
  cc_slug text,
  status text not null default 'actif',
  unique (species_code, name)
);

create table if not exists ref_vaccines (
  id bigserial primary key,
  species_code text not null references ref_species(code),
  name text not null,
  laboratory text,
  valences text,
  default_interval_days integer,
  status text not null default 'commercialise',
  unique (species_code, name)
);

create table if not exists ref_antiparasitics (
  id bigserial primary key,
  species_code text not null references ref_species(code),
  name text not null,
  kind text,
  default_interval_days integer,
  status text not null default 'commercialise',
  unique (species_code, name)
);

-- Listes simples : symptômes, types d'hygiène, activités (meta.met = coefficient MET), types de repas, catégories.
create table if not exists ref_lists (
  id bigserial primary key,
  list_type text not null,
  label text not null,
  sort_order integer not null default 0,
  meta jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  unique (list_type, label)
);

create table if not exists ref_checkup_criteria (
  key text primary key,
  label text not null,
  icon text,
  levels jsonb not null default '[]'::jsonb,
  advice jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists ref_registries (
  code text primary key,
  label text not null,
  country text not null,
  number_regex text,
  lookup_url text,
  delays jsonb not null default '{}'::jsonb,
  status text not null default 'actif'
);

create table if not exists ref_releases (
  version integer generated always as identity primary key,
  status text not null default 'draft',
  note text,
  content jsonb,
  created_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_by uuid references admin_users(id) on delete set null,
  published_at timestamptz
);

-- ═══ Contenus éditoriaux ═══
create table if not exists content_tips (
  id bigserial primary key,
  title text not null,
  body text not null,
  category text not null default 'sante',
  species text,
  country text not null default 'MG',
  author text,
  vet_reviewed boolean not null default false,
  featured boolean not null default false,
  status text not null default 'brouillon',
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists content_events (
  id bigserial primary key,
  title text not null,
  description text,
  month integer,
  day integer,
  event_date date,
  recurring boolean not null default true,
  location text,
  country text not null default 'MG',
  link text,
  status text not null default 'brouillon',
  created_at timestamptz not null default now()
);

-- Pages légales (CGU, confidentialité), aide, textes de l'app : versionnées.
create table if not exists content_pages (
  id bigserial primary key,
  slug text not null,
  kind text not null default 'text',
  title text not null,
  body text not null default '',
  version text not null default '1',
  status text not null default 'brouillon',
  force_reaccept boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (slug, version)
);

-- ═══ Annuaire vétérinaire public et urgences ═══
create table if not exists directory_clinics (
  id bigserial primary key,
  name text not null,
  address text,
  city text,
  country text not null default 'MG',
  lat double precision,
  lng double precision,
  phone text,
  email text,
  hours text,
  on_call boolean not null default false,
  emergency boolean not null default false,
  species text[] not null default '{}',
  source text,
  status text not null default 'a_valider',
  created_at timestamptz not null default now()
);
create index if not exists directory_clinics_country_idx on directory_clinics (country, status);

create table if not exists emergency_numbers (
  id bigserial primary key,
  country text not null,
  label text not null,
  phone text not null,
  hours text,
  sort_order integer not null default 0,
  status text not null default 'actif'
);

-- ═══ Abonnements et droits ═══
create table if not exists plans (
  code text primary key,
  name text not null,
  audience text not null default 'owner',
  price_mga integer not null default 0,
  period text not null default 'mensuel',
  trial_days integer not null default 0,
  country text not null default 'MG',
  visible boolean not null default true,
  archived boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists features (
  code text primary key,
  label text not null,
  kind text not null default 'boolean'
);
alter table features add column if not exists category text;
alter table features add column if not exists sort_order integer not null default 0;

create table if not exists plan_features (
  plan_code text not null references plans(code) on delete cascade,
  feature_code text not null references features(code) on delete cascade,
  enabled boolean not null default true,
  quota numeric,
  primary key (plan_code, feature_code)
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  plan_code text not null references plans(code),
  status text not null default 'actif',
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  auto_renew boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on subscriptions (user_id, status);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references subscriptions(id) on delete set null,
  user_id uuid not null references users(id) on delete cascade,
  amount_mga integer not null,
  method text not null default 'especes',
  reference text,
  status text not null default 'confirme',
  paid_at timestamptz not null default now(),
  entered_by uuid references admin_users(id) on delete set null
);

create sequence if not exists invoice_number_seq;
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  user_id uuid not null references users(id) on delete cascade,
  payment_id uuid references payments(id) on delete set null,
  amount_mga integer not null,
  issued_at timestamptz not null default now()
);

create table if not exists coupons (
  code text primary key,
  percent_off integer,
  amount_off_mga integer,
  valid_until date,
  max_uses integer,
  uses integer not null default 0,
  active boolean not null default true
);

create table if not exists entitlement_overrides (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  feature_code text not null references features(code) on delete cascade,
  enabled boolean not null default true,
  quota numeric,
  reason text not null,
  expires_at timestamptz,
  created_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists entitlement_overrides_user_idx on entitlement_overrides (user_id);

-- ═══ Exploitation ═══
create table if not exists job_runs (
  id bigserial primary key,
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  sent integer not null default 0,
  failed integer not null default 0,
  details jsonb not null default '{}'::jsonb
);

create table if not exists message_log (
  id bigserial primary key,
  channel text not null,
  template text,
  recipient text,
  user_id uuid references users(id) on delete set null,
  status text not null,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists message_log_created_idx on message_log (created_at desc);

create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists feature_flags (
  key text primary key,
  enabled boolean not null default false,
  note text
);
