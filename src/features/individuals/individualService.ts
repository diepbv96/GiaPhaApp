import { supabase } from "@/lib/supabase";
import { mapFamilyTreeRow, mapIndividualRow, type FamilyTreeRow, type IndividualRow } from "@/lib/mappers";
import { normalizeSearchTerm } from "@/features/individuals/individualSearch";
import { DataAccessError, type FamilyTreeSummary, type Individual, type IndividualsAdminPage } from "@/types";

const AVATAR_BUCKET = "avatars";

// Single source of truth for the individuals row shape — treeGraphService.ts's bulk
// fetch reuses this too, so adding a column here never means silently dropping it there.
export const INDIVIDUAL_COLUMNS =
  "id, family_tree_id, full_name, alias, gender, birth_date, birth_date_precision, is_deceased, death_date, death_date_precision, notes, avatar_path, layout_x, layout_y, sibling_order";

// Mirrors treeGraphService.ts's private resolveAvatarUrl — duplicated (not imported)
// to avoid a circular import, since treeGraphService.ts already imports from this module.
function resolveAvatarUrl(path: string | null): string | undefined {
  if (!path) return undefined;
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

export type IndividualInput = Omit<Individual, "id" | "familyTreeId" | "avatarUrl" | "layoutPosition">;

function toRowPayload(input: IndividualInput) {
  return {
    full_name: input.fullName,
    alias: input.alias ?? null,
    gender: input.gender,
    birth_date: input.birthDate?.value ?? null,
    birth_date_precision: input.birthDate?.precision ?? null,
    is_deceased: input.isDeceased,
    // A person can only have a recorded death date once marked deceased.
    death_date: input.isDeceased ? input.deathDate?.value ?? null : null,
    death_date_precision: input.isDeceased ? input.deathDate?.precision ?? null : null,
    notes: input.notes ?? null,
    sibling_order: input.siblingOrder ?? null,
  };
}

function toDataAccessError(error: { message: string; code?: string }): DataAccessError {
  if (error.code === "23514" || error.code === "22001") {
    // CHECK/length violation, e.g. notes > 100 chars (FR-007) or blank full_name (FR-005)
    return new DataAccessError("VALIDATION_FAILED", "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.");
  }
  if (error.code === "42501") {
    return new DataAccessError("PERMISSION_DENIED", "Bạn không có quyền thực hiện thao tác này.");
  }
  if (error.code === "PGRST116") {
    // .single() found 0 (or >1) rows — for an id-scoped update this means the record
    // was already deleted by someone else (007-individuals-admin-dashboard FR-013).
    return new DataAccessError(
      "NOT_FOUND",
      "Cá thể này không còn tồn tại (có thể đã bị người khác xoá).",
    );
  }
  return new DataAccessError("UNKNOWN", "Đã xảy ra lỗi. Vui lòng thử lại.");
}

export async function createIndividual(treeId: string, input: IndividualInput): Promise<Individual> {
  const { data, error } = await supabase
    .from("individuals")
    .insert({ family_tree_id: treeId, ...toRowPayload(input) })
    .select(INDIVIDUAL_COLUMNS)
    .single();

  if (error || !data) throw toDataAccessError(error ?? { message: "insert failed" });
  return mapIndividualRow(data as IndividualRow);
}

export async function updateIndividual(id: string, input: IndividualInput): Promise<Individual> {
  const { data, error } = await supabase
    .from("individuals")
    .update(toRowPayload(input))
    .eq("id", id)
    .select(INDIVIDUAL_COLUMNS)
    .single();

  if (error || !data) throw toDataAccessError(error ?? { message: "update failed" });
  return mapIndividualRow(data as IndividualRow);
}

/**
 * Cross-tree, paginated, filterable/searchable individuals list for the admin
 * dashboard (007-individuals-admin-dashboard). Two-query shape (contracts/individuals-list-search.md):
 * (1) a selection query, optionally tree-filtered and/or search-filtered, paginated;
 * (2) a membership-display query for exactly the returned page's ids, unfiltered by
 * tree, so every individual's full set of family trees is shown regardless of which
 * tree filter (if any) narrowed the selection query.
 */
export async function listIndividualsAdmin(params: {
  page: number;
  pageSize: number;
  treeId?: string;
  search?: string;
}): Promise<IndividualsAdminPage> {
  const { page, pageSize, treeId, search } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  // Always embed the membership join (rather than conditionally, based on whether a
  // tree filter is active) so supabase-js's select-string literal type inference has a
  // single, constant string to parse — every individual always has >=1 membership row
  // (invariant enforced by 0017_individual_tree_memberships.sql), so requiring the
  // `!inner` join is a no-op filter-wise when no `.eq()` is added below.
  let query = supabase
    .from("individuals")
    .select(`${INDIVIDUAL_COLUMNS}, individual_tree_memberships!inner(family_tree_id)`, { count: "exact" });

  if (treeId) {
    query = query.eq("individual_tree_memberships.family_tree_id", treeId);
  }

  const term = search ? normalizeSearchTerm(search) : "";
  if (term) {
    // Commas/parentheses are structural in PostgREST's `.or()` filter grammar — names
    // never legitimately contain them, so strip rather than escape.
    const safeTerm = term.replace(/[,()]/g, "");
    query = query.or(`full_name_normalized.ilike.%${safeTerm}%,alias_normalized.ilike.%${safeTerm}%`);
  }

  const { data, error, count } = await query.order("full_name", { ascending: true }).range(from, to);

  if (error) throw new DataAccessError("UNKNOWN", "Không thể tải danh sách cá thể.");

  const rows = (data ?? []) as unknown as IndividualRow[];
  const total = count ?? 0;
  if (rows.length === 0) return { individuals: [], total };

  const ids = rows.map((row) => row.id);
  const { data: membershipRows, error: membershipError } = await supabase
    .from("individual_tree_memberships")
    .select("individual_id, family_trees(id, name, slug, is_default, is_public)")
    .in("individual_id", ids);

  if (membershipError) throw new DataAccessError("UNKNOWN", "Không thể tải danh sách cây gia phả của cá thể.");

  const treesByIndividual = new Map<string, FamilyTreeSummary[]>();
  for (const row of (membershipRows ?? []) as unknown as {
    individual_id: string;
    family_trees: FamilyTreeRow | null;
  }[]) {
    if (!row.family_trees) continue;
    const trees = treesByIndividual.get(row.individual_id) ?? [];
    trees.push(mapFamilyTreeRow(row.family_trees));
    treesByIndividual.set(row.individual_id, trees);
  }

  const individuals = rows.map((row) => ({
    ...mapIndividualRow(row, resolveAvatarUrl(row.avatar_path)),
    familyTrees: treesByIndividual.get(row.id) ?? [],
  }));

  return { individuals, total };
}

/** Persists a manually dragged node position (Admin/Editor only, enforced by RLS). */
export async function updateIndividualPosition(id: string, position: { x: number; y: number }): Promise<void> {
  const { error } = await supabase
    .from("individuals")
    .update({ layout_x: position.x, layout_y: position.y })
    .eq("id", id);
  if (error) throw toDataAccessError(error);
}

export async function deleteIndividual(
  id: string,
  opts?: { cascadeRelationships?: boolean },
): Promise<void> {
  // Single atomic transaction (migration 0022) — previously this was three separate
  // requests (null import_row_results, then delete individuals), which let the final
  // delete fail on the import_row_results FK even for an individual with zero
  // relationships, misreported as "still has relationships" by the 23503 catch below.
  const { error } = await supabase.rpc("delete_individual_everywhere", {
    target_id: id,
    cascade_relationships: opts?.cascadeRelationships ?? false,
  });

  if (error) {
    if (error.message.includes("INDIVIDUAL_NOT_FOUND")) {
      throw new DataAccessError("NOT_FOUND", "Cá thể này đã bị xoá trước đó.");
    }
    if (error.code === "23503") {
      // Only `relationships` can still reference this individual at this point —
      // import_row_results is unconditionally cleared earlier in the same transaction.
      throw new DataAccessError(
        "CONFLICT",
        "Không thể xoá: cá thể này vẫn còn mối quan hệ. Hãy xoá mối quan hệ trước hoặc xác nhận xoá cả mối quan hệ.",
      );
    }
    throw toDataAccessError(error);
  }
}

export async function uploadAvatar(individualId: string, file: File): Promise<string> {
  const path = `${individualId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true });
  if (uploadError) {
    throw new DataAccessError("UNKNOWN", "Không thể tải ảnh lên.");
  }

  const { data: previous } = await supabase
    .from("individuals")
    .select("avatar_path")
    .eq("id", individualId)
    .single();

  const { error: updateError } = await supabase
    .from("individuals")
    .update({ avatar_path: path })
    .eq("id", individualId);
  if (updateError) throw toDataAccessError(updateError);

  if (previous?.avatar_path && previous.avatar_path !== path) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previous.avatar_path]);
  }

  return path;
}
