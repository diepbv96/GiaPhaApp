-- Fixes a real bug hit while testing spec 007/008: deleteIndividual() previously ran
-- three separate requests (null import_row_results.individual_id, then delete
-- individuals) as three separate implicit transactions. In practice this let the
-- final `delete from individuals` fail with `23503` on
-- `import_row_results_individual_id_fkey` even for an individual with zero
-- relationships — a case the client's error handling then wrongly reported as "cá thể
-- này vẫn còn mối quan hệ" (the 23503 catch assumed the only possible referencing
-- table was `relationships`). Consolidating every step into one PL/pgSQL function
-- makes the whole delete a single atomic transaction (same rationale as
-- set_default_family_tree, 0008_family_tree_functions.sql) and means a 23503 from the
-- final delete can now only ever be about `relationships`, since import_row_results is
-- unconditionally cleared earlier in the very same transaction.

create function public.delete_individual_everywhere(target_id uuid, cascade_relationships boolean default false)
returns void
language plpgsql
security invoker
as $$
begin
  if not exists (select 1 from public.individuals where id = target_id) then
    raise exception 'INDIVIDUAL_NOT_FOUND: individual does not exist' using errcode = 'P0002';
  end if;

  if cascade_relationships then
    delete from public.relationships where person_a_id = target_id or person_b_id = target_id;
  end if;

  update public.import_row_results set individual_id = null where individual_id = target_id;

  delete from public.individuals where id = target_id;
end;
$$;

revoke all on function public.delete_individual_everywhere(uuid, boolean) from public;
grant execute on function public.delete_individual_everywhere(uuid, boolean) to authenticated;
