# Tasks: Tree Display Customization — Card Status Styling & Background Color

**Input**: Design documents from `/specs/004-tree-display-customization/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Not explicitly requested in spec.md; no dedicated per-story test-writing tasks are included. No existing test currently asserts the old card-border/gender-on-card behavior or references `sessionStorage` background colors (verified by search), so there is nothing to fix from the refactor itself — the Polish phase still runs the full existing suite plus `quickstart.md` to catch anything unexpected.

**Organization**: Tasks are grouped by user story (spec.md priorities P1–P2) to enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- File paths below are relative to the repository root; `@/` is the `src/` alias (`vite.config.ts`)

---

## Phase 1: Setup (Shared Infrastructure)

None required. No new dependency, tooling config, or shared type is needed (`research.md` §1 confirms the native `<input type="color">` needs no package) — both stories add/modify existing feature files only.

---

## Phase 2: Foundational (Blocking Prerequisites)

None required. US1 (`IndividualNode.tsx`, `theme.css`) and US2 (`backgroundColorPreference.ts`, `useBackgroundColorPreference.ts`, `TreeCanvas.tsx`, `TreeWorkspace.tsx`) touch entirely disjoint files and share no new abstraction — either can be built first.

---

## Phase 3: User Story 1 - Tell Who's Living or Deceased at a Glance, and Gender From the Avatar (Priority: P1) 🎯 MVP

**Goal**: Every person's card border+background communicates living-vs-deceased at a glance; the gender-color indicator moves from the card's border to the avatar's border.

**Independent Test**: Open any family tree with at least one deceased and one living person; confirm their cards are visually distinguishable as deceased vs. living without opening either one's detail panel; confirm each card's gender indicator now appears as a border around the avatar image, not around the card.

### Implementation for User Story 1

- [X] T001 [P] [US1] Add `--color-card-living-border`, `--color-card-living-bg`, `--color-card-deceased-border`, `--color-card-deceased-bg` to the `@theme` block in `src/styles/theme.css`, chosen to stay legible against `--color-surface` (#fffaf0) and against arbitrary custom canvas backgrounds, per `research.md` §6
- [X] T002 [US1] In `src/features/tree/IndividualNode.tsx`: move the existing `genderBorderColor[individual.gender]` lookup from the outer card `<div>`'s `style.borderTop` to the avatar `<div>`'s `style.border` (e.g. `3px solid ...`), and replace the outer card's `style.borderTop` + `bg-[var(--color-surface-raised)]` className with a full `border` + `backgroundColor` pair selected by `individual.isDeceased` using the new tokens from T001, per `contracts/person-card-styling.md` (depends on T001)

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - Personalize the Tree's Background Color for This Browser Session (Priority: P2)

**Goal**: Any visitor (signed in or guest) can pick a color from a full color picker, previewed live, and save it as specific to the current tree or as a default for all trees — stored only in `sessionStorage`, with independent reset actions for each scope.

**Independent Test**: Open any family tree, use the background color control to pick and save a custom color for that tree, confirm it takes effect immediately and again after reloading the page (same browser session); confirm a different browser/session never sees this choice.

### Implementation for User Story 2

- [X] T003 [P] [US2] Create `src/features/tree/backgroundColorPreference.ts` with `getTreeColor`, `setTreeColor`, `clearTreeColor`, `getAllTreesDefaultColor`, `setAllTreesDefaultColor`, `clearAllTreesDefaultColor`, and `resolveBackgroundColor` (tree-specific overrides all-trees default, else `undefined`), reading/writing the `giapha:bg-color:tree:{treeId}` / `giapha:bg-color:all-trees` `sessionStorage` keys directly (no JSON, no in-memory cache), per `contracts/background-color-preference.md`
- [X] T004 [US2] Create `src/features/tree/useBackgroundColorPreference.ts` — a hook taking `treeId: string` and returning `{ effectiveColor, previewColor, onPreview, saveForTree, saveForAllTrees, resetTree, resetAllTreesDefault }`, where `effectiveColor = previewColor ?? resolveBackgroundColor(treeId)`, `previewColor` resets to `undefined` whenever `treeId` changes, and `saveForTree`/`saveForAllTrees` persist `previewColor` then clear it, per `contracts/background-color-preference.md` (depends on T003)
- [X] T005 [P] [US2] Add an optional `backgroundColor?: string` prop to `TreeCanvasProps` in `src/features/tree/TreeCanvas.tsx`, applied as `style={{ backgroundColor }}` on the existing outer `ref`'d `<div data-testid="tree-canvas">` (no style at all when `undefined`)
- [X] T006 [US2] Create `src/features/tree/BackgroundColorControl.tsx` — an expandable sidebar row ("Màu nền") matching the existing `sidebarItemClass` styling, containing a native `<input type="color">` wired to `onPreview`, a "Lưu cho cây này" button (`saveForTree`), a "Lưu cho tất cả cây" button (`saveForAllTrees`), and two reset actions ("Đặt lại màu cây này" / `resetTree`, "Đặt lại mặc định chung" / `resetAllTreesDefault`), per `research.md` §5 (depends on T004)
- [X] T007 [US2] In `src/features/tree/TreeWorkspace.tsx`: call `useBackgroundColorPreference(treeId)`, pass its `effectiveColor` to `<TreeCanvas backgroundColor={effectiveColor} ... />`, and render `<BackgroundColorControl ... />` inside the existing "Hiển thị" `SidebarSection`, alongside the "Ẩn dâu/rễ" toggle (depends on T005, T006)

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across both stories.

- [X] T008 [P] Search `tests/unit/*` and `tests/e2e/*` for any assertion tied to the old card-border-for-gender behavior or the absence of a background-color control; none were found in this feature's research, so this task is a final confirmation pass, fixing anything unexpected — confirmed via `grep` for `borderTop`, `genderBorderColor`, `sessionStorage`, `bg-color`, `Màu nền`: zero matches in `tests/`, nothing to fix
- [X] T009 Run all `quickstart.md` validation scenarios end-to-end (depends on T002, T007) — including `npx tsc -b`, `npx eslint .`, `npx vitest run`, and `npm run build`; fix any gaps found — no live Supabase project in this sandbox (same constraint noted in features 001–003), so this was a code-level trace of each of the 10 quickstart steps against the actual implementation (all 10 check out — see below), plus `npx tsc -b --noEmit` (clean), `npx eslint .` (0 errors, the same 4 pre-existing unrelated warnings), `npx vitest run` (75/75 passing, unchanged — no existing test needed updating per T008), and `npm run build` (succeeded); no gaps found

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: Empty — start directly with User Story 1 or User Story 2
- **User Story 1 (Phase 3)**: No dependency on User Story 2
- **User Story 2 (Phase 4)**: No dependency on User Story 1 — shares no file with it
- **Polish (Phase 5)**: Depends on both user stories being complete

### Parallel Opportunities

- T001 (US1) and T003/T005 (US2) touch different files and can all run in parallel
- T003 and T005 (US2) touch different files and can run in parallel
- User Story 1 (T001–T002) and User Story 2 (T003–T007) can be built entirely in parallel by different people
- T008 (Polish) can run in parallel with T009

---

## Parallel Example: Cross-Story

```bash
# Nothing blocks either story (Setup/Foundational are empty), so these can start together:
Task: "Add card status tokens to src/styles/theme.css"                        # T001 (US1)
Task: "Create src/features/tree/backgroundColorPreference.ts"                 # T003 (US2)
Task: "Add optional backgroundColor prop to src/features/tree/TreeCanvas.tsx" # T005 (US2)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (T001–T002)
2. **STOP and VALIDATE**: Confirm living/deceased is visible on cards and gender now reads from the avatar border
3. Deploy/demo if ready — this alone benefits every visitor with zero interaction required

### Incremental Delivery

1. User Story 1 (MVP) → validate → deploy
2. Add User Story 2 (background color picker) → validate independently → deploy
3. Polish (T008–T009) once both are in

### Notes

- `[P]` tasks touch different files with no unmet dependency
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before moving on
