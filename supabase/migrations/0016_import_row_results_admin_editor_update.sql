-- import_row_results: admin/editor may update rows (specifically, to null out
-- individual_id when the referenced individual is deleted — see
-- specs/005-usability-enhancements/contracts/delete-individual.md). No UPDATE policy
-- existed before this, so that nulling was silently a no-op under RLS.

create policy import_row_results_admin_editor_update on public.import_row_results
  for update to authenticated
  using (public.current_role_is(array['admin', 'editor']::user_role[]))
  with check (public.current_role_is(array['admin', 'editor']::user_role[]));
