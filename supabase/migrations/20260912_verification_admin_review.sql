-- Verification review is restricted to the Convogram admin email.
create or replace function public.review_verification_request(
  p_request_id uuid,
  p_decision text,
  p_notes text default null
)
returns public.verification_requests
language plpgsql security definer set search_path = public as $$
declare
  v_request public.verification_requests;
begin
  if lower(coalesce(auth.jwt()->>'email','')) <> 'khaliphindustries@gmail.com' then
    raise exception 'Only Convogram verification administrators can review requests';
  end if;
  if p_decision not in ('verified','rejected') then
    raise exception 'Decision must be verified or rejected';
  end if;
  update public.verification_requests
    set status=p_decision, admin_notes=p_notes, reviewed_at=now(), reviewed_by=auth.uid()
    where id=p_request_id
    returning * into v_request;
  if not found then raise exception 'Verification request not found'; end if;
  if p_decision='verified' then
    update public.profiles
      set is_verified=true, verified_at=now(), verification_status='verified', verification_type=v_request.verification_type
      where id=v_request.user_id;
  else
    update public.profiles set is_verified=false, verification_status='rejected'
      where id=v_request.user_id and coalesce(is_verified,false)=false;
  end if;
  return v_request;
end;
$$;

grant execute on function public.review_verification_request(uuid,text,text) to authenticated;
