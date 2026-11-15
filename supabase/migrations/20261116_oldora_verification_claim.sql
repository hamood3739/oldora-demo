-- OLDORA: atomically claim queued verification jobs for trusted backend.
-- Safe staging: no products are published or modified.
begin;
create or replace function public.oldora_claim_verification_jobs(p_limit integer default 10)
returns table(product_id bigint, attempt_count integer)
language plpgsql security definer set search_path = ''
as $$
begin
 if current_user not in ('postgres','service_role') then
   raise exception 'Trusted backend required';
 end if;
 if p_limit is null or p_limit < 1 or p_limit > 50 then
   raise exception 'Limit must be between 1 and 50';
 end if;
 return query
 with picked as (
   select j.product_id
   from public.oldora_verification_jobs j
   where j.state='queued'
   order by j.created_at, j.product_id
   for update skip locked
   limit p_limit
 )
 update public.oldora_verification_jobs j
 set state='checking', attempt_count=j.attempt_count+1, updated_at=now()
 from picked
 where j.product_id=picked.product_id
 returning j.product_id,j.attempt_count;
end;
$$;
revoke all on function public.oldora_claim_verification_jobs(integer) from public,anon,authenticated;
grant execute on function public.oldora_claim_verification_jobs(integer) to service_role;
commit;
