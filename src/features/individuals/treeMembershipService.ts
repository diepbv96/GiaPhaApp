import { supabase } from "@/lib/supabase";
import { mapFamilyTreeRow, type FamilyTreeRow } from "@/lib/mappers";
import { DataAccessError, type FamilyTreeSummary } from "@/types";

const TREE_COLUMNS = "id, name, slug, is_default, is_public";

/** Every family tree the given person currently belongs to (spec 006 FR-004). */
export async function getIndividualTreeMemberships(individualId: string): Promise<FamilyTreeSummary[]> {
  const { data, error } = await supabase
    .from("individual_tree_memberships")
    .select(`family_trees(${TREE_COLUMNS})`)
    .eq("individual_id", individualId);

  if (error) {
    throw new DataAccessError("UNKNOWN", "Không thể tải danh sách cây gia phả của cá thể này.");
  }

  return (data as unknown as { family_trees: FamilyTreeRow }[])
    .map((row) => row.family_trees)
    .filter((tree): tree is FamilyTreeRow => Boolean(tree))
    .map(mapFamilyTreeRow);
}

/** Adds an existing person to another family tree they're not yet a member of (FR-005). */
export async function addIndividualToTree(individualId: string, treeId: string): Promise<void> {
  const { error } = await supabase
    .from("individual_tree_memberships")
    .insert({ individual_id: individualId, family_tree_id: treeId });

  if (error) {
    if (error.code === "23505") {
      throw new DataAccessError("CONFLICT", "Cá thể này đã là thành viên của cây gia phả này.");
    }
    if (error.code === "42501") {
      throw new DataAccessError("PERMISSION_DENIED", "Bạn không có quyền thực hiện thao tác này.");
    }
    throw new DataAccessError("UNKNOWN", "Không thể thêm cá thể vào cây gia phả.");
  }
}

/**
 * Removes a person's membership from one family tree, leaving their membership and
 * data in any other tree untouched (FR-006/FR-008). Blocked by the database if this
 * would be their only remaining tree (FR-007), or if `cascadeRelationships` isn't
 * confirmed and relationships still reference them within this specific tree.
 */
export async function removeIndividualFromTree(
  individualId: string,
  treeId: string,
  opts?: { cascadeRelationships?: boolean },
): Promise<void> {
  if (opts?.cascadeRelationships) {
    const { error: relError } = await supabase
      .from("relationships")
      .delete()
      .eq("family_tree_id", treeId)
      .or(`person_a_id.eq.${individualId},person_b_id.eq.${individualId}`);
    if (relError) {
      throw new DataAccessError("UNKNOWN", "Không thể xoá mối quan hệ trong cây gia phả này.");
    }
  }

  const { error } = await supabase
    .from("individual_tree_memberships")
    .delete()
    .eq("individual_id", individualId)
    .eq("family_tree_id", treeId);

  if (error) {
    if (error.message.includes("LAST_TREE_MEMBERSHIP")) {
      throw new DataAccessError("CONFLICT", "Không thể xoá: đây là cây gia phả duy nhất của cá thể này.");
    }
    if (error.message.includes("MEMBERSHIP_HAS_RELATIONSHIPS")) {
      throw new DataAccessError(
        "CONFLICT",
        "Cá thể này vẫn còn mối quan hệ trong cây gia phả này. Hãy xoá mối quan hệ trước hoặc xác nhận xoá cả mối quan hệ.",
      );
    }
    if (error.code === "42501") {
      throw new DataAccessError("PERMISSION_DENIED", "Bạn không có quyền thực hiện thao tác này.");
    }
    throw new DataAccessError("UNKNOWN", "Không thể xoá cá thể khỏi cây gia phả.");
  }
}
