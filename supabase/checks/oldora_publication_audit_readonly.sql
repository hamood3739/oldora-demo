-- OLDORA publication audit: READ ONLY. No rows are modified.
-- Run in Supabase SQL Editor with an administrator account.
-- Reports counts, not personal data or private image paths.
with metrics as (
 select 'Published without age verification'::text as check_name,
        count(*)::bigint as affected
 from public.products
 where status='published' and age_verified is distinct from true
 union all
 select 'Verified but not published'::text,
        count(*)::bigint
 from public.products
 where age_verified is true and status is distinct from 'published'
 union all
 select 'Published with missing essential fields'::text,
        count(*)::bigint
 from public.products
 where status='published'
   and (nullif(btrim(coalesce(title,'')),'') is null
     or nullif(btrim(coalesce(description,'')),'') is null
     or price is null or price <= 0
     or nullif(btrim(coalesce(restoration_repairs,'')),'') is null)
 union all
 select 'Published with inconsistent claimed age'::text,
        count(*)::bigint
 from public.products
 where status='published'
   and (item_age is null or manufacture_year is null
     or (category='Retro Collectibles' and (item_age < 15 or item_age > 19))
     or (category is distinct from 'Retro Collectibles' and item_age < 20)
     or abs((extract(year from current_date)::int-manufacture_year)-item_age)>1)
 union all
 select 'Pending listings'::text, count(*)::bigint
 from public.products where status='pending'
 union all
 select 'Published listings'::text, count(*)::bigint
 from public.products where status='published'
)
select check_name, affected,
 case when check_name in ('Pending listings','Published listings') then 'INFO'
      when affected=0 then 'PASS' else 'REVIEW REQUIRED' end as result
from metrics order by check_name;
