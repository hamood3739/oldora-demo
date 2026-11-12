-- OLDORA: prevent seller self-publication or self-verification.
-- Existing rows and photos are not changed. Trusted backend roles retain control.
begin;

create or replace function public.oldora_guard_seller_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if new.status is distinct from 'pending'
         or new.age_verified is distinct from false
         or new.seller_id is distinct from auth.uid() then
        raise exception 'New listings must be pending and unverified and belong to the seller';
      end if;
    elsif tg_op = 'UPDATE' then
      if new.status is distinct from old.status
         or new.age_verified is distinct from old.age_verified
         or new.seller_id is distinct from old.seller_id then
        raise exception 'Only trusted moderation can change publication, verification or seller ownership';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists oldora_guard_seller_publication on public.products;
create trigger oldora_guard_seller_publication
before insert or update on public.products
for each row execute function public.oldora_guard_seller_publication();

commit;
