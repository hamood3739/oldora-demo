-- Corrects the prior mismatch: the browser stores photos under seller UUID / upload UUID,
-- whereas products.id is a numeric database ID. No photos are changed.
-- OLDORA listing readiness checks: storage path correction
-- READ-ONLY: this migration never approves, publishes, or verifies age.
-- Run in Supabase SQL Editor only after review.
begin;
create or replace function public.oldora_listing_readiness(p_product_id bigint)
returns table(check_name text, passed boolean, detail text)
language plpgsql security invoker set search_path = ''
as $$
declare p public.products%rowtype; photos jsonb; n int; valid_paths boolean; expected_age int;
begin
 select * into p from public.products where id=p_product_id and seller_id=auth.uid();
 if not found then raise exception 'Listing not found or access denied'; end if;
 photos := case when jsonb_typeof(p.image_urls)='array' then p.image_urls else '[]'::jsonb end;
 n := jsonb_array_length(photos);
 expected_age := extract(year from current_date)::int - p.manufacture_year;
 return query select 'Required details'::text,
   (nullif(btrim(coalesce(p.title,'')),'') is not null
    and nullif(btrim(coalesce(p.description,'')),'') is not null
    and p.price > 0 and nullif(btrim(coalesce(p.category,'')),'') is not null
    and nullif(btrim(coalesce(p.condition,'')),'') is not null
    and nullif(btrim(coalesce(p.country_of_origin,'')),'') is not null
    and nullif(btrim(coalesce(p.materials,'')),'') is not null),
   'Title, description, positive price, category, condition, origin and materials must be present'::text;
 return query select 'Age and year consistency'::text,
   (p.item_age is not null and p.manufacture_year is not null and
    p.item_age >= case when p.category='Modern Collectibles' then 15 else 20 end
    and (p.category <> 'Modern Collectibles' or p.item_age between 15 and 19)
    and p.manufacture_year <= extract(year from current_date)::int - case when p.category='Modern Collectibles' then 15 else 20 end
    and abs(expected_age-p.item_age)<=1),
   'Checks claimed age against claimed manufacture year; does not authenticate the item'::text;
 return query select 'Restoration disclosure'::text,
   (nullif(btrim(coalesce(p.restoration_repairs,'')),'') is not null),
   'Repairs, restoration, or Unknown must be disclosed'::text;
 return query select 'Photo count'::text,(n between 5 and 10),
   'Provide 5 to 10 photographs'::text;
 select coalesce(bool_and(
    jsonb_typeof(v.value)='string' and
    (v.value #>> '{}') ~ ('^' || p.seller_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+[.](jpg|jpeg|png|webp)$') and
    (v.value #>> '{}') not like '%..%' and
    (v.value #>> '{}') not like '%://%'
 ),false) into valid_paths
 from jsonb_array_elements(photos) v(value);
 return query select 'Photo path format'::text,
   (n between 5 and 10 and valid_paths and p.image_path is not null and photos ? p.image_path),
   'Checks paths under seller-owned UUID upload folders; does not prove files exist or match the item'::text;
end $$;
revoke all on function public.oldora_listing_readiness(bigint) from public,anon;
grant execute on function public.oldora_listing_readiness(bigint) to authenticated;
commit;
