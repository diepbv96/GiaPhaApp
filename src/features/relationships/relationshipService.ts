import { supabase } from "@/lib/supabase";
import { mapRelationshipRow, type RelationshipRow } from "@/lib/mappers";
import { DataAccessError, type Relationship } from "@/types";

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

export async function deleteRelationship(id: string): Promise<void> {
  const { error } = await supabase.from("relationships").delete().eq("id", id);
  if (error) {
    throw new DataAccessError("UNKNOWN", "Không thể xoá mối quan hệ.");
  }
}
