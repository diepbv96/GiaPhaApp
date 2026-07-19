import { supabase } from "@/lib/supabase";
import { parseXlsxFile, type ParsedIndividualRow } from "@/features/import/xlsxParser";
import { createIndividual } from "@/features/individuals/individualService";
import { createRelationship } from "@/features/relationships/relationshipService";
import { DataAccessError, type ImportRowResult, type ImportSummary, type RelationshipType } from "@/types";

interface RowOutcome {
  kind: "individual" | "relationship";
  rowNumber: number;
  status: "succeeded" | "failed" | "duplicate";
  message?: string;
  individualId?: string;
}

async function findDuplicate(
  treeId: string,
  fullName: string,
  birthDateValue?: string,
): Promise<boolean> {
  if (!birthDateValue) return false; // FR-025: duplicate check requires both full name AND birth date known

  const { data } = await supabase
    .from("individuals")
    .select("id")
    .eq("family_tree_id", treeId)
    .eq("full_name", fullName)
    .eq("birth_date", birthDateValue)
    .maybeSingle();

  return Boolean(data);
}

async function importIndividuals(
  treeId: string,
  rows: ParsedIndividualRow[],
): Promise<{ outcomes: RowOutcome[]; rowIdToIndividualId: Map<string, string> }> {
  const outcomes: RowOutcome[] = [];
  const rowIdToIndividualId = new Map<string, string>();
  const seenRowIds = new Set<string>();

  for (const row of rows) {
    if (row.errors.length > 0) {
      outcomes.push({ kind: "individual", rowNumber: row.rowNumber, status: "failed", message: row.errors.join("; ") });
      continue;
    }

    if (seenRowIds.has(row.rowId)) {
      outcomes.push({
        kind: "individual",
        rowNumber: row.rowNumber,
        status: "failed",
        message: `Mã số trùng lặp trong file: "${row.rowId}"`,
      });
      continue;
    }
    seenRowIds.add(row.rowId);

    const isDuplicate = await findDuplicate(treeId, row.fullName, row.birthDate?.value);
    if (isDuplicate) {
      outcomes.push({
        kind: "individual",
        rowNumber: row.rowNumber,
        status: "duplicate",
        message: `Đã tồn tại cá thể trùng họ tên và ngày sinh: "${row.fullName}"`,
      });
      continue;
    }

    try {
      const individual = await createIndividual(treeId, {
        fullName: row.fullName,
        alias: row.alias,
        gender: row.gender!,
        birthDate: row.birthDate,
        isDeceased: row.isDeceased,
        deathDate: row.deathDate,
        notes: row.notes,
        siblingOrder: row.siblingOrder,
      });
      rowIdToIndividualId.set(row.rowId, individual.id);
      outcomes.push({ kind: "individual", rowNumber: row.rowNumber, status: "succeeded", individualId: individual.id });
    } catch (err) {
      outcomes.push({
        kind: "individual",
        rowNumber: row.rowNumber,
        status: "failed",
        message: err instanceof Error ? err.message : "Không thể tạo cá thể.",
      });
    }
  }

  return { outcomes, rowIdToIndividualId };
}

interface RelationshipDeclaration {
  type: RelationshipType;
  fromRowId: string;
  toRowId: string;
  sourceRowNumber: number;
}

/**
 * Cha/Mẹ/Vợ-chồng are columns on the child/spouse's own row rather than a separate
 * relationships sheet. A spouse pair is naturally declared from either side (or both,
 * symmetrically) — dedupe by unordered pair so declaring it on both rows doesn't
 * produce a spurious "already exists" failure for the second row.
 */
function deriveRelationshipDeclarations(rows: ParsedIndividualRow[]): RelationshipDeclaration[] {
  const declarations: RelationshipDeclaration[] = [];
  const seenSpousePairs = new Set<string>();

  for (const row of rows) {
    if (row.errors.length > 0) continue;

    if (row.fatherRowId) {
      declarations.push({ type: "parent_child", fromRowId: row.fatherRowId, toRowId: row.rowId, sourceRowNumber: row.rowNumber });
    }
    if (row.motherRowId) {
      declarations.push({ type: "parent_child", fromRowId: row.motherRowId, toRowId: row.rowId, sourceRowNumber: row.rowNumber });
    }
    for (const spouseRowId of row.spouseRowIds) {
      const pairKey = [row.rowId, spouseRowId].sort().join("::");
      if (seenSpousePairs.has(pairKey)) continue;
      seenSpousePairs.add(pairKey);
      declarations.push({ type: "spouse", fromRowId: row.rowId, toRowId: spouseRowId, sourceRowNumber: row.rowNumber });
    }
  }

  return declarations;
}

async function importRelationships(
  treeId: string,
  declarations: RelationshipDeclaration[],
  rowIdToIndividualId: Map<string, string>,
): Promise<RowOutcome[]> {
  const outcomes: RowOutcome[] = [];

  for (const declaration of declarations) {
    const personAId = rowIdToIndividualId.get(declaration.fromRowId);
    const personBId = rowIdToIndividualId.get(declaration.toRowId);
    if (!personAId || !personBId) {
      const missingRowId = !personAId ? declaration.fromRowId : declaration.toRowId;
      outcomes.push({
        kind: "relationship",
        rowNumber: declaration.sourceRowNumber,
        status: "failed",
        message: `Mã số "${missingRowId}" không tham chiếu tới một cá thể được nhập thành công.`,
      });
      continue;
    }

    try {
      await createRelationship({ familyTreeId: treeId, type: declaration.type, personAId, personBId });
      outcomes.push({ kind: "relationship", rowNumber: declaration.sourceRowNumber, status: "succeeded" });
    } catch (err) {
      outcomes.push({
        kind: "relationship",
        rowNumber: declaration.sourceRowNumber,
        status: "failed",
        message: err instanceof Error ? err.message : "Không thể tạo mối quan hệ.",
      });
    }
  }

  return outcomes;
}

export async function importFromXlsx(treeId: string, file: File): Promise<ImportSummary> {
  const rows = await parseXlsxFile(file);

  const { outcomes: individualOutcomes, rowIdToIndividualId } = await importIndividuals(treeId, rows);
  const relationshipDeclarations = deriveRelationshipDeclarations(rows);
  const relationshipOutcomes = await importRelationships(treeId, relationshipDeclarations, rowIdToIndividualId);

  const allOutcomes = [...individualOutcomes, ...relationshipOutcomes];
  const succeededRows = allOutcomes.filter((o) => o.status === "succeeded").length;
  const failedRows = allOutcomes.filter((o) => o.status === "failed").length;
  const duplicateRows = allOutcomes.filter((o) => o.status === "duplicate").length;

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      family_tree_id: treeId,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id,
      file_name: file.name,
      total_rows: allOutcomes.length,
      succeeded_rows: succeededRows,
      failed_rows: failedRows,
      duplicate_rows: duplicateRows,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    throw new DataAccessError("UNKNOWN", "Không thể lưu kết quả nhập liệu.");
  }

  if (allOutcomes.length > 0) {
    await supabase.from("import_row_results").insert(
      allOutcomes.map((outcome) => ({
        import_batch_id: batch.id,
        row_number: outcome.rowNumber,
        status: outcome.status,
        error_message: outcome.message ?? null,
        individual_id: outcome.individualId ?? null,
      })),
    );
  }

  const rowResults: ImportRowResult[] = allOutcomes.map((o) => ({
    kind: o.kind,
    rowNumber: o.rowNumber,
    status: o.status,
    message: o.message,
  }));

  return {
    batchId: batch.id,
    totalRows: allOutcomes.length,
    succeededRows,
    failedRows,
    duplicateRows,
    rowResults,
  };
}
