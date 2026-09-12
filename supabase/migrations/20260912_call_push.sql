create table if not exists public.notification_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text,
  auth text,
  platform text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_devices enable row level security;
drop policy if exists "users manage own notification devices" on public.notification_devices;
create policy "users manage own notification devices" on public.notification_devices for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists notification_devices_user_id_idx on public.notification_devices(user_id);

create table if not exists public.call_sessions (
  call_id text primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  caller_id uuid not null references public.profiles(id) on delete cascade,
  callee_id uuid not null references public.profiles(id) on delete cascade,
  call_type text not null check (call_type in ('voice','video')),
  offer jsonb not null,
  status text not null default 'ringing' check (status in ('ringing','answered','declined','ended')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 minutes')
);

alter table public.call_sessions enable row level security;
drop policy if exists "call participants can read calls" on public.call_sessions;
create policy "call participants can read calls" on public.call_sessions for select to authenticated using (auth.uid() = caller_id or auth.uid() = callee_id);
drop policy if exists "callers can create calls" on public.call_sessions;
create policy "callers can create calls" on public.call_sessions for insert to authenticated with check (auth.uid() = caller_id);
drop policy if exists "call participants can update calls" on public.call_sessions;
create policy "call participants can update calls" on public.call_sessions for update to authenticated using (auth.uid() = caller_id or auth.uid() = callee_id) with check (auth.uid() = caller_id or auth.uid() = callee_id);
create index if not exists call_sessions_callee_status_idx on public.call_sessions(callee_id, status, expires_at);
