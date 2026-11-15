-- OLDORA listing closure: READ ONLY preflight. Safe to run in Supabase SQL Editor.
-- Send the results before applying the closure migration if any check is unclear.
select 'products.status column' as check_name,
       coalesce((select data_type || coalesce(' / ' || udt_name,'')
         from information_schema.columns
         where table_schema='public' and table_name='products' and column_name='status'), 'MISSING') as result
union all
select 'products.id column',
       coalesce((select data_type from information_schema.columns
         where table_schema='public' and table_name='products' and column_name='id'), 'MISSING')
union all
select 'products.seller_id column',
       coalesce((select data_type from information_schema.columns
         where table_schema='public' and table_name='products' and column_name='seller_id'), 'MISSING')
union all
select 'products status check: ' || conname,
       pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.products'::regclass and contype='c'
  and pg_get_constraintdef(oid) ilike '%status%'
union all
select 'products status sample values',
       coalesce((select string_agg(status || ': ' || n::text, ', ')
         from (select status::text as status, count(*) n from public.products group by status order by status) x), '(no products)')
order by check_name;
