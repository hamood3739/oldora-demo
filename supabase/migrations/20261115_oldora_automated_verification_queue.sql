-- OLDORA: automated verification queue, phase 1 (safe staging).
-- Does not approve, verify, publish, alter existing listings or expose private images.
begin;
create table if not exists public.oldora_verification_jobs (
  product_id bigint primary key references public.products(id) on delete cascade,
  state text not null default 'queued'
    check (state in ('queued','checking','needs_info','ready_for_evidence','failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  checks jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table if not exists public.oldora_verification_events (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists oldora_verification_jobs_state_idx
  on public.oldora_verification_jobs(state,updated_at);
create index if not exists oldora_verification_events_product_idx
  on public.oldora_verification_events(product_id,created_at desc);
alter table public.oldora_verification_jobs enable row level security;
alter table public.oldora_verification_events enable row level security;
revoke all on public.oldora_verification_jobs from anon,authenticated;
revoke all on public.oldora_verification_events from anon,authenticated;
-- Sellers may inspect their own verification status, but cannot create or edit it.
grant select on public.oldora_verification_jobs to authenticated;
grant select on public.oldora_verification_events to authenticated;
drop policy if exists oldora_verification_jobs_seller_read on public.oldora_verification_jobs;
create policy oldora_verification_jobs_seller_read on public.oldora_verification_jobs
for select to authenticated using (
 exists (select 1 from public.products p where p.id=product_id and p.seller_id=(select auth.uid()))
);
drop policy if exists oldora_verification_events_seller_read on public.oldora_verification_events;
create policy oldora_verification_events_seller_read on public.oldora_verification_events
for select to authenticated using (
 exists (select 1 from public.products p where p.id=product_id and p.seller_id=(select auth.uid()))
);
-- Trusted backend only. Safe to rerun; existing rows stay untouched.
create or replace function public.oldora_queue_pending_verification(p_limit integer default 50)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare n integer;
begin
 if current_user not in ('postgres','service_role') then
   raise exception 'Trusted backend required';
 end if;
 if p_limit is null or p_limit < 1 or p_limit > 500 then
   raise exception 'Limit must be between 1 and 500';
 end if;
 with candidates as (
   select p.id from public.products p
   where p.status='pending' and coalesce(p.age_verified,false)=false
   and not exists(select 1 from public.oldora_verification_jobs j where j.product_id=p.id)
   order by p.id limit p_limit
 ), inserted as (
   insert into public.oldora_verification_jobs(product_id)
   select id from candidates on conflict (product_id) do nothing returning product_id
 )
 select count(*) into n from inserted;
 return n;
end $$;
revoke all on function public.oldora_queue_pending_verification(integer) from public,anon,authenticated;
grant execute on function public.oldora_queue_pending_verification(integer) to service_role;
commit;
