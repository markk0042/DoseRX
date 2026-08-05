-- DoseRX initial schema (Supabase / Postgres)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run

create extension if not exists "pgcrypto";

-- ── Staff ──────────────────────────────────────────────
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade text not null check (grade in ('EMT', 'Paramedic', 'AP')),
  role text not null check (role in ('management', 'staff')),
  pin text not null,
  phecc_number text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Bags ───────────────────────────────────────────────
create table if not exists public.bags (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  grade text not null check (grade in ('EMT', 'Paramedic', 'AP')),
  type text not null check (type in ('standard', 'controlled', 'event')),
  seal_number text not null default '',
  status text not null default 'sealed',
  tag_status text not null default 'green' check (tag_status in ('green', 'red', 'untagged')),
  assigned_vehicle text,
  last_checked_at timestamptz,
  last_checked_by text,
  last_stocked_at timestamptz,
  last_stocked_by text,
  active_shift_id uuid,
  event_name text,
  event_starts_at timestamptz,
  event_ends_at timestamptz,
  last_lat double precision,
  last_lng double precision,
  last_location_at timestamptz,
  sandbox boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bags_status_idx on public.bags (status);
create index if not exists bags_sandbox_idx on public.bags (sandbox);

-- ── Stock items (per bag) ──────────────────────────────
create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  bag_id uuid not null references public.bags (id) on delete cascade,
  medication_id text not null,
  name text not null,
  presentation text not null default '',
  quantity integer not null default 0,
  par_level integer not null default 0,
  lot_number text not null default '',
  expiry_date date not null,
  controlled boolean not null default false,
  schedule text check (schedule is null or schedule in ('2', '3', '4')),
  unit text not null default 'unit',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stock_items_bag_idx on public.stock_items (bag_id);
create index if not exists stock_items_expiry_idx on public.stock_items (expiry_date);

-- ── Shifts ─────────────────────────────────────────────
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  bag_id uuid not null references public.bags (id) on delete cascade,
  bag_code text not null,
  signed_out_at timestamptz not null default now(),
  returned_at timestamptz,
  holder_id uuid not null references public.staff (id),
  holder_name text not null,
  witness_out_id uuid references public.staff (id),
  witness_out_name text,
  witness_return_id uuid references public.staff (id),
  witness_return_name text,
  tag_on_sign_out text not null default 'green',
  tag_on_return text,
  tag_still_intact_on_return boolean,
  meds_checked_on_untagged boolean,
  active boolean not null default true,
  notes_out text,
  notes_return text,
  photo_out_path text,
  photo_return_path text,
  loc_out_lat double precision,
  loc_out_lng double precision,
  loc_return_lat double precision,
  loc_return_lng double precision,
  sandbox boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists shifts_active_idx on public.shifts (active);
create index if not exists shifts_bag_idx on public.shifts (bag_id);

-- ── Activity log (append-oriented) ─────────────────────
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  bag_id uuid references public.bags (id) on delete set null,
  bag_code text not null,
  occurred_at timestamptz not null default now(),
  practitioner_id uuid references public.staff (id),
  practitioner_name text not null,
  witness_id uuid references public.staff (id),
  witness_name text,
  medication_name text,
  quantity numeric,
  notes text,
  patient_ref text,
  discrepancy boolean default false,
  out_of_scope boolean default false,
  cpg_version text,
  part_dose jsonb,
  loc_lat double precision,
  loc_lng double precision,
  photo_paths text[] default '{}',
  synced boolean not null default true,
  sandbox boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists activities_occurred_idx on public.activities (occurred_at desc);
create index if not exists activities_type_idx on public.activities (type);
create index if not exists activities_bag_idx on public.activities (bag_id);

-- ── Discrepancies ──────────────────────────────────────
create table if not exists public.discrepancies (
  id uuid primary key default gen_random_uuid(),
  bag_id uuid references public.bags (id) on delete set null,
  bag_code text not null,
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved')),
  reported_at timestamptz not null default now(),
  reported_by_id uuid references public.staff (id),
  reported_by_name text not null,
  witness_id uuid references public.staff (id),
  witness_name text,
  summary text not null,
  details text,
  item_notes text,
  assigned_to_id uuid references public.staff (id),
  assigned_to_name text,
  resolution text,
  resolved_at timestamptz,
  resolved_by_id uuid references public.staff (id),
  resolved_by_name text,
  sandbox boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists discrepancies_status_idx on public.discrepancies (status);

-- ── Photo evidence metadata (files in Storage bucket) ──
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  bag_id uuid references public.bags (id) on delete set null,
  shift_id uuid references public.shifts (id) on delete set null,
  activity_id uuid references public.activities (id) on delete set null,
  storage_path text not null,
  caption text,
  captured_at timestamptz not null default now(),
  uploaded_by uuid references public.staff (id),
  sandbox boolean not null default false
);

-- ── Updated-at helper ──────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists staff_updated_at on public.staff;
create trigger staff_updated_at before update on public.staff
for each row execute function public.set_updated_at();

drop trigger if exists bags_updated_at on public.bags;
create trigger bags_updated_at before update on public.bags
for each row execute function public.set_updated_at();

drop trigger if exists stock_items_updated_at on public.stock_items;
create trigger stock_items_updated_at before update on public.stock_items
for each row execute function public.set_updated_at();

drop trigger if exists discrepancies_updated_at on public.discrepancies;
create trigger discrepancies_updated_at before update on public.discrepancies
for each row execute function public.set_updated_at();

-- ── Row Level Security (locked down; open later with auth policies) ──
alter table public.staff enable row level security;
alter table public.bags enable row level security;
alter table public.stock_items enable row level security;
alter table public.shifts enable row level security;
alter table public.activities enable row level security;
alter table public.discrepancies enable row level security;
alter table public.photos enable row level security;

-- Temporary demo policies: allow anon key for early wiring (replace with auth-based policies before go-live)
create policy "demo_staff_all" on public.staff for all using (true) with check (true);
create policy "demo_bags_all" on public.bags for all using (true) with check (true);
create policy "demo_stock_all" on public.stock_items for all using (true) with check (true);
create policy "demo_shifts_all" on public.shifts for all using (true) with check (true);
create policy "demo_activities_all" on public.activities for all using (true) with check (true);
create policy "demo_discrepancies_all" on public.discrepancies for all using (true) with check (true);
create policy "demo_photos_all" on public.photos for all using (true) with check (true);

-- ── Storage bucket for seal/tag photos ─────────────────
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

create policy "demo_evidence_read" on storage.objects
  for select using (bucket_id = 'evidence');
create policy "demo_evidence_insert" on storage.objects
  for insert with check (bucket_id = 'evidence');
create policy "demo_evidence_update" on storage.objects
  for update using (bucket_id = 'evidence');
create policy "demo_evidence_delete" on storage.objects
  for delete using (bucket_id = 'evidence');
