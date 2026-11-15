-- OLDORA: recover abandoned verification claims, without publishing anything.
-- Trusted backend only. A failed precheck is NOT automatically retried.
begin;
create or replace function public.oldora_requeue_stale_verification(
  p_stale_minutes integer default 30,
  p_limit integer default 25
) returns integer
language plpgsql security definer set search_path = ''
as $$
declare n integer;
begin
  if current_user not in ('postgres','service_role') then
    raise exception 'Trusted backend required';
  end if;
  if p_stale_minutes is null or p_stale_minutes < 10 or p_stale_minutes > 1440
     or p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Invalid recovery limits';
  end if;
  with stale as (
    select j.product_id from public.oldora_verification_jobs j
    join public.products p on p.id=j.product_id
    where j.state='checking'
      and j.updated_at < now() - make_interval(mins => p_stale_minutes)
      and j.attempt_count < 3
      and p.status='pending' and coalesce(p.age_verified,false)=false
    order by j.updated_at
    for update of j skip locked
    limit p_limit
  ), recovered as (
    update public.oldora_verification_jobs j
       set state='queued',
           last_error='Interrupted check: automatically requeued',
           updated_at=now()
      from stale
     where j.product_id=stale.product_id
     returning j.product_id
  )
  select count(*) into n from recovered;
  return n;
end;
$$;
revoke all on function public.oldora_requeue_stale_verification(integer,integer) from public,anon,authenticated;
grant execute on function public.oldora_requeue_stale_verification(integer,integer) to service_role;
commit;
