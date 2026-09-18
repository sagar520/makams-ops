-- ============================================================
-- Makams Ops — 0015: prospectives carry a department
--   Sales · PMT · Marketing · Doctor · Other HO Functions · Other
--   Only Sales prospectives are mirrored into the Candidates DB.
-- ============================================================

alter table public.prospectives add column if not exists department text not null default 'Sales';

alter table public.prospectives drop constraint if exists prospectives_department_check;
alter table public.prospectives add constraint prospectives_department_check
  check (department in ('Sales', 'PMT', 'Marketing', 'Doctor', 'Other HO Functions', 'Other'));

create index if not exists prospectives_department_idx on public.prospectives (department);

-- the mirror only covers the sales pipeline
create or replace function public.tg_prospective_to_candidate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.candidate_id is not null then return new; end if;   -- came FROM the Candidates DB
  if coalesce(new.department, 'Sales') <> 'Sales' then return new; end if;

  perform public.ensure_candidate(
    new.full_name, new.contact, new.designation, new.area,
    'CRIL', 'CRIL HR', 'Prospective'
  );
  return new;
end $$;
