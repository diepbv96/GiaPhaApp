import { supabase } from "@/lib/supabase";
import { mapIndividualRow, type IndividualRow } from "@/lib/mappers";
import { DataAccessError, type Individual } from "@/types";

const AVATAR_BUCKET = "avatars";

// Single source of truth for the individuals row shape — treeGraphService.ts's bulk
// fetch reuses this too, so adding a column here never means silently dropping it there.
export const INDIVIDUAL_COLUMNS =
  "id, family_tree_id, full_name, alias, gender, birth_date, birth_date_precision, is_deceased, death_date, death_date_precision, notes, avatar_path, layout_x, layout_y, sibling_order";

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
  if (opts?.cascadeRelationships) {
    const { error: relError } = await supabase
      .from("relationships")
      .delete()
      .or(`person_a_id.eq.${id},person_b_id.eq.${id}`);
    if (relError) throw toDataAccessError(relError);
  }

  const { error } = await supabase.from("individuals").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      // FK from relationships still references this individual (FR-012)
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
