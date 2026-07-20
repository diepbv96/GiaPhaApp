# Contract: Background Color Preference

New module: `src/features/tree/backgroundColorPreference.ts` (pure sessionStorage helpers) + `src/features/tree/useBackgroundColorPreference.ts` (React hook wrapping them, consumed by `TreeWorkspace.tsx`).

## sessionStorage keys

| Key | Value | Set by | Cleared by |
|---|---|---|---|
| `giapha:bg-color:tree:{treeId}` | `#rrggbb` string | "Lưu cho cây này" (save for this tree) | "Đặt lại màu cây này" (reset this tree), or browser session ending |
| `giapha:bg-color:all-trees` | `#rrggbb` string | "Lưu cho tất cả cây" (save as all-trees default) | "Đặt lại mặc định chung" (reset all-trees default), or browser session ending |

Both keys are plain strings — no JSON encoding, since `<input type="color">` never yields anything other than a 7-character lowercase hex string.

## Pure helpers (`backgroundColorPreference.ts`)

```text
getTreeColor(treeId: string): string | undefined
setTreeColor(treeId: string, colorHex: string): void
clearTreeColor(treeId: string): void

getAllTreesDefaultColor(): string | undefined
setAllTreesDefaultColor(colorHex: string): void
clearAllTreesDefaultColor(): void

resolveBackgroundColor(treeId: string): string | undefined
```

- `resolveBackgroundColor(treeId)` — implements FR-007's precedence: returns `getTreeColor(treeId)` if set, else `getAllTreesDefaultColor()` if set, else `undefined` (meaning: no override, canvas keeps its current default appearance).
- All setters/getters/clears wrap `window.sessionStorage` directly — no in-memory cache, since `sessionStorage` reads are already synchronous and cheap, and a cache would risk drifting from another tab's writes in the same session (spec Edge Cases: multi-tab sharing).

## React hook (`useBackgroundColorPreference.ts`)

```text
useBackgroundColorPreference(treeId: string): {
  effectiveColor: string | undefined;   // what TreeCanvas should render right now
  previewColor: string | undefined;     // live value while the picker is being dragged, else undefined
  onPreview(colorHex: string): void;     // called on every <input type="color"> `onInput`
  saveForTree(): void;                   // commits `previewColor` via setTreeColor(treeId, ...)
  saveForAllTrees(): void;               // commits `previewColor` via setAllTreesDefaultColor(...)
  resetTree(): void;                     // clearTreeColor(treeId)
  resetAllTreesDefault(): void;          // clearAllTreesDefaultColor()
}
```

- `effectiveColor` = `previewColor ?? resolveBackgroundColor(treeId)` — this is the single value `TreeWorkspace` passes to `TreeCanvas`'s new `backgroundColor` prop, directly implementing the live-preview clarification (spec Clarifications, Q1: preview first, Save persists) and FR-011 (no reload in either case).
- `saveForTree`/`saveForAllTrees` clear `previewColor` back to `undefined` afterward — at that point `resolveBackgroundColor` already returns the just-saved value, so `effectiveColor` doesn't change visually across the save action (no flash).
- Switching trees (new `treeId`) always resets `previewColor` to `undefined` — a preview never leaks from one tree to another.

## Consumers

- `TreeCanvas.tsx`: new optional prop `backgroundColor?: string`, applied as `style={{ backgroundColor }}` on the existing outer `ref`'d `<div data-testid="tree-canvas">`. When `undefined`, no inline style is set and the div keeps its current (no-override) appearance.
- `TreeWorkspace.tsx`: calls the hook with its existing `treeId` prop and wires `effectiveColor` into `<TreeCanvas backgroundColor={effectiveColor} ... />`; renders the "Màu nền" sidebar control described in `research.md` §5, wiring its `<input type="color">` `onInput` to `onPreview` and its four buttons to `saveForTree` / `saveForAllTrees` / `resetTree` / `resetAllTreesDefault`.
