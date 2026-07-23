# Tasks: Cascade-Hide In-Law-Only Relatives

**Input**: Design documents from `/specs/010-hide-inlaw-relatives/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Not explicitly requested in spec.md, but plan.md's Technical Context already commits to extending `tests/unit/inLawFilter.test.ts`, and this codebase's established convention (spec 008/009) is to pair a behavior change like this with both a unit test and an e2e `test.describe` block — followed here for consistency.

**Organization**: Single user story (spec.md: US1, P1) — no Setup or Foundational phase is needed; this is a small, self-contained fix confined to one function and its one call site.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unmet dependency)
- **[Story]**: Which user story this task belongs to (US1)
- File paths below are relative to the repository root

---

## Phase 1: Setup (Shared Infrastructure)

None required. No new dependency, migration, or tooling config is needed (plan.md Technical Context: zero new npm packages, no storage change).

---

## Phase 2: Foundational (Blocking Prerequisites)

None required. The entire feature is User Story 1's own implementation — there is no shared infrastructure step that isn't itself part of that story.

---

## Phase 3: User Story 1 - A Married-In Relative's Own Family Disappears Too (Priority: P1) 🎯 MVP

**Goal**: When "Ẩn dâu/rễ" is enabled, an in-law's exclusive children and further descendants (anyone whose only recorded ancestry traces back to a now-hidden in-law) disappear along with the in-law, while any relative who is also a genuine blood descendant through another parent (e.g. a shared child) stays visible — and turning the toggle off restores everyone with no data change.

**Independent Test**: In a tree where an in-law has a child recorded from outside the family's blood line, enable "Ẩn dâu/rễ" and confirm that child (and their own descendants, if any) are no longer shown, while a child shared between the in-law and their blood-relative spouse remains visible; disable the toggle and confirm everyone reappears.

### Implementation for User Story 1

- [X] T001 [US1] Rewrite `filterOutInLaws` in `src/features/tree/inLawFilter.ts`: keep the existing `inLawIds` computation unchanged (FR-004), then replace the current "individuals minus inLawIds" filter with a memoized recursive `bloodKept(x)` predicate over `parent_child` relationships only — `bloodKept(x) = true` if `x` has no recorded parent (today's founder rule, unchanged), otherwise `true` iff at least one recorded parent `p` satisfies `p ∉ inLawIds AND bloodKept(p)`. `keepIds` = individuals not in `inLawIds` with `bloodKept = true`; filter `individuals` and `relationships` down to `keepIds` exactly as today's function already filters down to "not in `inLawIds`". Update the function's doc comment to describe the new rule. Per `contracts/cascade-in-law-filter.md` steps 1-4, `research.md` §2, `data-model.md` Examples A-F.
- [X] T002 [P] [US1] In `src/features/tree/TreeCanvas.tsx`: reorder the two existing `useMemo` calls so `displayGraph` (the `hideInLaws ? filterOutInLaws(graph) : graph` memo) is computed first, then change `computeIsolatedIds(graph)` to `computeIsolatedIds(displayGraph)` with dependency array `[displayGraph]`. No other change to this file — same props, same JSX, same behavior when `hideInLaws` is `false` (`displayGraph === graph` in that case). Per `contracts/cascade-in-law-filter.md`'s companion change, `research.md` §2a.
- [X] T003 [P] [US1] Extend `tests/unit/inLawFilter.test.ts` with three new cases (the three existing cases must keep passing unmodified): (1) an in-law's exclusive child (no shared parent with the blood spouse) is hidden along with the in-law — `data-model.md` Example C; (2) that exclusive child's own child (an exclusive grandchild) is also hidden, in the same call, with no separate iteration needed — Example D; (3) a child shared between the in-law and their blood-relative spouse (two recorded parents, one an in-law) stays visible — Example E. Depends on T001. Verified: `npx vitest run inLawFilter` — 6/6 pass (3 existing + 3 new).
- [X] T004 [US1] Add e2e test in `tests/e2e/family-tree.spec.ts`, new `test.describe("Spec 010 - Cascade-hide in-law-only relatives")`: build the scenario from `quickstart.md` (a blood-line child, that child's in-law spouse, the in-law's exclusive child, the exclusive child's own child, and a child shared between the couple), enable "Ẩn dâu/rễ" and assert the in-law and both exclusive descendants are gone from the canvas while the shared child remains, then disable the toggle and assert every individual and relationship reappears; clean up the individuals created for the test. Depends on T001, T002. Verified with `npx playwright test --list` (registers correctly as `family-tree.spec.ts:449`); **not executed** — no `.env`/live Supabase backend is configured in this sandbox (same caveat as specs 008/009's e2e tasks), so actual pass/fail could not be confirmed here.

**Checkpoint**: User Story 1 is fully functional and independently testable — enabling "Ẩn dâu/rễ" leaves no orphaned in-law-only relatives on the canvas, and disabling it restores the full tree.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across the story.

- [X] T005 [P] Run `npx tsc -b`, `npx eslint .`, and `npx vitest run` — confirm zero new type errors, zero new lint errors, and all unit tests (existing + T003's new cases) pass. Ran clean: `npx tsc -b` (0 errors), `npx eslint .` (0 errors, 4 pre-existing warnings unrelated to this change), `npx vitest run` (95/95 tests pass across 13 files), `npm run build` (succeeds).
- [X] T006 Run `quickstart.md`'s manual validation steps against a running dev server (`npm run dev`) as the seeded admin, confirming the User Story 1 scenario and the regression check both behave as documented; if no live Supabase backend is available in the current environment, note that explicitly rather than claiming it was verified. **Not executed** — this sandbox has no `.env`/live Supabase project configured (only `.env.example`, no `supabase` CLI, no reachable local instance), so the manual browser walkthrough could not be run here. The regression-check portion (`npm run test -- inLawFilter`) was run and passes (see T003/T005). Recommend running the full manual quickstart against a real dev/staging Supabase project before merging.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: Empty — start directly with User Story 1
- **User Story 1 (Phase 3)**: No dependency on any other story (there is only one)
- **Polish (Phase 4)**: Depends on User Story 1 being complete

### Within User Story 1

- T001 is the core implementation task; T002 is an independent edit to a different file that only becomes *meaningful* once T001 lands (before T001, `displayGraph` already equals `graph` whenever `hideInLaws` is off, and the reorder itself changes nothing observable on its own) — the two can be implemented in either order or in parallel
- T003 depends on T001 (the new cascade cases will fail against the old implementation)
- T004 depends on T001 and T002 (exercises both the cascade and the isolated-individual companion fix end-to-end)

### Parallel Opportunities

- T002 and T003 can be worked on in parallel once T001 lands (different files: `TreeCanvas.tsx` vs `inLawFilter.test.ts`)
- T005 (Polish) can run as soon as T001-T004 are in place

---

## Parallel Example: User Story 1

```bash
# Once T001 lands, these can run in parallel:
Task: "Reorder useMemo calls in src/features/tree/TreeCanvas.tsx"                       # T002
Task: "Extend cascade cases in tests/unit/inLawFilter.test.ts"                           # T003
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (T001-T004) — this *is* the whole feature
2. **STOP and VALIDATE**: Confirm an in-law's exclusive descendants disappear with the toggle on, a shared child stays visible, and the toggle-off state is unaffected
3. Deploy/demo if ready

### Incremental Delivery

1. User Story 1 (MVP) → validate → deploy
2. Polish (T005-T006) once T001-T004 are in

### Notes

- `[P]` tasks touch different files with no unmet dependency
- Commit after each task or logical group
- This is a small, single-story change — there is no cross-story file-overlap concern
