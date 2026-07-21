import { supabase } from "@/lib/supabase";
import { mapRelationshipRow, type RelationshipRow } from "@/lib/mappers";
import { DataAccessError, type Relationship, type RelationshipType } from "@/types";

export type RelationshipInput = Omit<Relationship, "id">;

export async function createRelationship(input: RelationshipInput): Promise<Relationship> {
  if (input.personAId === input.personBId) {
    throw new DataAccessError("VALIDATION_FAILED", "Không thể tạo mối quan hệ với chính mình.");
  }

  // spouse/sibling are undirected — check both orderings for an existing duplicate edge.
  if (input.type !== "parent_child") {
    const { data: existing } = await supabase
      .from("relationships")
      .select("id")
      .eq("type", input.type)
      .or(
        `and(person_a_id.eq.${input.personAId},person_b_id.eq.${input.personBId}),` +
          `and(person_a_id.eq.${input.personBId},person_b_id.eq.${input.personAId})`,
      )
      .maybeSingle();

    if (existing) {
      throw new DataAccessError("CONFLICT", "Mối quan hệ này đã tồn tại.");
    }
  }

  const { data, error } = await supabase
    .from("relationships")
    .insert({
      family_tree_id: input.familyTreeId,
      type: input.type,
      person_a_id: input.personAId,
      person_b_id: input.personBId,
    })
    .select("id, family_tree_id, type, person_a_id, person_b_id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      throw new DataAccessError("CONFLICT", "Mối quan hệ này đã tồn tại.");
    }
    if (error?.code === "42501") {
      throw new DataAccessError("PERMISSION_DENIED", "Bạn không có quyền thực hiện thao tác này.");
    }
    throw new DataAccessError("UNKNOWN", "Không thể tạo mối quan hệ.");
  }

  return mapRelationshipRow(data as RelationshipRow);
}

export async function updateRelationship(id: string, type: RelationshipType): Promise<Relationship> {
  const { data: current, error: loadError } = await supabase
    .from("relationships")
    .select("person_a_id, person_b_id")
    .eq("id", id)
    .single();

  if (loadError || !current) {
    throw new DataAccessError("NOT_FOUND", "Không tìm thấy mối quan hệ.");
  }

  // spouse/sibling are undirected — check both orderings for an existing duplicate edge,
  // excluding this row itself (same pre-check as createRelationship).
  if (type !== "parent_child") {
    const { data: existing } = await supabase
      .from("relationships")
      .select("id")
      .eq("type", type)
      .neq("id", id)
      .or(
        `and(person_a_id.eq.${current.person_a_id},person_b_id.eq.${current.person_b_id}),` +
          `and(person_a_id.eq.${current.person_b_id},person_b_id.eq.${current.person_a_id})`,
      )
      .maybeSingle();

    if (existing) {
      throw new DataAccessError("CONFLICT", "Mối quan hệ này đã tồn tại.");
    }
  }

  const { data, error } = await supabase
    .from("relationships")
    .update({ type })
    .eq("id", id)
    .select("id, family_tree_id, type, person_a_id, person_b_id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      throw new DataAccessError("CONFLICT", "Mối quan hệ này đã tồn tại.");
    }
    if (error?.code === "42501") {
      throw new DataAccessError("PERMISSION_DENIED", "Bạn không có quyền thực hiện thao tác này.");
    }
    throw new DataAccessError("UNKNOWN", "Không thể sửa mối quan hệ.");
  }

  return mapRelationshipRow(data as RelationshipRow);
}

/**
 * System-wide (every family tree, not just one) count of relationships referencing an
 * individual — used by the admin dashboard's delete confirmation (007-individuals-admin-dashboard),
 * whose deletion is always system-wide, unlike TreeWorkspace's tree-scoped `graph.relationships` count.
 */
export async function getRelationshipCountForIndividual(individualId: string): Promise<number> {
  const { count, error } = await supabase
    .from("relationships")
    .select("id", { count: "exact", head: true })
    .or(`person_a_id.eq.${individualId},person_b_id.eq.${individualId}`);

  if (error) throw new DataAccessError("UNKNOWN", "Không thể tải số lượng mối quan hệ.");
  return count ?? 0;
}

export async function deleteRelationship(id: string): Promise<void> {
  const { error } = await supabase.from("relationships").delete().eq("id", id);
  if (error) {
    throw new DataAccessError("UNKNOWN", "Không thể xoá mối quan hệ.");
  }
}
