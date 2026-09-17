-- ============================================================
-- Makams Ops — 0007: employees follow the learnapp users framework
--   * sales-only workforce: level (sales / ASM / RSM / head office)
--   * HQ + ASM/RSM hierarchy names, same shape as the learnapp
--   * emp_code doubles as the learnapp Employee ID (their login)
-- ============================================================

alter table public.people add column sales_role text not null default 'sales'
  check (sales_role in ('sales','asm','rsm','head_office'));
alter table public.people add column hq_name text;
alter table public.people add column asm_name text;
alter table public.people add column rsm_name text;

-- everyone in this app is sales
update public.people set department = 'Sales';
alter table public.people alter column department set default 'Sales';

-- default was still the pre-rename value
alter table public.people alter column status set default 'joining';

create index people_hq_idx on public.people (hq_name);
