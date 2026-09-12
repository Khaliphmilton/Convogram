-- Convogram verification requests and verified badges
alter table public.profiles add column if not exists is_verified boolean not null default false;
alter table public.profiles add column if not exists verified_at timestamptz;
alter table public.profiles add column if not exists verification_type text;
alter table public.profiles add column if not exists verification_status text not null default 'unverified';
alter table public.profiles add constraint profiles_verification_status_check check (verification_status in ('unverified','pending','verified','rejected'));

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  verification_type text not null,
  reason text not null,
  identity_name text,
  website text,
  evidence_url text,
  status text not null default 'pending',
  admin_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

alter table public.verification_requests enable row level security;

create policy "Users can create their own verification requests"
on public.verification_requests for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can view their own verification requests"
on public.verification_requests for select to authenticated
using (auth.uid() = user_id);

create index if not exists verification_requests_user_id_idx on public.verification_requests(user_id);
create index if not exists verification_requests_status_idx on public.verification_requests(status);
