import { useState } from "react";
import { importFromXlsx } from "@/features/import/importService";
import { ImportSummary } from "@/features/import/ImportSummary";
import type { FamilyTreeSummary, ImportSummary as ImportSummaryData } from "@/types";

export interface ImportDialogProps {
  trees: FamilyTreeSummary[];
  defaultTreeId?: string;
  onClose: () => void;
  onImported: () => void;
}

export function ImportDialog({ trees, defaultTreeId, onClose, onImported }: ImportDialogProps) {
  const [treeId, setTreeId] = useState(defaultTreeId ?? trees[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<ImportSummaryData | null>(null);

  async function handleImport() {
    if (!treeId || !file) {
      setError("Vui lòng chọn cây gia phả và file .xlsx.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await importFromXlsx(treeId, file);
      setSummary(result);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nhập dữ liệu không thành công.");
    } finally {
      setSubmitting(false);
    }
  }

  if (summary) {
    return <ImportSummary summary={summary} onClose={onClose} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--color-ink-muted)]">
        File phải theo mẫu định sẵn: một sheet "CaThe" duy nhất, mỗi dòng một người.{" "}
        <a
          href={`${import.meta.env.BASE_URL}templates/import-template.xlsx`}
          download
          className="font-medium text-[var(--color-brand-600)] hover:underline"
        >
          Tải file mẫu (.xlsx)
        </a>
        {" · "}
        <a
          href={`${import.meta.env.BASE_URL}templates/README.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[var(--color-brand-600)] hover:underline"
        >
          Xem hướng dẫn điền file
        </a>
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="import-tree">
          Cây gia phả
        </label>
        <select
          id="import-tree"
          value={treeId}
          onChange={(event) => setTreeId(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        >
          {trees.map((tree) => (
            <option key={tree.id} value={tree.id}>
              {tree.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="import-file">
          File .xlsx
        </label>
        <input
          id="import-file"
          type="file"
          accept=".xlsx"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-[var(--color-ink-muted)]">
          Hủy
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={submitting}
          className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] disabled:opacity-60"
        >
          {submitting ? "Đang nhập..." : "Nhập dữ liệu"}
        </button>
      </div>
    </div>
  );
}
