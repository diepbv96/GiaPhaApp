import { useState, type FormEvent } from "react";
import { createRelationship } from "@/features/relationships/relationshipService";
import type { Individual, Relationship, RelationshipType } from "@/types";

const typeLabel: Record<RelationshipType, string> = {
  parent_child: "Cha/Mẹ – Con",
  spouse: "Vợ/Chồng",
  sibling: "Anh/Chị/Em",
};

export interface RelationshipFormProps {
  treeId: string;
  individuals: Individual[];
  defaultPersonAId?: string;
  onSuccess: (relationship: Relationship) => void;
  onCancel: () => void;
}

export function RelationshipForm({
  treeId,
  individuals,
  defaultPersonAId,
  onSuccess,
  onCancel,
}: RelationshipFormProps) {
  const [type, setType] = useState<RelationshipType>("parent_child");
  const [personAId, setPersonAId] = useState(defaultPersonAId ?? individuals[0]?.id ?? "");
  const [personBId, setPersonBId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!personAId || !personBId) {
      setError("Vui lòng chọn đầy đủ hai cá thể.");
      return;
    }
    if (personAId === personBId) {
      setError("Không thể tạo mối quan hệ với chính mình.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const relationship = await createRelationship({
        familyTreeId: treeId,
        type,
        personAId,
        personBId,
      });
      onSuccess(relationship);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo mối quan hệ.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="relationship-type">
          Loại quan hệ
        </label>
        <select
          id="relationship-type"
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

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="person-a">
          {type === "parent_child" ? "Cha/Mẹ" : "Cá thể thứ nhất"}
        </label>
        <select
          id="person-a"
          value={personAId}
          onChange={(event) => setPersonAId(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        >
          <option value="">-- Chọn --</option>
          {individuals.map((individual) => (
            <option key={individual.id} value={individual.id}>
              {individual.fullName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="person-b">
          {type === "parent_child" ? "Con" : "Cá thể thứ hai"}
        </label>
        <select
          id="person-b"
          value={personBId}
          onChange={(event) => setPersonBId(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        >
          <option value="">-- Chọn --</option>
          {individuals.map((individual) => (
            <option key={individual.id} value={individual.id}>
              {individual.fullName}
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
          disabled={submitting}
          className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] disabled:opacity-60"
        >
          {submitting ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </form>
  );
}
