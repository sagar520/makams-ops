-- ============================================================
-- Makams Ops — UPGRADE: referral-form blurb removed, candidate
-- deletion is an admin action.
-- Paste into the SQL Editor and Run. Safe to re-run.
-- ============================================================

-- ============================================================
-- Makams Ops — 0018
--   * the referral form loses its stock blurb
--   * deleting a candidate is an admin action (HR still edits)
-- ============================================================

update public.form_templates
   set description = null
 where kind = 'referral'
   and description = 'Share your details once, then add as many candidates as you like below.';

create or replace function public.delete_candidate(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('admin') then
    raise exception 'Only an admin can delete from the Candidates DB';
  end if;
  delete from public.candidates where id = p_id;
end $$;

grant execute on function public.delete_candidate(uuid) to authenticated;

select 'Referral form blurb: ' || coalesce((select description from public.form_templates where kind='referral' limit 1), '(blank)')
       || ' · candidate delete is now admin-only' as result;

notify pgrst, 'reload schema';
