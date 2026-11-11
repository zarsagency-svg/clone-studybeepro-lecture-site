create table public.lecture_visitor_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visitor_id uuid not null,
  sender_name text,
  message text not null check (char_length(message) between 1 and 2000),
  source text not null default 'xhashikstudy-nt',
  read_at timestamptz,
  check (sender_name is null or char_length(sender_name) <= 80)
);
alter table public.lecture_visitor_messages enable row level security;
revoke all on table public.lecture_visitor_messages from anon, authenticated, public;
create index lecture_visitor_messages_visitor_time_idx on public.lecture_visitor_messages(visitor_id, created_at desc);
create function public.lecture_submit_visitor_message(p_visitor_id uuid, p_message text, p_sender_name text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_message text := btrim(p_message); v_name text := nullif(btrim(p_sender_name), '');
begin
 if p_visitor_id is null or v_message is null or char_length(v_message) < 1 or char_length(v_message) > 2000 or (v_name is not null and char_length(v_name) > 80) then
   raise exception 'Invalid message';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_visitor_id::text, 0));
 if exists (select 1 from public.lecture_visitor_messages where visitor_id = p_visitor_id and created_at > now() - interval '60 seconds') then
   raise exception 'Please wait one minute before sending another message';
 end if;
 insert into public.lecture_visitor_messages(visitor_id, sender_name, message) values (p_visitor_id, v_name, v_message);
end;
$$;
revoke all on function public.lecture_submit_visitor_message(uuid,text,text) from public;
grant execute on function public.lecture_submit_visitor_message(uuid,text,text) to anon, authenticated;
