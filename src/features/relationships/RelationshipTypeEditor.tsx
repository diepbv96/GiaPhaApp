import { useState, type FormEvent } from "react";
import { updateRelationship } from "@/features/relationships/relationshipService";
import type { Relationship, RelationshipType } from "@/types";

const typeLabel: Record<RelationshipType, string> = {
  parent_child: "Cha/Mẹ – Con",
  spouse: "Vợ/Chồng",
  sibling: "Anh/Chị/Em",
};

export interface RelationshipTypeEditorProps {
  relationship: Relationship;
  onSaved: (updated: Relationship) => void;
  onCancel: () => void;
}

/** Small type-only editor for an existing relationship — the two endpoints are fixed
 * once a relationship already exists, so this doesn't reuse the full RelationshipForm
 * (which also picks person A/B). */
export function RelationshipTypeEditor({ relationship, onSaved, onCancel }: RelationshipTypeEditorProps) {
  const [type, setType] = useState<RelationshipType>(relationship.type);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const updated = await updateRelationship(relationship.id, type);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể sửa mối quan hệ.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="relationship-type-edit">
          Loại quan hệ
        </label>
        <select
          id="relationship-type-edit"
          value={type}
          onChange={(event) => setType(event.target.value as RelationshipType)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        >
          {Object.entries(typeLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-[var(--color-ink-muted)]">
          Hủy
        </button>
        <button
          type="submit"
          disabled={submitting || type === relationship.type}
          className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] disabled:opacity-60"
        >
          {submitting ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </form>
  );
}
