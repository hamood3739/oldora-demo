-- OLDORA: category-specific age validation (stage 1)
-- Run in Supabase SQL Editor after reviewing. No automatic publication is enabled.
-- This trigger validates newly inserted products and changes to age/category/year.
-- Existing rows are not rewritten.
create or replace function public.oldora_validate_product_age()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  min_age integer;
  calendar_age integer;
begin
  if new.category is null or btrim(new.category) = '' then
    raise exception 'Select a category.';
  end if;
  if new.category = 'Modern Collectibles' then
    min_age := 15;
    if new.item_age is null or new.item_age < 15 or new.item_age > 19 then
      raise exception 'Modern Collectibles requires an item age of 15 to 19 years.';
    end if;
  else
    min_age := 20;
    if new.item_age is null or new.item_age < 20 then
      raise exception 'Classic categories require an item age of at least 20 years.';
    end if;
  end if;

  if new.manufacture_year is null
     or new.manufacture_year < 1000
     or new.manufacture_year > extract(year from current_date)::integer - min_age then
    raise exception 'Manufacture year does not meet the selected category age requirement.';
  end if;

  calendar_age := extract(year from current_date)::integer - new.manufacture_year;
  if abs(calendar_age - new.item_age) > 1 then
    raise exception 'Item age and manufacture year do not agree.';
  end if;

  return new;
end;
$$;

drop trigger if exists oldora_product_age_guard on public.products;
create trigger oldora_product_age_guard
before insert or update of category, item_age, manufacture_year
on public.products
for each row
execute function public.oldora_validate_product_age();

-- IMPORTANT:
-- 1. This checks seller-entered age/year consistency, not actual authenticity.
-- 2. It does not approve items or set age_verified.
-- 3. Secure RLS/privileges and a server-side verification service are still
--    required before enabling automatic publication.
-- 4. Check existing rows and policies separately before any wider migration.
