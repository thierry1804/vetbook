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

create table if not exists support_requests (
  id bigserial primary key,
  email text not null,
  subject text not null,
  description text not null,
  status text not null default 'nouveau' check (status in ('nouveau', 'en_cours', 'traite')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table support_requests add column if not exists user_id uuid references users(id) on delete set null;
create index if not exists support_requests_created_idx on support_requests (created_at desc);
create index if not exists support_requests_user_idx on support_requests (user_id, created_at desc) where user_id is not null;
create table if not exists support_request_replies (
  id bigserial primary key,
  request_id bigint not null references support_requests(id) on delete cascade,
  admin_id uuid references admin_users(id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists support_request_replies_request_idx on support_request_replies (request_id, id);

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

-- Journal d'accès public : navigation front (connecté ou non) + appels API publics marquants
-- (connexion, inscription, lien de partage…). Distinct de admin_audit_log (actions du backoffice,
-- ajout seul) : volume plus élevé, pas de protection d'immuabilité, visible dans le même écran
-- "Journal d'audit" via un onglet dédié.
create table if not exists access_log (
  id bigserial primary key,
  kind text not null, -- 'page' (navigation front) | 'api' (appel public marquant)
  action text not null,
  path text,
  user_id uuid references users(id) on delete set null,
  ip text,
  user_agent text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists access_log_created_idx on access_log (created_at desc);
create index if not exists access_log_kind_idx on access_log (kind);

-- Link notification attempts to an execution; historical messages remain unlinked.
alter table message_log add column if not exists job_run_id bigint references job_runs(id) on delete set null;
create index if not exists message_log_job_run_idx on message_log (job_run_id);

-- Outbound AI attempts only: no prompts, replies, API keys, or animal/user identifiers.
create table if not exists ai_usage_log (
  id bigserial primary key,
  created_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz,
  source text not null check (source in ('chat', 'admin')),
  model text not null,
  status text not null default 'pending' check (status in ('pending', 'success', 'error')),
  http_status integer
);
create index if not exists ai_usage_created_idx on ai_usage_log (created_at);

-- Subscription access workflow: additive migration, existing periods are preserved.
alter table subscriptions add column if not exists version integer not null default 1;
alter table subscriptions add column if not exists workflow_version integer not null default 0;
alter table subscriptions add column if not exists anchor_day integer;
alter table subscriptions add column if not exists timezone text not null default 'UTC';
alter table subscriptions add column if not exists is_trial boolean not null default false;
alter table subscriptions add column if not exists replaced_by uuid;
alter table subscriptions add column if not exists metadata jsonb not null default '{}'::jsonb;
create index if not exists subscriptions_dates_idx on subscriptions (user_id, started_at, ends_at);

create table if not exists subscription_events (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete set null,
  action text not null,
  admin_id uuid references admin_users(id) on delete set null,
  admin_name text,
  reason text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index if not exists subscription_events_user_idx on subscription_events (user_id, id desc);
create table if not exists subscription_operations (
  user_id uuid not null references users(id) on delete cascade,
  operation_id uuid not null,
  admin_id uuid references admin_users(id) on delete set null,
  token_hash text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);
create table if not exists subscription_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('assign','renew')),
  plan_code text not null references plans(code),
  desired_start timestamptz,
  comment text not null default '',
  status text not null default 'nouveau' check (status in ('nouveau','en_cours','traite','refuse','annule')),
  assigned_to uuid references admin_users(id) on delete set null,
  public_reply text,
  internal_note text not null default '',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists subscription_requests_open_idx on subscription_requests (user_id, kind, plan_code) where status in ('nouveau','en_cours');
create table if not exists subscription_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete cascade,
  event_key text not null unique,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  email_status text not null default 'pending',
  push_status text not null default 'pending',
  attempted_at timestamptz
);
create index if not exists subscription_notifications_user_idx on subscription_notifications (user_id, created_at desc);

-- Persistent inboxes and transactionally published realtime changes.
create table if not exists inbox_notifications (
  id uuid primary key default gen_random_uuid(),
  audience text not null check(audience in ('user','admin')),
  recipient_id uuid not null,
  event_key text not null,
  title text not null,
  body text not null,
  href text not null,
  permission text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  push_status text not null default 'pending',
  attempted_at timestamptz,
  unique(audience,recipient_id,event_key)
);
create index if not exists inbox_recipient_idx on inbox_notifications(audience,recipient_id,created_at desc);
create table if not exists realtime_events (
  id bigserial primary key,
  audience text not null,
  recipient_id uuid,
  resource text not null,
  record_id text,
  created_at timestamptz not null default now()
);
create index if not exists realtime_events_created_idx on realtime_events(created_at);
create table if not exists admin_push_subscriptions (
  endpoint text primary key,
  admin_id uuid not null references admin_users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create or replace function publish_realtime(aud text, recipient uuid, resource_name text, record_key text) returns void as $$
begin
  -- Serialize event IDs through commit, including concurrent transactions.
  perform pg_advisory_xact_lock(73922,1);
  insert into realtime_events(audience,recipient_id,resource,record_id) values(aud,recipient,resource_name,record_key);
  perform pg_notify('applika_realtime','changed');
end;
$$ language plpgsql;
create or replace function realtime_inbox_change() returns trigger as $$
begin
  if TG_OP='UPDATE' and old.read_at is not distinct from new.read_at then return new; end if;
  perform publish_realtime(new.audience,new.recipient_id,'notifications',new.id::text);
  return new;
end;
$$ language plpgsql;
drop trigger if exists inbox_realtime on inbox_notifications;
create trigger inbox_realtime after insert or update of read_at on inbox_notifications for each row execute function realtime_inbox_change();
create or replace function support_request_notice() returns trigger as $$
begin
  insert into inbox_notifications(audience,recipient_id,event_key,title,body,href,permission)
    select 'admin',a.id,'support:'||new.id,'Nouvelle demande de support',new.subject,'/support-requests','users.support'
    from admin_users a where a.status='actif' and exists(
      select 1 from admin_role_permissions p where p.role_code=a.role_code and p.permission in ('*','users.*','users.support'))
    on conflict(audience,recipient_id,event_key) do nothing;
  return new;
end;
$$ language plpgsql;
drop trigger if exists support_request_notice_trigger on support_requests;
create trigger support_request_notice_trigger after insert on support_requests for each row execute function support_request_notice();
create or replace function support_request_realtime() returns trigger as $$
begin
  perform publish_realtime('admin',null,'support-requests',new.id::text);
  if new.user_id is not null then
    perform publish_realtime('user',new.user_id,'support-requests',new.id::text);
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists support_request_realtime_trigger on support_requests;
create trigger support_request_realtime_trigger after insert or update of status,updated_at on support_requests
  for each row execute function support_request_realtime();
create or replace function notify_subscription_admins(key text, heading text, message text, link text, actor uuid default null) returns void as $$
begin
  insert into inbox_notifications(audience,recipient_id,event_key,title,body,href,permission)
    select 'admin',a.id,key,heading,message,link,'subscriptions.read' from admin_users a
    where a.status='actif' and (actor is null or a.id<>actor) and exists(
      select 1 from admin_role_permissions p where p.role_code=a.role_code and p.permission in ('*','subscriptions.*','subscriptions.read'))
    on conflict(audience,recipient_id,event_key) do nothing;
end;
$$ language plpgsql;
create or replace function subscription_request_realtime() returns trigger as $$
begin
  perform publish_realtime('user',new.user_id,'subscription-requests',new.id::text);
  perform publish_realtime('admin',null,'subscription-requests',new.id::text);
  if TG_OP='INSERT' then
    perform notify_subscription_admins('request:'||new.id,'Nouvelle demande d’abonnement','Une demande attend votre examen.','/subscription-requests?status=open');
    insert into inbox_notifications(audience,recipient_id,event_key,title,body,href)
      values('user',new.user_id,'request-received:'||new.id,'Votre demande a été reçue','L’équipe examinera votre demande. Aucun accès n’est activé par son envoi.','/?account=plan') on conflict do nothing;
  elsif new.status='en_cours' and old.status is distinct from new.status then
    insert into inbox_notifications(audience,recipient_id,event_key,title,body,href)
      values('user',new.user_id,'request-taken:'||new.id,'Votre demande est en cours de traitement','L’équipe a pris en charge votre demande d’abonnement.','/?account=plan') on conflict do nothing;
  elsif new.status='annule' and old.status is distinct from new.status then
    perform notify_subscription_admins('request-cancelled:'||new.id,'Demande d’abonnement annulée','L’utilisateur a annulé sa demande.','/subscription-requests?status=annule');
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists subscription_requests_realtime on subscription_requests;
create trigger subscription_requests_realtime after insert or update on subscription_requests for each row execute function subscription_request_realtime();
create or replace function subscription_period_realtime() returns trigger as $$
begin
  perform publish_realtime('user',new.user_id,'subscription',new.id::text);
  perform publish_realtime('admin',null,'subscription',new.id::text);
  return new;
end;
$$ language plpgsql;
drop trigger if exists subscription_periods_realtime on subscriptions;
create trigger subscription_periods_realtime after insert or update on subscriptions for each row execute function subscription_period_realtime();
create or replace function subscription_notice_inbox() returns trigger as $$
begin
  insert into inbox_notifications(audience,recipient_id,event_key,title,body,href,push_status,created_at,read_at)
    values('user',new.user_id,'subscription:'||new.event_key,new.title,new.body,'/?account=plan','legacy',new.created_at,new.read_at)
    on conflict(audience,recipient_id,event_key) do update set read_at=excluded.read_at;
  return new;
end;
$$ language plpgsql;
drop trigger if exists subscription_notice_realtime on subscription_notifications;
create trigger subscription_notice_realtime after insert or update of read_at on subscription_notifications for each row execute function subscription_notice_inbox();
insert into inbox_notifications(audience,recipient_id,event_key,title,body,href,push_status,created_at,read_at)
  select 'user',user_id,'subscription:'||event_key,title,body,'/?account=plan','legacy',created_at,read_at from subscription_notifications on conflict do nothing;
create or replace function subscription_action_inbox() returns trigger as $$
begin
  perform notify_subscription_admins('subscription-action:'||new.id,'Abonnement modifié','Une décision d’accès a été enregistrée. Consultez le dossier et son historique.','/subscriptions/users/'||new.user_id,new.admin_id);
  return new;
end;
$$ language plpgsql;
drop trigger if exists subscription_action_notice on subscription_events;
create trigger subscription_action_notice after insert on subscription_events for each row execute function subscription_action_inbox();
create or replace function subscription_deadline_admin_notice() returns trigger as $$
begin
  if new.event_key like 'soon:%' or new.event_key like 'expiry:%' then
    perform notify_subscription_admins('deadline:'||new.event_key,new.title,'Une échéance d’abonnement nécessite votre attention. Consultez le dossier.','/subscriptions/users/'||new.user_id);
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists subscription_deadline_admin on subscription_notifications;
create trigger subscription_deadline_admin after insert on subscription_notifications for each row execute function subscription_deadline_admin_notice();
create or replace function entitlement_realtime() returns trigger as $$
begin
  if TG_OP='DELETE' then
    perform publish_realtime('user',old.user_id,'subscription',old.id::text);
    perform publish_realtime('admin',null,'subscription',old.id::text);
    return old;
  end if;
  perform publish_realtime('user',new.user_id,'subscription',new.id::text);
  perform publish_realtime('admin',null,'subscription',new.id::text);
  return new;
end;
$$ language plpgsql;
drop trigger if exists entitlement_overrides_realtime on entitlement_overrides;
create trigger entitlement_overrides_realtime after insert or update or delete on entitlement_overrides for each row execute function entitlement_realtime();
-- Existing open requests must also be discoverable in the new admin inbox.
select notify_subscription_admins('request:'||r.id,'Demande d’abonnement à examiner','Une demande ouverte attend votre examen.','/subscription-requests?status=open')
  from subscription_requests r where r.status in ('nouveau','en_cours');
create or replace function remove_account_inbox() returns trigger as $$
begin
  delete from inbox_notifications where audience=TG_ARGV[0] and recipient_id=old.id;
  return old;
end;
$$ language plpgsql;
drop trigger if exists user_inbox_cleanup on users;
create trigger user_inbox_cleanup after delete on users for each row execute function remove_account_inbox('user');
drop trigger if exists admin_inbox_cleanup on admin_users;
create trigger admin_inbox_cleanup after delete on admin_users for each row execute function remove_account_inbox('admin');

-- Manual payment reference recorded while fulfilling a subscription request.
alter table subscription_requests add column if not exists payment_reference text;
alter table subscription_events add column if not exists payment_reference text;
