-- Trigger functions are internal only; approval RPC is authenticated-only.
revoke execute on function public.handle_verification_request_status() from anon, authenticated;
revoke execute on function public.protect_verification_fields() from anon, authenticated;
revoke execute on function public.review_verification_request(uuid,text,text) from anon;
grant execute on function public.review_verification_request(uuid,text,text) to authenticated;
