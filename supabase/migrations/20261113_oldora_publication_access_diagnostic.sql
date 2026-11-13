-- OLDORA: focused publication-access diagnostic (READ ONLY).
-- No changes to listings, permissions, photos, or users.
-- One narrow column for easier review on iPhone.
select 'RLS products: ' || rowsecurity::text as finding
from pg_tables where schemaname='public' and tablename='products'
union all
select 'SELECT policy [' || policyname || '] roles=' || roles::text ||
       ' using=' || coalesce(qual,'(none)') as finding
from pg_policies
where schemaname='public' and tablename='products' and cmd in ('SELECT','ALL')
union all
select 'UPDATE policy [' || policyname || '] roles=' || roles::text ||
       ' using=' || coalesce(qual,'(none)') ||
       ' check=' || coalesce(with_check,'(none)') as finding
from pg_policies
where schemaname='public' and tablename='products' and cmd in ('UPDATE','ALL')
union all
select 'Status constraint [' || conname || '] ' || pg_get_constraintdef(oid) as finding
from pg_constraint where conrelid='public.products'::regclass and contype='c'
order by finding;
