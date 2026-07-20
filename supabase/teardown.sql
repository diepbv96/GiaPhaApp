-- =============================================================================
-- Teardown: undo everything supabase/bootstrap.sql (or supabase/migrations/*)
-- created, so you can re-run bootstrap.sql against a clean slate.
-- =============================================================================
--
-- DESTRUCTIVE AND IRREVERSIBLE. Run this in the Dashboard SQL Editor only if you
-- want to wipe this project's family-tree data and start over. It:
--   1. Drops the "avatars" bucket's policies. Supabase blocks direct SQL `delete`
--      on storage.objects/storage.buckets ("Use the Storage API instead") — the
--      bucket and any avatar files are left in place. bootstrap.sql's bucket
--      insert uses ON CONFLICT DO NOTHING, so that's safe to re-run as-is. If you
--      also want the bucket/files gone, delete them from Dashboard → Storage →
--      avatars first.
--   2. Drops every table this app created (family trees, individuals,
--      relationships, import history, profiles, event-reminder config/log) — all
--      rows in them are gone.
--   3. Drops the functions/triggers/enum types those tables depended on, so
--      `create table` / `create type` in bootstrap.sql won't fail with
--      "already exists".
--   4. Deletes EVERY Supabase Auth account in this project (Section 5 below) —
--      not just the ones bootstrap.sql created. If you'd rather keep existing
--      sign-ins and only reset app data, delete/comment out Section 5 and
--      remove accounts individually from Dashboard → Authentication instead.
--
-- After this finishes, re-run supabase/bootstrap.sql (with your admin
-- email/password edited in) to recreate the schema and a fresh Admin account.

-- 1) Storage: "avatars" bucket policies only — see header comment for why the
--    bucket/files themselves aren't dropped here.
drop policy if exists avatars_admin_editor_insert on storage.objects;
drop policy if exists avatars_admin_editor_update on storage.objects;
drop policy if exists avatars_admin_editor_delete on storage.objects;

-- 2) App tables (cascade also drops their indexes/triggers/RLS policies)
drop table if exists public.import_row_results cascade;
drop table if exists public.import_batches cascade;
drop table if exists public.relationships cascade;
drop table if exists public.individuals cascade;
-- Explicitly before family_trees: a FK-referencing table's own DROP CASCADE on the
-- table it points to only drops the constraint, not the referencing table itself.
drop table if exists public.family_tree_notification_recipients cascade;
drop table if exists public.event_notification_log cascade;
drop table if exists public.event_notification_config cascade;
drop table if exists public.family_trees cascade;
drop table if exists public.profiles cascade;

-- 3) Trigger on auth.users + helper functions
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.current_role_is(user_role[]) cascade;
drop function if exists public.has_profile() cascade;
drop function if exists public.enforce_family_tree_limit() cascade;
drop function if exists public.set_default_family_tree(uuid) cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.enforce_relationship_same_tree() cascade;
drop function if exists public.slugify_tree_name(text) cascade;
drop function if exists public.generate_unique_tree_slug(text, uuid) cascade;
drop function if exists public.set_family_tree_slug_default() cascade;

-- 4) Enum types (must go last — the functions/columns above depend on these)
drop type if exists person_gender;
drop type if exists date_precision;
drop type if exists relationship_type;
drop type if exists user_role;
drop type if exists import_row_status;
drop type if exists life_event_type;

-- 5) Every Auth account in this project — see the warning in the header comment.
delete from auth.identities;
delete from auth.users;
