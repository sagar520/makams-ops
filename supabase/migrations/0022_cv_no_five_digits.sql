-- ============================================================
-- Makams Ops — 0022: CV numbers are MI + 5 digits
--   The HR workbook already runs MI00001 … MI00466, so the app
--   has to speak the same format and carry on from the top of
--   whatever is in the table.
-- ============================================================

create or replace function public.next_cv_no()
returns text language sql volatile set search_path = public as $$
  select 'MI' || lpad(nextval('public.prospective_cv_seq')::text, 5, '0')
$$;

-- widen any 4-digit numbers the app handed out before this change,
-- then park the sequence above the highest number on the table.
update public.prospectives
   set cv_no = 'MI' || lpad(regexp_replace(cv_no, '\D', '', 'g'), 5, '0')
 where cv_no ~ '^MI\d{1,4}$';

select setval('public.prospective_cv_seq',
  greatest((select coalesce(max(nullif(regexp_replace(cv_no, '\D', '', 'g'), ''))::bigint, 0)
              from public.prospectives), 1), true);
