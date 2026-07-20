# Research: Tree Display Customization

## 1. Color picker UI widget

**Decision**: Use the native HTML `<input type="color">` element.

**Rationale**: FR-004 requires "a full color picker (not a fixed preset list)" — the browser-native color input satisfies this with zero new dependencies. Critically, its `oninput` event fires continuously while the user drags inside the OS/browser color picker (not just on close), which directly satisfies the live-preview clarification (spec Clarifications, Q1) for free — no debouncing or custom picker component needed to get a "live" feel.

**Alternatives considered**:
- A JS color-picker library (e.g. `react-colorful`, `react-color`): rejected — adds a new dependency and bundle weight for a capability the platform already provides natively; would only be justified if cross-browser consistency of the picker's *own* UI chrome mattered, which it doesn't here (only the resulting hex value matters).

## 2. sessionStorage key shape

**Decision**: Two flat, unprefixed-JSON key patterns, values are raw hex strings:
- `giapha:bg-color:tree:{treeId}` — tree-specific override
- `giapha:bg-color:all-trees` — all-trees default

**Rationale**: `<input type="color">` always yields a 7-character lowercase hex string (`#rrggbb`), so no serialization is needed — `sessionStorage.getItem`/`setItem` can store the value directly. Flat keys avoid a JSON blob that has to be parsed/re-written on every change (and the corruption-handling that implies) and keep "reset" trivial (`removeItem` on the one relevant key).

**Alternatives considered**:
- Single JSON blob (`giapha:bg-color` → `{ allTrees?: string; byTree: Record<string, string> }`): rejected — every read/write needs a parse+stringify round trip and defensive handling of malformed JSON (e.g. from a future incompatible version), for no benefit over flat keys at this scale (one browser tab, a handful of trees).

## 3. Precedence resolution (FR-007)

**Decision**: `resolveBackgroundColor(treeId)` reads, in order: (1) an in-memory live-preview value if the picker is currently open and being dragged, (2) `giapha:bg-color:tree:{treeId}`, (3) `giapha:bg-color:all-trees`, (4) `undefined` (→ app default, i.e. no override applied).

**Rationale**: Directly implements the tree-specific-overrides-all-trees-default rule from FR-007 and the live-preview clarification (Q1) as a simple ordered fallback, with the reset actions (FR-010) mapping 1:1 to removing one of the two sessionStorage keys.

## 4. Where the resolved color is applied

**Decision**: Pass the resolved color down from `TreeWorkspace` to `TreeCanvas` as a new `backgroundColor?: string` prop, applied as an inline `style.backgroundColor` on `TreeCanvas`'s existing outer `ref`'d `<div data-testid="tree-canvas">` — the same node `ExportButton`/`html-to-image` already captures.

**Rationale**: That `div` is a full-bleed container already used as the export "viewport" (`src/features/tree/TreeWorkspace.tsx`'s `viewportRef`, forwarded into `TreeCanvas`), so painting the background there automatically satisfies the export edge case (spec Edge Cases: "export captures whatever background is currently in effect") with no changes to `exportService.ts` — `html-to-image`'s `toPng(viewportEl, { backgroundColor: "#fffaf0", ... })` only fills what's *transparent* in the cloned DOM; once the viewport div has its own opaque `backgroundColor` style, that fallback never becomes visible.

**Alternatives considered**:
- Passing the color into `@xyflow/react`'s `<Background>` component (`color` prop): rejected — that prop only tints the dot-grid pattern layer, not a full opaque backdrop, so panning/zooming past the dot layer's edges (or before it paints) would still show the underlying page background, not the chosen color.

## 5. UI placement of the color control

**Decision**: A new expandable item ("Màu nền" / Background color) inside `TreeWorkspace`'s existing "Hiển thị" sidebar section — the same section already holding the "Ẩn dâu/rễ" toggle and the export button — containing the `<input type="color">`, a "Lưu cho cây này" (save for this tree) button, a "Lưu cho tất cả cây" (save as all-trees default) button, and two reset actions ("Đặt lại màu cây này" / "Đặt lại mặc định chung").

**Rationale**: Consistent with how the existing per-tree display toggle already lives in that section; the control is a handful of inline elements, not a multi-field form, so it doesn't warrant the app's `Modal` pattern (reserved for CRUD forms elsewhere in the codebase).

## 6. Card living/deceased + gender-on-avatar styling

**Decision**: Pure CSS/Tailwind change confined to `src/features/tree/IndividualNode.tsx` and four new CSS custom properties in `src/styles/theme.css` (`--color-card-living-border`, `--color-card-living-bg`, `--color-card-deceased-border`, `--color-card-deceased-bg`). The existing `genderBorderColor` map moves from the outer card `<div>`'s `style.borderTop` to the inner avatar `<div>`'s `style.border` (a full border around the circular avatar instead of a 4px top edge on the card). The outer card `<div>` gains a full border + background pair selected by `individual.isDeceased`, replacing its current flat `bg-[var(--color-surface-raised)]`.

**Rationale**: No new data — `isDeceased` and `gender` already exist on `Individual` (`src/types/index.ts`). This is confirmed against the live component (see spec.md's grounding), so the change is additive/relocation only, matching FR-001–FR-003.

## 7. No backend/RLS impact

**Decision**: This feature touches no Supabase tables, RLS policies, or Edge Functions. `sessionStorage` is exclusively client-local (FR-008), and the card styling change is a pure rendering change against fields already selected by existing queries.

**Rationale**: Confirmed by reading `IndividualNode.tsx`, `TreeCanvas.tsx`, and `src/types/index.ts` — nothing here requires a new column, query, or policy.
