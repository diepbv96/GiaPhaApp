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
  const [individualsResult, relationshipsResult] = await Promise.all([
    supabase.from("individuals").select(INDIVIDUAL_COLUMNS).eq("family_tree_id", treeId),
    supabase
      .from("relationships")
      .select("id, family_tree_id, type, person_a_id, person_b_id")
      .eq("family_tree_id", treeId),
  ]);

  if (individualsResult.error || relationshipsResult.error) {
    throw new DataAccessError("UNKNOWN", "Không thể tải dữ liệu cây gia phả.");
  }

  const individualRows = individualsResult.data as IndividualRow[];
  const relationshipRows = relationshipsResult.data as RelationshipRow[];

  return {
    individuals: individualRows.map((row) => mapIndividualRow(row, resolveAvatarUrl(row.avatar_path))),
    relationships: relationshipRows.map(mapRelationshipRow),
  };
}
