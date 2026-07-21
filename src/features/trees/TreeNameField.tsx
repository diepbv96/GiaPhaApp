import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateFamilyTreeName } from "@/features/trees/treeService";
import { useToast } from "@/app/ToastProvider";

export interface TreeNameFieldProps {
  treeId: string;
  currentName: string;
  onSaved?: (newName: string) => void;
  onCancel?: () => void;
}

/** Admin-only tree rename (spec 006 FR-001-FR-003) — same structure as SlugField. */
export function TreeNameField({ treeId, currentName, onSaved, onCancel }: TreeNameFieldProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [value, setValue] = useState(currentName);

  const saveMutation = useMutation({
    mutationFn: (name: string) => updateFamilyTreeName(treeId, name),
    onSuccess: (tree) => {
      queryClient.invalidateQueries({ queryKey: ["family-trees"] });
      showToast("success", `Đã cập nhật tên: ${tree.name}`);
      onSaved?.(tree.name);
    },
    onError: (err) => showToast("error", err instanceof Error ? err.message : "Không thể sửa tên cây gia phả."),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    saveMutation.mutate(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label className="text-sm font-medium" htmlFor={`tree-name-${treeId}`}>
        Tên cây gia phả
      </label>
      <input
        id={`tree-name-${treeId}`}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2"
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-[var(--color-ink-muted)]">
            Hủy
          </button>
        )}
        <button
          type="submit"
          disabled={saveMutation.isPending || !value.trim() || value.trim() === currentName}
          className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] disabled:opacity-60"
        >
          {saveMutation.isPending ? "Đang lưu..." : "Lưu tên"}
        </button>
      </div>
    </form>
  );
}
