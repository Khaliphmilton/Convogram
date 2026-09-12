-- Protect verification state from normal client updates and mark requests pending.
create or replace function public.handle_verification_request_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set verification_status='pending'
  where id=new.user_id and coalesce(is_verified,false)=false;
  return new;
end;
$$;

drop trigger if exists verification_request_status_trigger on public.verification_requests;
create trigger verification_request_status_trigger
after insert on public.verification_requests
for each row execute function public.handle_verification_request_status();

create or replace function public.protect_verification_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then
    new.is_verified := old.is_verified;
    new.verified_at := old.verified_at;
    new.verification_type := old.verification_type;
    new.verification_status := old.verification_status;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_verification_fields_trigger on public.profiles;
create trigger protect_verification_fields_trigger
before update on public.profiles
for each row execute function public.protect_verification_fields();
