-- Storage bucket for individual avatar photos (FR-008). Made public-read: with guest
-- viewing of published trees now supported (0009_public_tree_access.sql), avatar
-- images need to be readable without an authenticated session too. Object paths are
-- namespaced by individual id + upload timestamp, so this is a reasonable tradeoff —
-- readable only to someone who already has the photo's exact object path from the
-- app, not enumerable or listable by a stranger. Writes remain restricted to
-- Admin/Editor via the storage.objects policies below.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_admin_editor_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and public.current_role_is(array['admin', 'editor']::user_role[]));

create policy avatars_admin_editor_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and public.current_role_is(array['admin', 'editor']::user_role[]))
  with check (bucket_id = 'avatars' and public.current_role_is(array['admin', 'editor']::user_role[]));

create policy avatars_admin_editor_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and public.current_role_is(array['admin', 'editor']::user_role[]));
