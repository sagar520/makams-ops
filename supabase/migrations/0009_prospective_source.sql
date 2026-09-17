-- ============================================================
-- Makams Ops — 0009: prospective source
-- Where the prospective came from: LI / Indeed, Internal
-- Referral, or Other.
-- ============================================================

alter table public.prospectives
  add column if not exists source text not null default 'Other'
    check (source in ('LI / Indeed', 'Internal Referral', 'Other'));

create index if not exists prospectives_source_idx on public.prospectives (source);
