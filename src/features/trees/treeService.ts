import { supabase } from "@/lib/supabase";
import { mapFamilyTreeRow, type FamilyTreeRow } from "@/lib/mappers";
import { slugify } from "@/lib/slug";
import { DataAccessError, type FamilyTreeSummary } from "@/types";

const TREE_COLUMNS = "id, name, slug, is_default, is_public";
const UNIQUE_VIOLATION = "23505";
const MAX_SLUG_RETRIES = 20;

export async function getFamilyTrees(): Promise<FamilyTreeSummary[]> {
  const { data, error } = await supabase
    .from("family_trees")
    .select(TREE_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) {
    throw new DataAccessError("UNKNOWN", "Không thể tải danh sách cây gia phả.");
  }

  return (data as FamilyTreeRow[]).map(mapFamilyTreeRow);
}

/**
 * Returns the default tree if the caller is allowed to see it: signed-in users see it
 * regardless, and unauthenticated guests see it only when Admin has marked it public
 * (RLS-enforced — see supabase/migrations/0009_public_tree_access.sql). Returns null
 * both when no default tree exists and when a guest is blocked by RLS; callers that
 * need to distinguish "no tree" from "sign in required" should check the caller's
 * auth state themselves (see src/pages/Home.tsx).
 */
export async function getDefaultFamilyTree(): Promise<FamilyTreeSummary | null> {
  const { data, error } = await supabase
    .from("family_trees")
    .select(TREE_COLUMNS)
    .eq("is_default", true)
    .maybeSingle();

  if (error) {
    throw new DataAccessError("UNKNOWN", "Không thể tải cây gia phả mặc định.");
  }

  return data ? mapFamilyTreeRow(data as FamilyTreeRow) : null;
}

/**
 * Auto-generates a unique slug from `name` (spec FR-014), retrying with the next
 * numeric suffix on a uniqueness conflict — the database's `UNIQUE` constraint
 * (0013_family_tree_slug.sql) remains the actual authority; this just avoids a failed
 * insert being the common case for a duplicate tree name.
 */
export async function createFamilyTree(name: string): Promise<FamilyTreeSummary> {
  const baseSlug = slugify(name) || "cay-gia-pha";

  for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;

    const { data, error } = await supabase
      .from("family_trees")
      .insert({ name, slug })
      .select(TREE_COLUMNS)
      .single();

    if (!error && data) {
      return mapFamilyTreeRow(data as FamilyTreeRow);
    }

    if (error?.code === UNIQUE_VIOLATION) {
      continue; // slug collision — try the next suffix
    }
    if (error?.message.includes("FAMILY_TREE_LIMIT_REACHED")) {
      throw new DataAccessError("LIMIT_REACHED", "Đã đạt tối đa 5 cây gia phả.");
    }
    if (error?.code === "42501") {
      throw new DataAccessError("PERMISSION_DENIED", "Chỉ quản trị viên mới có thể tạo cây gia phả.");
    }
    throw new DataAccessError("UNKNOWN", "Không thể tạo cây gia phả.");
  }

  throw new DataAccessError("CONFLICT", "Không thể tạo slug duy nhất cho cây gia phả. Vui lòng thử lại.");
}

/** Loads a tree by its slug — used by the `/:slug` route (contracts/tree-slug-routing.md).
 * Relies entirely on the existing `select` RLS policy (any authenticated user, plus
 * `anon` when `is_public = true`); returns `null` for "not found or not visible to you". */
export async function getFamilyTreeBySlug(slug: string): Promise<FamilyTreeSummary | null> {
  const { data, error } = await supabase.from("family_trees").select(TREE_COLUMNS).eq("slug", slug).maybeSingle();

  if (error) {
    throw new DataAccessError("UNKNOWN", "Không thể tải cây gia phả.");
  }

  return data ? mapFamilyTreeRow(data as FamilyTreeRow) : null;
}

/**
 * Admin-only slug edit (spec FR-015) — never touched by a plain name edit (Edge
 * Cases: only an explicit slug edit changes it). Client-side `isValidSlug` validation
 * happens in `SlugField`; the database's format `CHECK` and `UNIQUE` constraint remain
 * the final authority.
 */
export async function updateTreeSlug(treeId: string, slug: string): Promise<FamilyTreeSummary> {
  const { data, error } = await supabase
    .from("family_trees")
    .update({ slug })
    .eq("id", treeId)
    .select(TREE_COLUMNS)
    .single();

  if (error || !data) {
    if (error?.code === UNIQUE_VIOLATION) {
      throw new DataAccessError("CONFLICT", "Slug này đã được dùng cho một cây gia phả khác.");
    }
    if (error?.code === "23514") {
      throw new DataAccessError("VALIDATION_FAILED", "Slug không hợp lệ. Chỉ dùng chữ thường, số và dấu gạch ngang.");
    }
    if (error?.code === "42501") {
      throw new DataAccessError("PERMISSION_DENIED", "Chỉ quản trị viên mới có thể sửa slug.");
    }
    throw new DataAccessError("UNKNOWN", "Không thể sửa slug.");
  }

  return mapFamilyTreeRow(data as FamilyTreeRow);
}

/**
 * Admin-only rename (spec 006 FR-001-FR-003). The DB already permits this via the
 * existing `family_trees_admin_update` RLS policy and the `name` column's own
 * non-empty `CHECK` constraint — only the client function/UI were missing.
 */
export async function updateFamilyTreeName(treeId: string, name: string): Promise<FamilyTreeSummary> {
  const { data, error } = await supabase
    .from("family_trees")
    .update({ name })
    .eq("id", treeId)
    .select(TREE_COLUMNS)
    .single();

  if (error || !data) {
    if (error?.code === "23514") {
      throw new DataAccessError("VALIDATION_FAILED", "Tên cây gia phả không được để trống.");
    }
    if (error?.code === "42501") {
      throw new DataAccessError("PERMISSION_DENIED", "Chỉ quản trị viên mới có thể sửa tên cây gia phả.");
    }
    throw new DataAccessError("UNKNOWN", "Không thể sửa tên cây gia phả.");
  }

  return mapFamilyTreeRow(data as FamilyTreeRow);
}

export async function setDefaultFamilyTree(treeId: string): Promise<void> {
  const { error } = await supabase.rpc("set_default_family_tree", { target_id: treeId });
  if (error) {
    if (error.code === "42501") {
      throw new DataAccessError("PERMISSION_DENIED", "Chỉ quản trị viên mới có thể đổi cây mặc định.");
    }
    throw new DataAccessError("UNKNOWN", "Không thể đặt cây gia phả mặc định.");
  }
}

export async function setTreePublic(treeId: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase.from("family_trees").update({ is_public: isPublic }).eq("id", treeId);
  if (error) {
    if (error.code === "42501") {
      throw new DataAccessError("PERMISSION_DENIED", "Chỉ quản trị viên mới có thể công khai cây gia phả.");
    }
    throw new DataAccessError("UNKNOWN", "Không thể thay đổi trạng thái công khai.");
  }
}

export async function deleteFamilyTree(treeId: string): Promise<void> {
  const trees = await getFamilyTrees();
  const target = trees.find((tree) => tree.id === treeId);

  // Admin may delete every tree, including the last one. The "reassign default
  // first" guard only matters while another tree would be left without one.
  if (target?.isDefault && trees.length > 1) {
    throw new DataAccessError(
      "CONFLICT",
      "Không thể xoá cây gia phả mặc định khi còn cây khác. Hãy đặt một cây khác làm mặc định trước.",
    );
  }

  const { error } = await supabase.from("family_trees").delete().eq("id", treeId);
  if (error) {
    if (error.code === "42501") {
      throw new DataAccessError("PERMISSION_DENIED", "Chỉ quản trị viên mới có thể xoá cây gia phả.");
    }
    throw new DataAccessError("UNKNOWN", "Không thể xoá cây gia phả.");
  }
}
