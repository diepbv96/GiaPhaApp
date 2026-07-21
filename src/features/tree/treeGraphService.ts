import { supabase } from "@/lib/supabase";
import {
  mapIndividualRow,
  mapRelationshipRow,
  type IndividualRow,
  type RelationshipRow,
} from "@/lib/mappers";
import { INDIVIDUAL_COLUMNS } from "@/features/individuals/individualService";
import { DataAccessError, type TreeGraph } from "@/types";

const AVATAR_BUCKET = "avatars";

// The "avatars" bucket is public (0010_avatar_storage.sql) so guests viewing a
// published tree can load photos without an authenticated session; getPublicUrl is
// synchronous and needs no network round-trip or auth token.
function resolveAvatarUrl(path: string | null): string | undefined {
  if (!path) return undefined;
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function getTreeGraph(treeId: string): Promise<TreeGraph> {
  // Filters through individual_tree_memberships (not individuals.family_tree_id
  // directly) so a person who belongs to more than one tree still shows up in every
  // tree they're a member of, not only the one they were originally created in
  // (spec 006 FR-004/FR-016; contracts/tree-membership.md).
  const individualsResult = await supabase
    .from("individuals")
    .select(`${INDIVIDUAL_COLUMNS}, individual_tree_memberships!inner(family_tree_id)`)
    .eq("individual_tree_memberships.family_tree_id", treeId);

  if (individualsResult.error) {
    throw new DataAccessError("UNKNOWN", "Không thể tải dữ liệu cây gia phả.");
  }

  const individualRows = individualsResult.data as IndividualRow[];
  const memberIds = individualRows.map((row) => row.id);

  // A relationship is visible in this tree when both endpoints are current members of
  // it — not when relationships.family_tree_id (the tree it was originally recorded in)
  // happens to match. This lets a relationship follow both people into any other tree
  // they're later added to together (009-cross-tree-relationships; contracts/tree-graph-relationship-visibility.md).
  let relationshipRows: RelationshipRow[] = [];
  if (memberIds.length > 0) {
    const relationshipsResult = await supabase
      .from("relationships")
      .select("id, family_tree_id, type, person_a_id, person_b_id")
      .in("person_a_id", memberIds)
      .in("person_b_id", memberIds);

    if (relationshipsResult.error) {
      throw new DataAccessError("UNKNOWN", "Không thể tải dữ liệu cây gia phả.");
    }
    relationshipRows = relationshipsResult.data as RelationshipRow[];
  }

  return {
    individuals: individualRows.map((row) => mapIndividualRow(row, resolveAvatarUrl(row.avatar_path))),
    relationships: relationshipRows.map(mapRelationshipRow),
  };
}
