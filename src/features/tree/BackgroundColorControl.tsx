import { useState } from "react";
import { sidebarItemClass } from "@/app/Sidebar";
import type { BackgroundColorPreference } from "@/features/tree/useBackgroundColorPreference";

const FALLBACK_PICKER_COLOR = "#fffaf0"; // matches --color-surface — a sane starting point when no color is set yet

export interface BackgroundColorControlProps {
  preference: BackgroundColorPreference;
}

/** Expandable "Màu nền" sidebar row: a native color picker (live preview per spec
 * Clarifications Q1) plus save/reset actions scoped to this tree or all trees
 * (FR-005–FR-007, FR-010). */
export function BackgroundColorControl({ preference }: BackgroundColorControlProps) {
  const [open, setOpen] = useState(false);
  const { effectiveColor, previewColor, onPreview, saveForTree, saveForAllTrees, resetTree, resetAllTreesDefault } =
    preference;

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => setOpen((value) => !value)} className={`${sidebarItemClass} justify-between`}>
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-base" aria-hidden="true">
            🎨
          </span>
          <span className="truncate">Màu nền</span>
        </span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-2 rounded-lg bg-[var(--color-brand-50)] p-3">
          <label className="flex items-center justify-between gap-2 text-sm font-medium text-[var(--color-ink)]">
            Chọn màu
            <input
              type="color"
              value={effectiveColor ?? FALLBACK_PICKER_COLOR}
              onInput={(event) => onPreview(event.currentTarget.value)}
              className="h-8 w-14 cursor-pointer rounded border border-[var(--color-brand-100)]"
              aria-label="Chọn màu nền"
            />
          </label>

          <button
            type="button"
            disabled={previewColor === undefined}
            onClick={saveForTree}
            className="rounded-lg border border-[var(--color-brand-500)] px-3 py-1.5 text-sm font-medium text-[var(--color-brand-600)] disabled:cursor-default disabled:opacity-50"
          >
            Lưu cho cây này
          </button>
          <button
            type="button"
            disabled={previewColor === undefined}
            onClick={saveForAllTrees}
            className="rounded-lg border border-[var(--color-brand-500)] px-3 py-1.5 text-sm font-medium text-[var(--color-brand-600)] disabled:cursor-default disabled:opacity-50"
          >
            Lưu cho tất cả cây
          </button>
          <button
            type="button"
            onClick={resetTree}
            className="rounded-lg border border-[var(--color-ink-muted)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink-muted)]"
          >
            Đặt lại màu cây này
          </button>
          <button
            type="button"
            onClick={resetAllTreesDefault}
            className="rounded-lg border border-[var(--color-ink-muted)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink-muted)]"
          >
            Đặt lại mặc định chung
          </button>
        </div>
      )}
    </div>
  );
}
