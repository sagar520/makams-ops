-- ============================================================
-- Makams Ops — 0016: admins can revoke and delete staff accounts
--   * revoke  — the account can no longer sign in; the row stays,
--               so everything they created keeps its author
--   * delete  — only for rows with no history behind them (an invite
--               that was never used, a mistake). Otherwise it refuses
--               and tells you to revoke instead.
-- ============================================================

create or replace function public.revoke_app_user(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('admin') then raise exception 'Admins only'; end if;
  if p_id = public.current_app_user_id() then raise exception 'You cannot revoke your own access'; end if;

  update public.app_users
     set active = false,
         auth_id = null          -- frees the email to be re-invited later
   where id = p_id;
end $$;

create or replace function public.restore_app_user(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('admin') then raise exception 'Admins only'; end if;
  update public.app_users set active = true where id = p_id;
end $$;

create or replace function public.delete_app_user(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_refs int;
begin
  if not public.has_role('admin') then raise exception 'Admins only'; end if;
  if p_id = public.current_app_user_id() then raise exception 'You cannot delete your own account'; end if;

  select coalesce(full_name, email) into v_name from public.app_users where id = p_id;
  if v_name is null then raise exception 'That user no longer exists'; end if;

  -- anything they authored or are assigned to?
  select
    (select count(*) from public.purchase_orders   where created_by = p_id)
  + (select count(*) from public.po_approval_steps where approver_id = p_id)
  + (select count(*) from public.po_events         where actor_id = p_id)
  + (select count(*) from public.candidates        where created_by = p_id)
  + (select count(*) from public.prospectives      where created_by = p_id)
  + (select count(*) from public.people            where created_by = p_id)
    into v_refs;

  if v_refs > 0 then
    raise exception '% has % record(s) against their name — revoke their access instead, so the history keeps its author', v_name, v_refs;
  end if;

  delete from public.app_users where id = p_id;
end $$;

grant execute on function public.revoke_app_user(uuid)  to authenticated;
grant execute on function public.restore_app_user(uuid) to authenticated;
grant execute on function public.delete_app_user(uuid)  to authenticated;
