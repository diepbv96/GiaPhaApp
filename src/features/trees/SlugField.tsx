import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTreeSlug } from "@/features/trees/treeService";
import { isValidSlug, slugify } from "@/lib/slug";
import { useToast } from "@/app/ToastProvider";

export interface SlugFieldProps {
  treeId: string;
  currentSlug: string;
  onSaved?: (newSlug: string) => void;
  onCancel?: () => void;
}

/**
 * Admin-only slug editor (spec FR-015): auto-suggests a URL-safe value as the admin
 * types, validates format before submitting, and surfaces the server's rejection
 * (conflict or invalid format) without discarding the previous, still-valid slug
 * (contracts/tree-slug-routing.md).
 */
export function SlugField({ treeId, currentSlug, onSaved, onCancel }: SlugFieldProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [value, setValue] = useState(currentSlug);
  const [formatError, setFormatError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (slug: string) => updateTreeSlug(treeId, slug),
    onSuccess: (tree) => {
      queryClient.invalidateQueries({ queryKey: ["family-trees"] });
      showToast("success", `Đã cập nhật slug: ${tree.slug}`);
      onSaved?.(tree.slug);
    },
    onError: (err) => showToast("error", err instanceof Error ? err.message : "Không thể sửa slug."),
  });

  function handleChange(rawInput: string) {
    setValue(slugify(rawInput));
    setFormatError(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValidSlug(value)) {
      setFormatError("Slug chỉ được chứa chữ thường, số và dấu gạch ngang, không bắt đầu/kết thúc bằng dấu gạch ngang.");
      return;
    }
    saveMutation.mutate(value);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label className="text-sm font-medium" htmlFor={`slug-${treeId}`}>
        Slug (đường dẫn riêng của cây gia phả)
      </label>
      <input
        id={`slug-${treeId}`}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
      />
      <p className="text-xs text-[var(--color-ink-muted)]">/{value || "…"}</p>
      {formatError && <p className="text-sm text-[var(--color-danger)]">{formatError}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-[var(--color-ink-muted)]">
            Hủy
          </button>
        )}
        <button
          type="submit"
          disabled={saveMutation.isPending || value === currentSlug}
          className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] disabled:opacity-60"
        >
          {saveMutation.isPending ? "Đang lưu..." : "Lưu slug"}
        </button>
      </div>
    </form>
  );
}
