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
alter publication supabase_realtime add table public.good_news;
