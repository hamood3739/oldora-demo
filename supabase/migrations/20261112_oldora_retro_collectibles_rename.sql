-- OLDORA: migrate Modern Collectibles to Retro Collectibles.
-- Run once in Supabase SQL Editor. Transaction rolls back if any statement fails.
-- Does not change prices, images, seller IDs, publication status, or verification.
begin;

create or replace function public.oldora_validate_product_age()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  min_age integer;
  calendar_age integer;
begin
  if new.category is null or pg_catalog.btrim(new.category) = '' then
    raise exception 'Select a category.';
  end if;

  if new.category in ('Modern Collectibles', 'Retro Collectibles') then
    min_age := 15;
    if new.item_age is null or new.item_age < 15 or new.item_age > 19 then
      raise exception 'Retro Collectibles requires an item age of 15 to 19 years.';
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
  if pg_catalog.abs(calendar_age - new.item_age) > 1 then
    raise exception 'Item age and manufacture year do not agree.';
  end if;

  return new;
end;
$$;

-- Preserve other columns and all listing statuses. If a category constraint blocks
-- the rename, the transaction fails and no changes are committed.
update public.products
set category = 'Retro Collectibles'
where category = 'Modern Collectibles';

commit;

-- Optional read-only verification after successful execution:
-- select category, count(*) from public.products
-- where category in ('Modern Collectibles', 'Retro Collectibles')
-- group by category;
