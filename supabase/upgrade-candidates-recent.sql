-- ============================================================
-- Makams Ops — UPGRADE: HR always sees the last 15 days in the
-- Candidates DB (location search still gates everything older).
-- Paste into the SQL Editor and Run. Safe to re-run.
-- ============================================================

-- ============================================================
-- Makams Ops — 0019: HR always sees the last 15 days
--   The Candidates DB stays closed to bulk browsing, but rows
--   added or edited in the last 15 days are always visible to
--   HR — that is the live working set, not the whole pool.
-- ============================================================

create index if not exists candidates_recent_idx
  on public.candidates (greatest(created_at, updated_at) desc);

-- Rows created or modified in the last N days (N is capped at 15,
-- so nobody can widen this into a full export).
create or replace function public.recent_candidates(p_days int default 15, p_limit int default 1000)
returns setof public.candidates
language plpgsql stable security definer set search_path = public as $$
declare
  v_days int := least(greatest(coalesce(p_days, 15), 1), 15);
begin
  if not public.has_role('hr') then raise exception 'Not allowed'; end if;

  return query
    select * from public.candidates c
     where c.created_at >= now() - make_interval(days => v_days)
        or c.updated_at >= now() - make_interval(days => v_days)
     order by greatest(c.created_at, c.updated_at) desc
     limit least(greatest(coalesce(p_limit, 1000), 1), 2000);
end $$;

grant execute on function public.recent_candidates(int, int) to authenticated;

select 'Recent window ready: ' || (select count(*) from public.candidates
        where created_at >= now() - interval '15 days'
           or updated_at >= now() - interval '15 days')::text
       || ' candidate rows touched in the last 15 days' as result;

notify pgrst, 'reload schema';
