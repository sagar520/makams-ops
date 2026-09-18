-- ============================================================
-- Makams Ops — 0020: prospectives get a division and a CV number
--   * division: Poultry · Cattle · HO · Manufacturing (optional)
--   * department gains QC and Manufacturing
--   * cv_no: a unique running ID, MI0001 upwards, assigned on
--     insert by a trigger so every path gets one (manual entry,
--     the Candidates DB pick, anything added later)
-- ============================================================

-- ---------- division ----------

alter table public.prospectives add column if not exists division text;

alter table public.prospectives drop constraint if exists prospectives_division_check;
alter table public.prospectives add constraint prospectives_division_check
  check (division is null or division in ('Poultry', 'Cattle', 'HO', 'Manufacturing'));

create index if not exists prospectives_division_idx on public.prospectives (division);

-- ---------- department: two more ----------

alter table public.prospectives drop constraint if exists prospectives_department_check;
alter table public.prospectives add constraint prospectives_department_check
  check (department in ('Sales', 'PMT', 'Marketing', 'Doctor', 'QC', 'Manufacturing',
                        'Other HO Functions', 'Other'));

-- ---------- CV number ----------

alter table public.prospectives add column if not exists cv_no text;

create sequence if not exists public.prospective_cv_seq as bigint start with 1 increment by 1;

create or replace function public.next_cv_no()
returns text language sql volatile set search_path = public as $$
  select 'MI' || lpad(nextval('public.prospective_cv_seq')::text, 4, '0')
$$;

create or replace function public.tg_prospective_cv_no()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.cv_no is null or btrim(new.cv_no) = '' then
    new.cv_no := public.next_cv_no();
  end if;
  return new;
end $$;

drop trigger if exists set_cv_no on public.prospectives;
create trigger set_cv_no before insert on public.prospectives
  for each row execute function public.tg_prospective_cv_no();

-- backfill the rows that are already on the sheet, oldest first,
-- then push the sequence past whatever was handed out.
do $$
declare r record; n bigint := 0;
begin
  for r in select id from public.prospectives where cv_no is null order by created_at, id loop
    n := nextval('public.prospective_cv_seq');
    update public.prospectives set cv_no = 'MI' || lpad(n::text, 4, '0') where id = r.id;
  end loop;
end $$;

create unique index if not exists prospectives_cv_no_key on public.prospectives (cv_no);
alter table public.prospectives alter column cv_no set not null;
