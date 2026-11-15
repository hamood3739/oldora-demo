-- OLDORA secure listing closure and 2% commission ledger.
-- Run once in Supabase SQL Editor. Preserves existing products.
begin;

-- Extend the known status constraint without discarding existing allowed values.
do $closure$
declare
  v_def text;
  v_expr text;
begin
  select pg_get_constraintdef(c.oid) into v_def
  from pg_constraint c
  where c.conrelid='public.products'::regclass
    and c.conname='valid_product_status' and c.contype='c';
  if v_def is null then
    raise exception 'Expected valid_product_status CHECK constraint not found';
  end if;
  v_expr := substring(v_def from '^CHECK \\((.*)\\)$');
  if v_expr is null then
    raise exception 'Unexpected status CHECK format';
  end if;
  execute 'alter table public.products drop constraint valid_product_status';
  execute 'alter table public.products add constraint valid_product_status check ((' || v_expr || ') or status in (''sold'',''withdrawn''))';
end;
$closure$;

create table if not exists public.oldora_listing_closures (
  product_id bigint primary key references public.products(id) on delete restrict,
  seller_id uuid not null references auth.users(id),
  was_sold boolean not null,
  final_sale_price numeric(14,2),
  commission_rate numeric(5,4) not null default 0.0200,
  commission_amount numeric(14,2) not null default 0,
  commission_status text not null default 'not_due',
  closed_at timestamptz not null default now(),
  constraint oldora_closure_price_check check (
    (was_sold and final_sale_price > 0 and commission_amount = round(final_sale_price * commission_rate, 2) and commission_status = 'due')
    or
    (not was_sold and final_sale_price is null and commission_amount = 0 and commission_status = 'not_due')
  )
);
alter table public.oldora_listing_closures enable row level security;
revoke all on public.oldora_listing_closures from anon, authenticated;
grant select on public.oldora_listing_closures to authenticated;
drop policy if exists oldora_seller_reads_own_closures on public.oldora_listing_closures;
create policy oldora_seller_reads_own_closures on public.oldora_listing_closures
  for select to authenticated using (seller_id = (select auth.uid()));

create or replace function public.oldora_close_listing(
  p_product_id bigint,
  p_was_sold boolean,
  p_sale_price numeric default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seller uuid := auth.uid();
  v_status text;
begin
  if v_seller is null then
    raise exception 'Sign in before closing a listing';
  end if;
  if p_was_sold is null then
    raise exception 'Please answer whether the item was sold';
  end if;
  if p_was_sold then
    if p_sale_price is null or p_sale_price <= 0 or p_sale_price > 999999999999.99
       or p_sale_price <> round(p_sale_price,2) then
      raise exception 'Enter a valid final sale price in SAR';
    end if;
  elsif p_sale_price is not null then
    raise exception 'Do not enter a sale price for an unsold item';
  end if;

  select status into v_status from public.products
    where id = p_product_id and seller_id = v_seller for update;
  if not found then
    raise exception 'Listing not found or access denied';
  end if;
  if exists(select 1 from public.oldora_listing_closures where product_id=p_product_id) then
    raise exception 'Listing has already been closed';
  end if;
  if v_status in ('sold','withdrawn') then
    raise exception 'Listing has already been closed';
  end if;

  insert into public.oldora_listing_closures
    (product_id,seller_id,was_sold,final_sale_price,commission_rate,commission_amount,commission_status)
  values
    (p_product_id,v_seller,p_was_sold,case when p_was_sold then p_sale_price else null end,
     0.0200,case when p_was_sold then round(p_sale_price*0.02,2) else 0 end,
     case when p_was_sold then 'due' else 'not_due' end);

  -- This update must succeed; if the status constraint disallows these values,
  -- the whole transaction rolls back, including the ledger entry.
  update public.products
    set status = case when p_was_sold then 'sold' else 'withdrawn' end
    where id=p_product_id and seller_id=v_seller;
end;
$$;
revoke all on function public.oldora_close_listing(bigint,boolean,numeric) from public,anon;
grant execute on function public.oldora_close_listing(bigint,boolean,numeric) to authenticated;
commit;
