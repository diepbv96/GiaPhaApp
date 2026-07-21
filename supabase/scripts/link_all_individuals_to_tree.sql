-- One-off data fix: add every existing individual (cá thể) as a member of the family
-- tree 11cbe3be-585c-41fc-a801-be86bbfb98fd, in addition to whatever tree(s) they
-- already belong to (via individual_tree_memberships, migration 0017). Safe to
-- re-run — `on conflict do nothing` skips anyone already linked to this tree.

do $$
begin
  if not exists (select 1 from public.family_trees where id = '11cbe3be-585c-41fc-a801-be86bbfb98fd') then
    raise exception 'Family tree 11cbe3be-585c-41fc-a801-be86bbfb98fd does not exist';
  end if;
end $$;

insert into public.individual_tree_memberships (individual_id, family_tree_id)
select id, '11cbe3be-585c-41fc-a801-be86bbfb98fd'
from public.individuals
on conflict (individual_id, family_tree_id) do nothing;
