import type { ImportSummary as ImportSummaryData } from "@/types";

export interface ImportSummaryProps {
  summary: ImportSummaryData;
  onClose: () => void;
}

const statusLabel: Record<string, string> = {
  succeeded: "Thành công",
  failed: "Lỗi",
  duplicate: "Trùng lặp",
};

const statusColor: Record<string, string> = {
  succeeded: "text-[var(--color-success)]",
  failed: "text-[var(--color-danger)]",
  duplicate: "text-[var(--color-gold-700)]",
};

const kindLabel: Record<string, string> = {
  individual: "Cá thể",
  relationship: "Mối quan hệ",
};

export function ImportSummary({ summary, onClose }: ImportSummaryProps) {
  const problemRows = summary.rowResults.filter((row) => row.status !== "succeeded");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-2 text-center text-sm">
        <div className="rounded-lg bg-[var(--color-brand-50)] p-2">
          <p className="text-lg font-semibold">{summary.totalRows}</p>
          <p className="text-[var(--color-ink-muted)]">Tổng số dòng</p>
        </div>
        <div className="rounded-lg bg-[var(--color-brand-50)] p-2">
          <p className="text-lg font-semibold text-[var(--color-success)]">{summary.succeededRows}</p>
          <p className="text-[var(--color-ink-muted)]">Thành công</p>
        </div>
        <div className="rounded-lg bg-[var(--color-brand-50)] p-2">
          <p className="text-lg font-semibold text-[var(--color-danger)]">{summary.failedRows}</p>
          <p className="text-[var(--color-ink-muted)]">Lỗi</p>
        </div>
        <div className="rounded-lg bg-[var(--color-brand-50)] p-2">
          <p className="text-lg font-semibold text-[var(--color-gold-700)]">{summary.duplicateRows}</p>
          <p className="text-[var(--color-ink-muted)]">Trùng lặp</p>
        </div>
      </div>

      {problemRows.length > 0 && (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1">Loại</th>
                <th className="px-2 py-1">Dòng</th>
                <th className="px-2 py-1">Trạng thái</th>
                <th className="px-2 py-1">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {problemRows.map((row, index) => (
                <tr key={`${row.kind}-${row.rowNumber}-${index}`} className="border-t border-gray-100">
                  <td className="px-2 py-1">{kindLabel[row.kind]}</td>
                  <td className="px-2 py-1">{row.rowNumber}</td>
                  <td className={`px-2 py-1 font-medium ${statusColor[row.status]}`}>{statusLabel[row.status]}</td>
                  <td className="px-2 py-1">{row.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)]"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
