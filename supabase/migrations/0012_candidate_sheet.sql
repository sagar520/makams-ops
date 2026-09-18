-- ============================================================
-- Makams Ops — 0012: candidates come from a Google Sheet
--   * the candidate-intake form kind is retired; the Candidates DB
--     is filled from a sheet tab (and from referral links)
--   * where that sheet lives is a setting, not a secret
-- ============================================================

-- retire candidate_intake: existing forms become plain general forms
update public.form_templates set kind = 'general' where kind = 'candidate_intake';

alter table public.form_templates drop constraint if exists form_templates_kind_check;
alter table public.form_templates add constraint form_templates_kind_check
  check (kind in ('referral','general'));
