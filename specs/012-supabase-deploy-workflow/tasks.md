# Tasks: Automated Supabase Deployment Workflow

**Input**: Design documents from `/specs/012-supabase-deploy-workflow/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/supabase-deploy-workflow.md](./contracts/supabase-deploy-workflow.md), [quickstart.md](./quickstart.md)

**Tests**: Not requested by the spec, and no automated test framework applies to a CI workflow definition (plan.md "Testing"). Validation is manual, via quickstart.md's six scenarios (Polish phase T012).

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P3). Because this feature is a single YAML workflow file, most tasks add distinct, independently-addable keys/steps to that one file rather than separate files — dependencies below make the same-file ordering explicit.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Phase 1: Setup

- [X] T001 Create `.github/workflows/supabase-deploy.yml` with a single job skeleton — `name`, `runs-on: ubuntu-latest`, and a `Checkout` step (`actions/checkout@v4`, matching `deploy-pages.yml`'s existing convention) — no triggers, concurrency, or Supabase steps yet

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story's steps can succeed until this is done — every story's CLI commands need these credentials.

- [ ] T002 Create the three required repository secrets — `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` — under GitHub Settings → Secrets and variables → Actions, per contracts/supabase-deploy-workflow.md "Required repository configuration" — **NOT done**: requires the repository owner's own GitHub credentials/permissions, unavailable in this environment

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Database migrations apply automatically on merge (Priority: P1) 🎯 MVP

**Goal**: A push to `main` touching `supabase/migrations/**` automatically links to the live project and applies pending migrations, failing clearly (and distinguishably from an auth failure) if a migration doesn't apply.

**Independent Test**: quickstart.md §1 (harmless migration merges and applies automatically) and the migration-failure half of §3 (a broken migration fails the run clearly).

### Implementation for User Story 1

- [X] T003 [US1] Add the `on.push` trigger to `.github/workflows/supabase-deploy.yml`: `branches: [main]`, `paths: ['supabase/migrations/**']` (research.md §4) (depends on T001)
- [X] T004 [US1] Add the "Set up Supabase CLI" step (`supabase/setup-cli@v1`) to `.github/workflows/supabase-deploy.yml` (depends on T001)
- [X] T005 [US1] Add the "Link project" step (`supabase link --project-ref $SUPABASE_PROJECT_REF`, with `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` from secrets) to `.github/workflows/supabase-deploy.yml` (depends on T002, T004)
- [X] T006 [US1] Add the "Apply migrations" step (`supabase db push --yes`, with `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` from secrets) to `.github/workflows/supabase-deploy.yml` (depends on T005) — `--yes` added beyond the original task wording to skip the CLI's interactive confirmation prompt, which would otherwise hang a non-interactive CI runner

**Checkpoint**: User Story 1 is fully functional and testable independently — merging a migration-only change now deploys it with no local command.

---

## Phase 4: User Story 2 - Edge Functions deploy automatically on merge (Priority: P2)

**Goal**: A push to `main` touching `supabase/functions/**` also deploys the changed function(s), only after migrations in the same run have succeeded.

**Independent Test**: quickstart.md §2 (harmless function change deploys automatically, after the migrations step) and the function-skip half of §3 (a failed migration step means the function-deploy step is skipped, not attempted).

### Implementation for User Story 2

- [X] T007 [US2] Extend `on.push.paths` in `.github/workflows/supabase-deploy.yml` to also include `'supabase/functions/**'` (depends on T003)
- [X] T008 [US2] Add the "Deploy Edge Functions" step (`supabase functions deploy`, with `SUPABASE_ACCESS_TOKEN` from secrets) as the final step in `.github/workflows/supabase-deploy.yml`, positioned after "Apply migrations" (depends on T006)

**Checkpoint**: User Stories 1 and 2 both work — FR-003/FR-004 (migrations-before-functions, stop-on-migration-failure) hold with no extra logic, since GitHub Actions already skips later steps after a failed one (research.md §2).

---

## Phase 5: User Story 3 - Re-run on demand without a new commit (Priority: P3)

**Goal**: The same migrate-and-deploy sequence can be started manually from the Actions tab, with no new commit required.

**Independent Test**: quickstart.md §4 (manual `workflow_dispatch` run reports the same step-level status as an automatic run).

### Implementation for User Story 3

- [X] T009 [US3] Add `on.workflow_dispatch:` (no inputs) to `.github/workflows/supabase-deploy.yml` (depends on T001; independent of the `on.push` trigger added in T003/T007)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T010 [P] Add the `concurrency` block (`group: supabase-deploy`, `cancel-in-progress: false`) to `.github/workflows/supabase-deploy.yml` (research.md §3, Clarifications 2026-07-24; applies to every trigger/story equally, so it's cross-cutting rather than story-specific) (depends on T001)
- [X] T011 [P] Correct `README.md`'s "Event-reminder emails (Edge Function)" manual `supabase functions deploy` / `supabase db push` instructions to point at this workflow instead (FR-009, research.md §6); `docs/event-notification-setup.md` existed by implementation time (011 implemented first in the same session), so it was corrected instead — its steps 2–3 now say deployment/migration is automatic
- [ ] T012 Execute quickstart.md validation scenarios 1–6 against the real Actions tab (harmless migration, harmless function change, broken-migration gating, manual dispatch, overlapping-run queueing, no-op run) and record results (depends on T003–T011 all complete) — **NOT executed**: no `gh`/live GitHub Actions access in this environment; requires a maintainer to run manually after merging (see completion report)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — create the skeleton file first.
- **Foundational (Phase 2)**: Can be done in parallel with Setup (it's a GitHub Settings action, not a file edit) — but BLOCKS every user story's steps from succeeding in a real run.
- **User Stories (Phase 3–5)**: All depend on T001 (the skeleton file existing) and T002 (secrets existing) to actually run successfully; the YAML keys/steps they add are otherwise independent of each other except where noted below.
- **Polish (Phase 6)**: T010/T011 can start once T001 exists; T012 depends on every story's steps being in place.

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Setup + Foundational.
- **User Story 2 (P2)**: Its "Deploy Edge Functions" step (T008) depends on User Story 1's "Apply migrations" step (T006) already existing, by design (FR-003 — functions deploy after migrations in the same job).
- **User Story 3 (P3)**: Depends only on Setup — the `workflow_dispatch` trigger is independent of the `push` trigger's content.

### Parallel Opportunities

- T002 (Foundational) can happen at any point in parallel with T001/T003–T009 (it's a repository setting, not a file edit).
- T009 (US3) can be done in parallel with T003–T008 (US1/US2) — different key (`workflow_dispatch` vs. `push`) in the same `on:` map, no content overlap.
- T010 and T011 (Polish) can run in parallel — different files (`supabase-deploy.yml`'s top-level `concurrency` key vs. `README.md`).

---

## Parallel Example: Foundational + independent trigger work

```bash
Task: "Create the three required repository secrets under GitHub Settings → Secrets and variables → Actions"
Task: "Add on.workflow_dispatch: (no inputs) to .github/workflows/supabase-deploy.yml"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001) and Phase 2 (T002).
2. Complete Phase 3 (T003–T006).
3. **STOP and VALIDATE**: run quickstart.md §1 and the migration-failure half of §3.
4. Merge — migrations now apply automatically, even before Edge Functions or manual re-run exist.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. User Story 1 → validate → merge (MVP!).
3. User Story 2 → validate via quickstart.md §2–3 → merge.
4. User Story 3 → validate via quickstart.md §4 → merge.
5. Polish (concurrency + docs + full quickstart pass) → merge.

---

## Notes

- 12 tasks total: 1 (Setup) + 1 (Foundational) + 4 (US1) + 2 (US2) + 1 (US3) + 3 (Polish).
- Every task names its exact file path except T002 (a GitHub Settings action, referenced against contracts/supabase-deploy-workflow.md) and T012 (a validation pass against quickstart.md, not a file edit).
- No contract/unit test tasks were generated — this feature has no application code, and its "contract" (contracts/supabase-deploy-workflow.md) is validated by actually running the workflow (T012), not by a test suite.
