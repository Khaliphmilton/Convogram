-- Android push notification device registration for Convogram
create table if not exists public.push_device_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null default 'android' check (platform in ('android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists idx_push_device_tokens_user_id
  on public.push_device_tokens(user_id);

alter table public.push_device_tokens enable row level security;

drop policy if exists "Users manage own push tokens" on public.push_device_tokens;
create policy "Users manage own push tokens"
  on public.push_device_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
