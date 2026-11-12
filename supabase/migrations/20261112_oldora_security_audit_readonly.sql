-- OLDORA pre-launch security audit (READ ONLY)
-- Shows RLS status, product policies and column privileges.
-- Does not change tables, policies, listings or images.
select 'RLS STATUS' as section,
       schemaname, tablename,
       rowsecurity::text as detail,
       null::text as extra
from pg_tables
where schemaname = 'public' and tablename in ('products','oldora_conversations','oldora_messages')
union all
select 'PRODUCT POLICY' as section,
       schemaname, tablename,
       policyname || ' | ' || cmd || ' | ' || roles::text as detail,
       'USING: ' || coalesce(qual,'(none)') || ' | CHECK: ' || coalesce(with_check,'(none)') as extra
from pg_policies
where schemaname = 'public' and tablename = 'products'
union all
select 'PRODUCT COLUMN GRANT' as section,
       table_schema, table_name,
       grantee || ' | ' || column_name || ' | ' || privilege_type as detail,
       null::text as extra
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'products'
  and grantee in ('anon','authenticated')
  and column_name in ('status','age_verified','seller_id','image_path','image_urls')
order by section, tablename, detail;
