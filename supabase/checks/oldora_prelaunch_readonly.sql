-- OLDORA PRE-LAUNCH DIAGNOSTIC. READ ONLY. Run in Supabase SQL Editor.
-- Returns PASS / FAIL / NOT INSTALLED; it does not change any data.
-- Results must be reviewed before any verification worker is enabled.
with checks as (
  select 'Products RLS enabled'::text as name,
    coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='products'),false) as passed
  union all
  select 'Seller publication guard installed',
    exists (select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname='products'
      and t.tgname='oldora_guard_seller_publication' and not t.tgisinternal and t.tgenabled<>'D')
  union all
  select 'Verification queue installed',
    to_regclass('public.oldora_verification_jobs') is not null
  union all
  select 'Verification event log installed',
    to_regclass('public.oldora_verification_events') is not null
  union all
  select 'Queue RLS enabled',
    coalesce((select c.relrowsecurity from pg_class c where c.oid=to_regclass('public.oldora_verification_jobs')),false)
  union all
  select 'Events RLS enabled',
    coalesce((select c.relrowsecurity from pg_class c where c.oid=to_regclass('public.oldora_verification_events')),false)
  union all
  select 'Queue function installed',
    to_regprocedure('public.oldora_queue_pending_verification(integer)') is not null
  union all
  select 'Atomic claim function installed',
    to_regprocedure('public.oldora_claim_verification_jobs(integer)') is not null
  union all
  select 'Recovery function installed',
    to_regprocedure('public.oldora_requeue_stale_verification(integer,integer)') is not null
  union all
  select 'Queue RPC not executable by authenticated',
    case when to_regprocedure('public.oldora_queue_pending_verification(integer)') is null then false
    else not has_function_privilege('authenticated','public.oldora_queue_pending_verification(integer)','EXECUTE') end
  union all
  select 'Claim RPC not executable by authenticated',
    case when to_regprocedure('public.oldora_claim_verification_jobs(integer)') is null then false
    else not has_function_privilege('authenticated','public.oldora_claim_verification_jobs(integer)','EXECUTE') end
  union all
  select 'Recovery RPC not executable by authenticated',
    case when to_regprocedure('public.oldora_requeue_stale_verification(integer,integer)') is null then false
    else not has_function_privilege('authenticated','public.oldora_requeue_stale_verification(integer,integer)','EXECUTE') end
  union all
  select 'Authenticated cannot insert queue jobs',
    not has_table_privilege('authenticated','public.oldora_verification_jobs','INSERT')
    -- Missing relation yields NULL; COALESCE below marks it as failed.
  union all
  select 'Authenticated cannot update queue jobs',
    not has_table_privilege('authenticated','public.oldora_verification_jobs','UPDATE')
  union all
  select 'Authenticated cannot delete queue jobs',
    not has_table_privilege('authenticated','public.oldora_verification_jobs','DELETE')
)
select name, case when coalesce(passed,false) then 'PASS' else 'FAIL / NOT INSTALLED' end as result
from checks order by name;
