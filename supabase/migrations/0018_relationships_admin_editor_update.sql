-- Adds the missing UPDATE policy on relationships (spec 006 FR-010): only select/insert/
-- delete existed before this, so a client-side .update() would silently affect 0 rows.

create policy relationships_admin_editor_update on public.relationships
  for update to authenticated
  using (public.current_role_is(array['admin', 'editor']::user_role[]))
  with check (public.current_role_is(array['admin', 'editor']::user_role[]));
