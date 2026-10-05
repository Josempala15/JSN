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
alter publication supabase_realtime add table public.donations;

-- To remove a donation entered by mistake: Table Editor -> donations -> delete the row.
