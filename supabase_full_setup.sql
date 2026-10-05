-- =====================================================================
-- JSN – COMPLETE SUPABASE SETUP (schema + patch v3 + patch v4 in one go)
-- Paste ALL of this into Supabase -> SQL Editor -> New query, then press Run.
-- Safe to run again if something goes wrong part-way.
-- =====================================================================


-- =====================================================================
-- PART 1 of 3 – tables, security rules, photo storage, live updates
-- =====================================================================
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
drop policy if exists "profiles public read name" on public.profiles;
create policy "profiles public read name" on public.profiles
  for select using (true);
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert with check (id = auth.uid());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Reports: public map/read; signed-in users create; owner/admin can change.
drop policy if exists "reports public read" on public.reports;
create policy "reports public read" on public.reports
  for select using (true);
drop policy if exists "reports authenticated insert" on public.reports;
create policy "reports authenticated insert" on public.reports
  for insert to authenticated
  with check (by_user = auth.uid());
drop policy if exists "reports owner or admin update" on public.reports;
create policy "reports owner or admin update" on public.reports
  for update to authenticated
  using (by_user = auth.uid() or public.is_admin())
  with check (by_user = auth.uid() or public.is_admin());
drop policy if exists "reports owner or admin delete" on public.reports;
create policy "reports owner or admin delete" on public.reports
  for delete to authenticated
  using (by_user = auth.uid() or public.is_admin());

-- "Still there" checks are public to read, but tied to the signed-in user.
drop policy if exists "stills public read" on public.report_stills;
create policy "stills public read" on public.report_stills
  for select using (true);
drop policy if exists "stills own insert" on public.report_stills;
create policy "stills own insert" on public.report_stills
  for insert to authenticated
  with check (by_user = auth.uid());
drop policy if exists "stills own delete" on public.report_stills;
create policy "stills own delete" on public.report_stills
  for delete to authenticated
  using (by_user = auth.uid() or public.is_admin());

-- Events
drop policy if exists "events public read" on public.events;
create policy "events public read" on public.events
  for select using (true);
drop policy if exists "events authenticated insert" on public.events;
create policy "events authenticated insert" on public.events
  for insert to authenticated
  with check (by_user = auth.uid());
drop policy if exists "events owner or admin update" on public.events;
create policy "events owner or admin update" on public.events
  for update to authenticated
  using (by_user = auth.uid() or public.is_admin())
  with check (by_user = auth.uid() or public.is_admin());
drop policy if exists "events owner or admin delete" on public.events;
create policy "events owner or admin delete" on public.events
  for delete to authenticated
  using (by_user = auth.uid() or public.is_admin());

-- RSVPs
drop policy if exists "rsvps public read" on public.rsvps;
create policy "rsvps public read" on public.rsvps
  for select using (true);
drop policy if exists "rsvps own insert" on public.rsvps;
create policy "rsvps own insert" on public.rsvps
  for insert to authenticated
  with check (by_user = auth.uid());
drop policy if exists "rsvps own delete" on public.rsvps;
create policy "rsvps own delete" on public.rsvps
  for delete to authenticated
  using (by_user = auth.uid());

-- Kit requests: everyone can see the queue; only the requester can create;
-- admins can mark supplied.
drop policy if exists "requests public read" on public.kit_requests;
create policy "requests public read" on public.kit_requests
  for select using (true);
drop policy if exists "requests authenticated insert" on public.kit_requests;
create policy "requests authenticated insert" on public.kit_requests
  for insert to authenticated
  with check (by_user = auth.uid());
drop policy if exists "requests admin update" on public.kit_requests;
create policy "requests admin update" on public.kit_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
drop policy if exists "requests owner or admin delete" on public.kit_requests;
create policy "requests owner or admin delete" on public.kit_requests
  for delete to authenticated
  using (by_user = auth.uid() or public.is_admin());

-- Kit ledger: public read, admin write.
drop policy if exists "ledger public read" on public.kit_ledger;
create policy "ledger public read" on public.kit_ledger
  for select using (true);
drop policy if exists "ledger admin insert" on public.kit_ledger;
create policy "ledger admin insert" on public.kit_ledger
  for insert to authenticated
  with check (public.is_admin() and by_user = auth.uid());
drop policy if exists "ledger admin update" on public.kit_ledger;
create policy "ledger admin update" on public.kit_ledger
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
drop policy if exists "ledger admin delete" on public.kit_ledger;
create policy "ledger admin delete" on public.kit_ledger
  for delete to authenticated
  using (public.is_admin());

-- Storage: public report photos (the reports themselves are public on the map).
insert into storage.buckets (id, name, public) values ('report-photos', 'report-photos', true)
on conflict (id) do update set public = true;

-- These policies allow signed-in users to upload. The first folder is the auth user id.
drop policy if exists "report photos authenticated upload" on storage.objects;
create policy "report photos authenticated upload" on storage.objects for insert to authenticated
with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "report photos authenticated update" on storage.objects;
create policy "report photos authenticated update" on storage.objects for update to authenticated
using (bucket_id = 'report-photos' and owner_id = auth.uid()::text)
with check (bucket_id = 'report-photos' and owner_id = auth.uid()::text);

drop policy if exists "report photos authenticated delete" on storage.objects;
create policy "report photos authenticated delete" on storage.objects for delete to authenticated
using (bucket_id = 'report-photos' and (owner_id = auth.uid()::text or public.is_admin()));

-- Realtime for live updates.
-- If these tables are already in supabase_realtime, the statements below may report
-- that they are already members; that is harmless.

do $$ begin alter publication supabase_realtime add table public.reports; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.report_stills; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.events; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.rsvps; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.kit_requests; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.kit_ledger; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; end $$;

-- After creating your first account, replace YOUR_USER_UUID below with its auth.users id
-- if you want that account to manage kit stock and requests.
-- update public.profiles set is_admin = true where id = 'YOUR_USER_UUID';


-- =====================================================================
-- PART 2 of 3 – security fixes, limits, good news
-- =====================================================================
-- JSN patch v3. Run ONCE in Supabase SQL Editor AFTER supabase_schema.sql.
-- Fixes two bugs in the first schema and adds the good-news table.

-- 1) SECURITY: stop people making themselves admin through the API.
--    (Without this, anyone could run: update profiles set is_admin = true where id = <their id>.)
--    Admins are still set by you in the SQL editor (auth.uid() is null there).
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then new.is_admin := false; else new.is_admin := old.is_admin; end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_t on public.profiles;
create trigger profiles_guard_t before insert or update on public.profiles
  for each row execute function public.profiles_guard();
alter table public.profiles drop constraint if exists profiles_name_len;
alter table public.profiles add constraint profiles_name_len check (char_length(name) between 1 and 20);

-- 2) Anyone signed in can mark a report cleaned, but cannot change anything else.
--    (The first schema only let the reporter do this, so "Mark cleaned" failed for everyone else.)
alter table public.reports add column if not exists created_at timestamptz not null default now();
drop policy if exists "reports mark cleaned" on public.reports;
create policy "reports mark cleaned" on public.reports for update to authenticated using (true) with check (true);
create or replace function public.reports_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.reports where by_user = new.by_user and created_at > now() - interval '20 seconds') then
      raise exception 'Please wait a few seconds between reports';
    end if;
    return new;
  end if;
  if auth.uid() is not null and auth.uid() <> old.by_user and not public.is_admin() then
    if (to_jsonb(new) - 'cleaned' - 'cleaned_t' - 'cleaned_by') <> (to_jsonb(old) - 'cleaned' - 'cleaned_t' - 'cleaned_by') then
      raise exception 'You can only mark reports cleaned';
    end if;
    if new.cleaned and new.cleaned_by is distinct from auth.uid() then raise exception 'cleaned_by must be you'; end if;
  end if;
  return new;
end $$;
drop trigger if exists reports_guard_t on public.reports;
create trigger reports_guard_t before insert or update on public.reports
  for each row execute function public.reports_guard();

-- 3) Server-side limits that the browser cannot bypass
alter table public.reports drop constraint if exists reports_limits;
alter table public.reports add constraint reports_limits check (lat between 49.8 and 58.9 and lon between -8.7 and 2
  and cat in ('litter','bags','flytip','glass','hazard') and char_length(note) <= 200);
alter table public.kit_requests drop constraint if exists requests_limits;
alter table public.kit_requests add constraint requests_limits check (item in ('bags','gloves','picker') and char_length(note) <= 120);
alter table public.kit_ledger drop constraint if exists ledger_limits;
alter table public.kit_ledger add constraint ledger_limits check (item in ('bags','gloves','picker'));
alter table public.events drop constraint if exists events_limits;
alter table public.events add constraint events_limits check (char_length(title) between 1 and 80 and char_length(loc) between 1 and 80);

-- 4) Good news: anyone signed in can post; the author or an admin can remove a post.
create table if not exists public.good_news (
  id text primary key check (id ~ '^[A-Za-z0-9_.-]{1,100}$'),
  title text not null check (char_length(title) between 3 and 80),
  body text not null check (char_length(body) between 10 and 600),
  name text not null default 'Volunteer',
  by_user uuid not null references auth.users(id) on delete cascade,
  t bigint not null,
  created_at timestamptz not null default now()
);
alter table public.good_news enable row level security;
drop policy if exists "news public read" on public.good_news;
create policy "news public read" on public.good_news for select using (true);
drop policy if exists "news authenticated insert" on public.good_news;
create policy "news authenticated insert" on public.good_news for insert to authenticated with check (by_user = auth.uid());
drop policy if exists "news owner or admin delete" on public.good_news;
create policy "news owner or admin delete" on public.good_news for delete to authenticated using (by_user = auth.uid() or public.is_admin());
create or replace function public.news_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.good_news where by_user = new.by_user and created_at > now() - interval '30 seconds') then
    raise exception 'Please wait before posting again';
  end if;
  new.name := coalesce((select name from public.profiles where id = new.by_user), 'Volunteer');  -- cannot pose as someone else
  return new;
end $$;
drop trigger if exists news_guard_t on public.good_news;
create trigger news_guard_t before insert on public.good_news for each row execute function public.news_guard();
do $$ begin alter publication supabase_realtime add table public.good_news; exception when duplicate_object then null; end $$;


-- =====================================================================
-- PART 3 of 3 – total raised (donations)
-- =====================================================================
-- JSN patch v4. Run ONCE in Supabase SQL Editor AFTER supabase_patch_v3.sql.
-- Adds the "Total raised" figure on the Donate tab.
-- Admins record each donation on the site; everyone can see the total.

create table if not exists public.donations (
  id text primary key check (id ~ '^[A-Za-z0-9_.-]{1,100}$'),
  pence integer not null check (pence > 0 and pence <= 10000000),   -- amount in pence (max £100,000 per entry)
  note text not null default '' check (char_length(note) <= 120),
  by_user uuid references auth.users(id) on delete set null,
  t bigint not null,
  created_at timestamptz not null default now()
);
alter table public.donations enable row level security;
drop policy if exists "donations public read" on public.donations;
create policy "donations public read" on public.donations for select using (true);
drop policy if exists "donations admin insert" on public.donations;
create policy "donations admin insert" on public.donations for insert to authenticated
  with check (public.is_admin() and by_user = auth.uid());
drop policy if exists "donations admin delete" on public.donations;
create policy "donations admin delete" on public.donations for delete to authenticated using (public.is_admin());
do $$ begin alter publication supabase_realtime add table public.donations; exception when duplicate_object then null; end $$;

-- To remove a donation entered by mistake: Table Editor -> donations -> delete the row.


-- =====================================================================
-- DONE. Next: Authentication -> Providers -> Email -> switch OFF "Confirm email".
-- To make yourself admin later (after creating your account on the site),
-- remove the two dashes at the start of the line below, put in your user id, and run just that line:
-- update public.profiles set is_admin = true where id = 'YOUR_USER_UUID';
