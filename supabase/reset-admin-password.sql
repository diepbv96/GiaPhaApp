-- =============================================================================
-- Reset the Admin account's password (Dashboard SQL Editor)
-- =============================================================================
--
-- Use this if you ran supabase/bootstrap.sql and the Admin account can't sign in
-- even with the "right" password. Two known causes, both fixed here:
--
-- 1. Email/password sign-in expects a matching row in auth.identities — inserting
--    straight into auth.users alone (as bootstrap.sql's original version did)
--    leaves that missing, which shows up as "Invalid login credentials".
-- 2. Several `text` NOT-NULL-in-practice columns on auth.users (confirmation_token,
--    recovery_token, email_change*, phone_change*, reauthentication_token) come out
--    NULL if you don't set them explicitly. GoTrue's Go code scans them as plain
--    strings, so a NULL there breaks *every* query touching that user — including
--    login — with the generic error `{"code":"unexpected_failure","message":
--    "Database error querying schema"}`. This is a very commonly hit issue with
--    hand-written auth.users inserts.
--
-- This script fixes both, plus two other common silent blockers (unconfirmed
-- email, an active ban).
--
-- >>> EDIT v_admin_email / v_new_password BELOW, then run the whole file. <<<

do $$
declare
  v_admin_email text := 'admin@example.com';        -- the account's current email
  v_new_password text := 'ChangeThisPassword123!';  -- the password you want to sign in with
  v_admin_id uuid;
begin
  select id into v_admin_id from auth.users where email = v_admin_email;

  if v_admin_id is null then
    raise exception 'No auth.users row for email %. Check the email, or run bootstrap.sql first.', v_admin_email;
  end if;

  -- 1) Set the new password hash, and repair the NULL text columns that cause
  --    "Database error querying schema" (see header comment).
  update auth.users
  set encrypted_password = crypt(v_new_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()), -- unconfirmed email also blocks login
      banned_until = null,                                       -- clear any ban
      confirmation_token = coalesce(confirmation_token, ''),
      recovery_token = coalesce(recovery_token, ''),
      email_change = coalesce(email_change, ''),
      email_change_token_new = coalesce(email_change_token_new, ''),
      email_change_token_current = coalesce(email_change_token_current, ''),
      phone_change = coalesce(phone_change, ''),
      phone_change_token = coalesce(phone_change_token, ''),
      reauthentication_token = coalesce(reauthentication_token, ''),
      updated_at = now()
  where id = v_admin_id;

  -- 2) Ensure the matching email/password identity row exists (the likely real fix).
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select
    gen_random_uuid(), v_admin_id::text, v_admin_id,
    jsonb_build_object('sub', v_admin_id::text, 'email', v_admin_email),
    'email', now(), now(), now()
  where not exists (
    select 1 from auth.identities where user_id = v_admin_id and provider = 'email'
  );

  raise notice 'Password reset for %.', v_admin_email;
end $$;
