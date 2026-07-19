-- Local dev seed data: one sample tree (default + published, so guest/unauthenticated
-- viewing can be exercised immediately) plus admin/editor/viewer test accounts.
-- Run against a local Supabase instance only (`supabase db reset` applies this
-- automatically). Never run against a production project.
--
-- Test credentials (used by tests/e2e/family-tree.spec.ts):
--   admin@giapha.test  / editor@giapha.test  / viewer@giapha.test
--   password: GiaPha!Test123

do $$
declare
  v_admin_id uuid := '00000000-0000-0000-0000-000000000001';
  v_editor_id uuid := '00000000-0000-0000-0000-000000000002';
  v_viewer_id uuid := '00000000-0000-0000-0000-000000000003';
  v_tree_id uuid;
  v_grandfather_id uuid;
  v_grandmother_id uuid;
  v_father_id uuid;
begin
  -- Seed auth.users directly (standard local-dev pattern; the on_auth_user_created
  -- trigger from 0002_profiles.sql fires and creates a matching `profiles` row).
  -- confirmation_token/recovery_token/email_change*/phone_change*/reauthentication_token
  -- are set to '' (not left NULL): GoTrue scans them as plain strings, so a NULL
  -- breaks every query touching that user, including login, with a generic
  -- "Database error querying schema" (see supabase/reset-admin-password.sql).
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values
    (v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'admin@giapha.test', crypt('GiaPha!Test123', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"display_name":"Quản trị viên"}',
     '', '', '', '', '', '', '', ''),
    (v_editor_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'editor@giapha.test', crypt('GiaPha!Test123', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"display_name":"Biên tập viên"}',
     '', '', '', '', '', '', '', ''),
    (v_viewer_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'viewer@giapha.test', crypt('GiaPha!Test123', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"display_name":"Người xem"}',
     '', '', '', '', '', '', '', '')
  on conflict (id) do nothing;

  -- Email/password sign-in also needs a matching auth.identities row — without it
  -- you can get "Invalid login credentials" even with the exact right password.
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now()
  from auth.users u
  where u.id in (v_admin_id, v_editor_id, v_viewer_id)
    and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

  update public.profiles set role = 'admin' where id = v_admin_id;
  update public.profiles set role = 'editor' where id = v_editor_id;
  update public.profiles set role = 'viewer' where id = v_viewer_id;

  insert into public.family_trees (name, is_default, is_public, created_by)
  values ('Gia Phả Dòng Họ Bùi (Mẫu)', true, true, v_admin_id)
  returning id into v_tree_id;

  insert into public.individuals (family_tree_id, full_name, gender, birth_date, birth_date_precision, created_by)
  values (v_tree_id, 'Bùi Văn Tổ', 'male', '1930-01-01', 'year', v_admin_id)
  returning id into v_grandfather_id;

  insert into public.individuals (family_tree_id, full_name, gender, birth_date, birth_date_precision, created_by)
  values (v_tree_id, 'Trần Thị Tổ Mẫu', 'female', '1932-01-01', 'year', v_admin_id)
  returning id into v_grandmother_id;

  insert into public.individuals (family_tree_id, full_name, gender, birth_date, birth_date_precision, notes, created_by)
  values (v_tree_id, 'Bùi Văn Cha', 'male', '1955-01-01', 'year', 'Con trưởng', v_admin_id)
  returning id into v_father_id;

  insert into public.relationships (family_tree_id, type, person_a_id, person_b_id) values
    (v_tree_id, 'spouse', v_grandfather_id, v_grandmother_id),
    (v_tree_id, 'parent_child', v_grandfather_id, v_father_id),
    (v_tree_id, 'parent_child', v_grandmother_id, v_father_id);
end $$;
