-- set_default_family_tree: atomically unmark the current default and mark a new one
-- (FR-018). Two separate UPDATE statements from the client could momentarily violate
-- the "at most one default" unique index under concurrent admins; doing both updates
-- inside a single function call keeps it a single transaction.

create function public.set_default_family_tree(target_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  if not exists (select 1 from public.family_trees where id = target_id) then
    raise exception 'FAMILY_TREE_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.family_trees set is_default = false where is_default and id <> target_id;
  update public.family_trees set is_default = true where id = target_id;
end;
$$;

revoke all on function public.set_default_family_tree(uuid) from public;
grant execute on function public.set_default_family_tree(uuid) to authenticated;
