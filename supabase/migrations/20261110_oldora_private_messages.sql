-- OLDORA private conversations: apply in Supabase SQL Editor after reviewing.
-- Does not publish listings or change product policies.
begin;
create table if not exists public.oldora_conversations (
 id uuid primary key default gen_random_uuid(),
 product_id bigint not null references public.products(id) on delete cascade,
 buyer_id uuid not null references auth.users(id) on delete cascade,
 seller_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 constraint oldora_distinct_participants check (buyer_id <> seller_id),
 constraint oldora_unique_buyer_product unique(product_id,buyer_id)
);
create table if not exists public.oldora_messages (
 id bigint generated always as identity primary key,
 conversation_id uuid not null references public.oldora_conversations(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index if not exists oldora_messages_thread_idx on public.oldora_messages(conversation_id,created_at,id);
create index if not exists oldora_conversations_seller_idx on public.oldora_conversations(seller_id,created_at desc);
create index if not exists oldora_conversations_buyer_idx on public.oldora_conversations(buyer_id,created_at desc);
alter table public.oldora_conversations enable row level security;
alter table public.oldora_messages enable row level security;
revoke all on public.oldora_conversations from anon,authenticated;
revoke all on public.oldora_messages from anon,authenticated;
grant select on public.oldora_conversations to authenticated;
grant select,insert on public.oldora_messages to authenticated;
grant usage,select on sequence public.oldora_messages_id_seq to authenticated;
drop policy if exists oldora_conversations_read on public.oldora_conversations;
create policy oldora_conversations_read on public.oldora_conversations for select to authenticated using (buyer_id=(select auth.uid()) or seller_id=(select auth.uid()));
drop policy if exists oldora_messages_read on public.oldora_messages;
create policy oldora_messages_read on public.oldora_messages for select to authenticated using (
 exists(select 1 from public.oldora_conversations c where c.id=conversation_id and (c.buyer_id=(select auth.uid()) or c.seller_id=(select auth.uid())))
);
drop policy if exists oldora_messages_send on public.oldora_messages;
create policy oldora_messages_send on public.oldora_messages for insert to authenticated with check (
 sender_id=(select auth.uid()) and exists (
 select 1 from public.oldora_conversations c join public.products p on p.id=c.product_id
 where c.id=conversation_id and (c.buyer_id=(select auth.uid()) or c.seller_id=(select auth.uid()))
 and p.status='published' and p.age_verified=true
 )
);
create or replace function public.oldora_start_conversation(p_product_id bigint)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_seller uuid; v_id uuid;
begin
 if v_user is null then raise exception 'Sign in to contact the seller'; end if;
 select seller_id into v_seller from public.products
 where id=p_product_id and status='published' and age_verified=true;
 if v_seller is null then raise exception 'This item is not available for messaging'; end if;
 if v_seller=v_user then raise exception 'You cannot message yourself'; end if;
 insert into public.oldora_conversations(product_id,buyer_id,seller_id)
 values(p_product_id,v_user,v_seller)
 on conflict(product_id,buyer_id) do nothing;
 select id into v_id from public.oldora_conversations
 where product_id=p_product_id and buyer_id=v_user and seller_id=v_seller;
 if v_id is null then raise exception 'Unable to open conversation'; end if;
 return v_id;
end $$;
revoke all on function public.oldora_start_conversation(bigint) from public,anon;
grant execute on function public.oldora_start_conversation(bigint) to authenticated;
commit;