-- JSN Supabase setup
-- Run this in Supabase Dashboard -> SQL Editor.
-- Then create a Storage bucket named: report-photos
-- Authentication: disable "Confirm email" because JSN uses a recovery code
-- instead of collecting an email address. Also leave password sign-in enabled.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Volunteer',
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id text primary key,
  lat double precision not null,
  lon double precision not null,
  cat text not null,
  note text not null default '',
  img text not null default '',
  by_user uuid references auth.users(id) on delete set null,
  t bigint not null,
  cleaned boolean not null default false,
  cleaned_t bigint not null default 0,
  cleaned_by uuid references auth.users(id) on delete set null
);

create table if not exists public.report_stills (
  id text primary key,
  rep text not null references public.reports(id) on delete cascade,
  by_user uuid not null references auth.users(id) on delete cascade,
  t bigint not null
);

create table if not exists public.events (
  id text primary key,
  title text not null,
  loc text not null,
  "when" bigint not null,
  by_user uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.rsvps (
  id text primary key,
  ev text not null references public.events(id) on delete cascade,
  by_user uuid not null references auth.users(id) on delete cascade,
  t bigint not null,
  unique(ev, by_user)
);

create table if not exists public.kit_requests (
  id text primary key,
  item text not null,
  qty integer not null check (qty > 0 and qty <= 500),
  ev_id text default '',
  ev_title text default '',
  note text not null default '',
  by_user uuid references auth.users(id) on delete set null,
  name text not null default 'Guest',
  t bigint not null,
  status text not null default 'pending' check (status in ('pending','supplied'))
);

create table if not exists public.kit_ledger (
  id text primary key,
  item text not null,
  type text not null check (type in ('in','out')),
  n integer not null check (n > 0 and n <= 10000),
  by_user uuid references auth.users(id) on delete set null,
  t bigint not null
);

create index if not exists reports_t_idx on public.reports(t desc);
create index if not exists reports_cleaned_idx on public.reports(cleaned);
create index if not exists events_when_idx on public.events("when");
create index if not exists requests_t_idx on public.kit_requests(t desc);
create index if not exists ledger_t_idx on public.kit_ledger(t desc);

alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.report_stills enable row level security;
alter table public.events enable row level security;
alter table public.rsvps enable row level security;
alter table public.kit_requests enable row level security;
alter table public.kit_ledger enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Profiles
create policy "profiles public read name" on public.profiles
  for select using (true);
create policy "profiles insert own" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Reports: public map/read; signed-in users create; owner/admin can change.
create policy "reports public read" on public.reports
  for select using (true);
create policy "reports authenticated insert" on public.reports
  for insert to authenticated
  with check (by_user = auth.uid());
create policy "reports owner or admin update" on public.reports
  for update to authenticated
  using (by_user = auth.uid() or public.is_admin())
  with check (by_user = auth.uid() or public.is_admin());
create policy "reports owner or admin delete" on public.reports
  for delete to authenticated
  using (by_user = auth.uid() or public.is_admin());

-- "Still there" checks are public to read, but tied to the signed-in user.
create policy "stills public read" on public.report_stills
  for select using (true);
create policy "stills own insert" on public.report_stills
  for insert to authenticated
  with check (by_user = auth.uid());
create policy "stills own delete" on public.report_stills
  for delete to authenticated
  using (by_user = auth.uid() or public.is_admin());

-- Events
create policy "events public read" on public.events
  for select using (true);
create policy "events authenticated insert" on public.events
  for insert to authenticated
  with check (by_user = auth.uid());
create policy "events owner or admin update" on public.events
  for update to authenticated
  using (by_user = auth.uid() or public.is_admin())
  with check (by_user = auth.uid() or public.is_admin());
create policy "events owner or admin delete" on public.events
  for delete to authenticated
  using (by_user = auth.uid() or public.is_admin());

-- RSVPs
create policy "rsvps public read" on public.rsvps
  for select using (true);
create policy "rsvps own insert" on public.rsvps
  for insert to authenticated
  with check (by_user = auth.uid());
create policy "rsvps own delete" on public.rsvps
  for delete to authenticated
  using (by_user = auth.uid());

-- Kit requests: everyone can see the queue; only the requester can create;
-- admins can mark supplied.
create policy "requests public read" on public.kit_requests
  for select using (true);
create policy "requests authenticated insert" on public.kit_requests
  for insert to authenticated
  with check (by_user = auth.uid());
create policy "requests admin update" on public.kit_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create policy "requests owner or admin delete" on public.kit_requests
  for delete to authenticated
  using (by_user = auth.uid() or public.is_admin());

-- Kit ledger: public read, admin write.
create policy "ledger public read" on public.kit_ledger
  for select using (true);
create policy "ledger admin insert" on public.kit_ledger
  for insert to authenticated
  with check (public.is_admin() and by_user = auth.uid());
create policy "ledger admin update" on public.kit_ledger
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create policy "ledger admin delete" on public.kit_ledger
  for delete to authenticated
  using (public.is_admin());

-- Storage: public report photos (the reports themselves are public on the map).
insert into storage.buckets (id, name, public) values ('report-photos', 'report-photos', true)
on conflict (id) do update set public = true;

-- These policies allow signed-in users to upload. The first folder is the auth user id.
create policy "report photos authenticated upload"
on storage.objects for insert to authenticated
with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "report photos authenticated update"
on storage.objects for update to authenticated
using (bucket_id = 'report-photos' and owner_id = auth.uid()::text)
with check (bucket_id = 'report-photos' and owner_id = auth.uid()::text);

create policy "report photos authenticated delete"
on storage.objects for delete to authenticated
using (bucket_id = 'report-photos' and (owner_id = auth.uid()::text or public.is_admin()));

-- Realtime for live updates.
-- If these tables are already in supabase_realtime, the statements below may report
-- that they are already members; that is harmless.

alter publication supabase_realtime add table public.reports;
alter publication supabase_realtime add table public.report_stills;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.rsvps;
alter publication supabase_realtime add table public.kit_requests;
alter publication supabase_realtime add table public.kit_ledger;
alter publication supabase_realtime add table public.profiles;

-- After creating your first account, replace YOUR_USER_UUID below with its auth.users id
-- if you want that account to manage kit stock and requests.
-- update public.profiles set is_admin = true where id = 'YOUR_USER_UUID';
