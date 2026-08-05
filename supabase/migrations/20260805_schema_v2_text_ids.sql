-- DoseRX schema v2: text IDs matching the app (run in SQL Editor)
-- Safe to re-run: drops and recreates core tables

drop policy if exists "demo_evidence_read" on storage.objects;
drop policy if exists "demo_evidence_insert" on storage.objects;
drop policy if exists "demo_evidence_update" on storage.objects;
drop policy if exists "demo_evidence_delete" on storage.objects;

drop table if exists public.photos cascade;
drop table if exists public.discrepancies cascade;
drop table if exists public.activities cascade;
drop table if exists public.shifts cascade;
drop table if exists public.stock_items cascade;
drop table if exists public.bags cascade;
drop table if exists public.staff cascade;

create table public.staff (
  id text primary key,
  name text not null,
  grade text not null check (grade in ('EMT', 'Paramedic', 'AP')),
  role text not null check (role in ('management', 'staff')),
  pin text not null,
  phecc_number text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bags (
  id text primary key,
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
  active_shift_id text,
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

create index bags_status_idx on public.bags (status);
create index bags_sandbox_idx on public.bags (sandbox);

create table public.stock_items (
  id text primary key,
  bag_id text not null references public.bags (id) on delete cascade,
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

create index stock_items_bag_idx on public.stock_items (bag_id);

create table public.shifts (
  id text primary key,
  bag_id text not null references public.bags (id) on delete cascade,
  bag_code text not null,
  signed_out_at timestamptz not null default now(),
  returned_at timestamptz,
  holder_id text not null references public.staff (id),
  holder_name text not null,
  witness_out_id text references public.staff (id),
  witness_out_name text,
  witness_return_id text references public.staff (id),
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

create index shifts_active_idx on public.shifts (active);

create table public.activities (
  id text primary key,
  type text not null,
  bag_id text references public.bags (id) on delete set null,
  bag_code text not null,
  occurred_at timestamptz not null default now(),
  practitioner_id text references public.staff (id),
  practitioner_name text not null,
  witness_id text references public.staff (id),
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

create index activities_occurred_idx on public.activities (occurred_at desc);

create table public.discrepancies (
  id text primary key,
  bag_id text references public.bags (id) on delete set null,
  bag_code text not null,
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved')),
  reported_at timestamptz not null default now(),
  reported_by_id text references public.staff (id),
  reported_by_name text not null,
  witness_id text references public.staff (id),
  witness_name text,
  summary text not null,
  details text,
  item_notes text,
  assigned_to_id text references public.staff (id),
  assigned_to_name text,
  resolution text,
  resolved_at timestamptz,
  resolved_by_id text references public.staff (id),
  resolved_by_name text,
  sandbox boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.photos (
  id text primary key,
  bag_id text references public.bags (id) on delete set null,
  shift_id text references public.shifts (id) on delete set null,
  activity_id text references public.activities (id) on delete set null,
  storage_path text not null,
  caption text,
  captured_at timestamptz not null default now(),
  uploaded_by text references public.staff (id),
  sandbox boolean not null default false
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger staff_updated_at before update on public.staff
for each row execute function public.set_updated_at();
create trigger bags_updated_at before update on public.bags
for each row execute function public.set_updated_at();
create trigger stock_items_updated_at before update on public.stock_items
for each row execute function public.set_updated_at();
create trigger discrepancies_updated_at before update on public.discrepancies
for each row execute function public.set_updated_at();

alter table public.staff enable row level security;
alter table public.bags enable row level security;
alter table public.stock_items enable row level security;
alter table public.shifts enable row level security;
alter table public.activities enable row level security;
alter table public.discrepancies enable row level security;
alter table public.photos enable row level security;

create policy "demo_staff_all" on public.staff for all using (true) with check (true);
create policy "demo_bags_all" on public.bags for all using (true) with check (true);
create policy "demo_stock_all" on public.stock_items for all using (true) with check (true);
create policy "demo_shifts_all" on public.shifts for all using (true) with check (true);
create policy "demo_activities_all" on public.activities for all using (true) with check (true);
create policy "demo_discrepancies_all" on public.discrepancies for all using (true) with check (true);
create policy "demo_photos_all" on public.photos for all using (true) with check (true);

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

-- Demo staff matching app PINs
insert into public.staff (id, name, grade, role, pin, phecc_number) values
  ('mgmt-1', 'Claire Byrne', 'AP', 'management', '9999', 'MGMT-001'),
  ('mgmt-2', 'Tom Fitzgerald', 'Paramedic', 'management', '8888', 'MGMT-002'),
  ('staff-1', 'Aoife Brennan', 'EMT', 'staff', '1111', 'EMT-48291'),
  ('staff-2', 'Conor Murphy', 'EMT', 'staff', '2222', 'EMT-51902'),
  ('staff-3', 'Siobhán O''Neill', 'Paramedic', 'staff', '3333', 'P-33814'),
  ('staff-4', 'James Kelly', 'Paramedic', 'staff', '4444', 'P-29107'),
  ('staff-5', 'Niamh Walsh', 'AP', 'staff', '5555', 'AP-17462'),
  ('staff-6', 'Mark Doyle', 'AP', 'staff', '6666', 'AP-15208');
