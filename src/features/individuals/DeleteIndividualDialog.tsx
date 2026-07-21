import { useState } from "react";
import { deleteIndividual } from "@/features/individuals/individualService";
import type { Individual } from "@/types";

export interface DeleteIndividualDialogProps {
  individual: Individual;
  relationshipCount: number;
  onDeleted: () => void;
  onCancel: () => void;
}

export function DeleteIndividualDialog({
  individual,
  relationshipCount,
  onDeleted,
  onCancel,
}: DeleteIndividualDialogProps) {
  const hasRelationships = relationshipCount > 0;
  const [confirmCascade, setConfirmCascade] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    setError(null);
    setSubmitting(true);
    try {
      await deleteIndividual(individual.id, { cascadeRelationships: hasRelationships });
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xoá cá thể này.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="alertdialog"
      aria-labelledby="delete-individual-title"
      className="flex flex-col gap-3 rounded-xl border border-[var(--color-danger)] bg-white p-4"
    >
      <h3 id="delete-individual-title" className="font-semibold text-[var(--color-danger)]">
        Xoá "{individual.fullName}"?
      </h3>

      {hasRelationships ? (
        <>
          <p className="text-sm text-[var(--color-ink)]">
            Cá thể này đang có {relationshipCount} mối quan hệ. Xoá cá thể sẽ đồng thời xoá tất cả các
            mối quan hệ liên quan và xoá cá thể này khỏi mọi cây gia phả mà họ thuộc về. Hành động này
            không thể hoàn tác.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmCascade}
              onChange={(event) => setConfirmCascade(event.target.checked)}
            />
            Tôi hiểu và muốn xoá cả các mối quan hệ liên quan.
          </label>
        </>
      ) : (
        <p className="text-sm text-[var(--color-ink)]">
          Cá thể này sẽ bị xoá khỏi mọi cây gia phả mà họ thuộc về. Hành động này không thể hoàn tác.
        </p>
      )}

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-[var(--color-ink-muted)]">
          Hủy
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={submitting || (hasRelationships && !confirmCascade)}
          className="rounded-lg bg-[var(--color-danger)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? "Đang xoá..." : "Xoá"}
        </button>
      </div>
    </div>
  );
}
