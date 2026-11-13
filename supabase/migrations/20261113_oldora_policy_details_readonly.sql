-- OLDORA: compact policy and constraint audit, read-only.
-- Short individual columns to make results readable on iPhone.
select 'SELECT' as kind, policyname as name,
       coalesce(qual,'(none)') as rule
from pg_policies
where schemaname='public' and tablename='products' and cmd in ('SELECT','ALL')
union all
select 'UPDATE', policyname,
       'USING: '||coalesce(qual,'(none)')||' / CHECK: '||coalesce(with_check,'(none)')
from pg_policies
where schemaname='public' and tablename='products' and cmd in ('UPDATE','ALL')
union all
select 'CHECK', conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid='public.products'::regclass and contype='c'
order by kind,name;
