-- OLDORA: align database readiness with the approved minimum of one photo.
-- Read-only check: never changes listings, photos, publication or age verification.
begin;
create or replace function public.oldora_listing_readiness(p_product_id bigint)
returns table(check_name text, passed boolean, detail text)
language plpgsql security invoker set search_path = ''
as $$
declare
  p public.products%rowtype;
  photos jsonb;
  n int;
  valid_paths boolean;
  expected_age int;
begin
  select * into p from public.products
  where id = p_product_id and seller_id = (select auth.uid());
  if not found then raise exception 'Listing not found or access denied'; end if;
  photos := case when jsonb_typeof(p.image_urls) = 'array' then p.image_urls else '[]'::jsonb end;
  n := jsonb_array_length(photos);
  expected_age := extract(year from current_date)::int - p.manufacture_year;

  return query select 'Required details'::text,
    (nullif(btrim(coalesce(p.title,'')),'') is not null
     and nullif(btrim(coalesce(p.description,'')),'') is not null
     and p.price > 0
     and nullif(btrim(coalesce(p.category,'')),'') is not null
     and nullif(btrim(coalesce(p.condition,'')),'') is not null
     and nullif(btrim(coalesce(p.country_of_origin,'')),'') is not null
     and nullif(btrim(coalesce(p.materials,'')),'') is not null),
    'Title, description, price, category, condition, origin and materials required'::text;

  return query select 'Age and year consistency'::text,
    (p.item_age is not null and p.manufacture_year is not null
     and p.item_age >= case when p.category = 'Retro Collectibles' then 15 else 20 end
     and (p.category <> 'Retro Collectibles' or p.item_age between 15 and 19)
     and abs(expected_age - p.item_age) <= 1),
    'Seller-reported age and year consistency only; not independent authentication'::text;

  return query select 'Restoration disclosure'::text,
    (nullif(btrim(coalesce(p.restoration_repairs,'')),'') is not null),
    'Disclose repairs, restoration or Unknown'::text;

  return query select 'Photo count'::text, (n >= 1),
    'At least one genuine product photograph required; extras optional'::text;

  select coalesce(bool_and(
    jsonb_typeof(v.value) = 'string'
    and (v.value #>> '{}') ~ ('^' || p.seller_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+[.](jpg|jpeg|png|webp)$')
    and (v.value #>> '{}') not like '%..%'
    and (v.value #>> '{}') not like '%://%'
  ), false) into valid_paths
  from jsonb_array_elements(photos) v(value);

  return query select 'Photo path format'::text,
    (n >= 1 and valid_paths and p.image_path is not null
     and exists (select 1 from jsonb_array_elements_text(photos) x(path)
                 where x.path = p.image_path)),
    'Seller-owned upload paths and cover reference; existence and authenticity not confirmed'::text;
end $$;
revoke all on function public.oldora_listing_readiness(bigint) from public, anon;
grant execute on function public.oldora_listing_readiness(bigint) to authenticated;
commit;
