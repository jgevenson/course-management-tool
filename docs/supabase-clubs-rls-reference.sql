-- AI assisted development
-- Reference: apply in Supabase SQL editor if RLS is not yet enabled on public.clubs.
-- Assumes profiles.id = auth.users.id and clubs.user_id references profiles(id).

alter table public.clubs enable row level security;

-- Drop existing policies if re-running (optional — comment out if first run)
-- drop policy if exists "clubs_select_own" on public.clubs;
-- drop policy if exists "clubs_insert_own" on public.clubs;
-- drop policy if exists "clubs_update_own" on public.clubs;

create policy "clubs_select_own"
  on public.clubs for select
  using (user_id = auth.uid());

create policy "clubs_insert_own"
  on public.clubs for insert
  with check (user_id = auth.uid());

create policy "clubs_update_own"
  on public.clubs for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Optional: enforce carry <= total at database level
-- alter table public.clubs add constraint clubs_carry_lte_total
--   check (carry_distance <= total_distance);
