-- VetBook — schéma cloud (Phase B)
-- À exécuter une fois dans Dashboard Supabase → SQL Editor → New query → Run.
-- Idempotent : peut être relancé sans dupliquer (IF NOT EXISTS partout).

-- ═══════════════════════════════════════════════════════════════
-- 1 animal = 1 "pets" row. Toutes les autres tables référencent
-- pets(id) et portent aussi user_id (redondant mais rend chaque
-- policy RLS triviale et indépendante d'un JOIN).
--
-- local_id : identifiant numérique généré côté app (state.nextId)
-- avant toute synchronisation. Conservé + contraint UNIQUE pour que
-- pousser deux fois la même donnée locale mette à jour au lieu de
-- dupliquer (upsert via onConflict côté client).
-- ═══════════════════════════════════════════════════════════════

create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
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
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
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
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
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
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
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
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
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
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
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
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
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
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
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
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
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
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  local_id bigint not null,
  date date not null,
  title text not null,
  content text,
  category text,
  created_at timestamptz not null default now(),
  unique (pet_id, local_id)
);

create table if not exists weight_history (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  local_id bigint not null,
  date date not null,
  weight numeric not null,
  created_at timestamptz not null default now(),
  unique (pet_id, local_id)
);

-- Métadonnées uniquement (le fichier reste local en IndexedDB pour
-- l'instant — voir data-layer.js, sync photo = amélioration future).
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  local_id bigint not null,
  date date,
  caption text,
  storage_path text,
  created_at timestamptz not null default now(),
  unique (pet_id, local_id)
);

create table if not exists nutrition_meals (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
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
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  target_calories text,
  meals_per_day text,
  food_brand text,
  portion_size text
);

create table if not exists pedigree (
  pet_id uuid primary key references pets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
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
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  vaccine_reminder boolean not null default true,
  deworming_reminder boolean not null default true,
  hygiene_reminder boolean not null default true,
  birthday_reminder boolean not null default true,
  monthly_summary boolean not null default false
);

-- Carnet vétérinaires : global au compte, pas lié à un animal précis.
create table if not exists vet_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
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

-- Abonnements Web Push (Phase C — créée maintenant, utilisée plus tard).
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security : chacun ne voit / modifie que ses propres
-- données. Politique identique partout (user_id = auth.uid()).
-- ═══════════════════════════════════════════════════════════════

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'pets', 'owners', 'vaccinations', 'dewormings', 'consultations',
      'medications', 'hygiene_events', 'activities', 'heat_cycles',
      'journal_notes', 'weight_history', 'photos', 'nutrition_meals',
      'nutrition_daily_plan', 'pedigree', 'notification_prefs',
      'vet_contacts', 'push_subscriptions'
    ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "owner_full_access" on %I', t);
    execute format(
      'create policy "owner_full_access" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

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
create index if not exists idx_photos_pet on photos(pet_id);
create index if not exists idx_nutrition_meals_pet on nutrition_meals(pet_id);
create index if not exists idx_pets_user on pets(user_id);
create index if not exists idx_vet_contacts_user on vet_contacts(user_id);

-- ═══════════════════════════════════════════════════════════════
-- Storage : bucket privé pour l'album photo (remplace l'IndexedDB
-- local — voir putPhotoBlob() dans app.js). Chaque fichier est
-- rangé sous <user_id>/<pet_id>/<photo_id>.jpg, ce qui permet une
-- policy RLS basée uniquement sur le 1er segment du chemin.
-- Pas encore utilisé par data-layer.js (sync photo = suite).
-- ═══════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', false)
on conflict (id) do nothing;

drop policy if exists "pet_photos_owner_access" on storage.objects;
create policy "pet_photos_owner_access" on storage.objects
  for all
  using (bucket_id = 'pet-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'pet-photos' and (storage.foldername(name))[1] = auth.uid()::text);
