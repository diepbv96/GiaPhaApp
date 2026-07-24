# Implementation Plan: Automated Supabase Deployment Workflow

**Branch**: `012-supabase-deploy-workflow` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-supabase-deploy-workflow/spec.md`

## Summary

Maintainers currently have to remember to run `supabase db push` and `supabase functions deploy` from a local terminal after merging schema or Edge Function changes — an easy step to forget or apply inconsistently. This feature adds a single new GitHub Actions workflow, `.github/workflows/supabase-deploy.yml`, triggered by a path-filtered push to `main` (or manually via `workflow_dispatch`), that runs the same two CLI commands in the same order a maintainer would, authenticated via three new GitHub Actions repository secrets (never a `.env` file), serialized against overlapping runs via a `cancel-in-progress: false` concurrency group, and stopping before the function-deploy step if the migration step fails. No application code changes; this is CI/CD configuration plus a documentation correction (FR-009).

## Technical Context

**Language/Version**: GitHub Actions workflow YAML; the steps themselves run the Supabase CLI (installed via `supabase/setup-cli@v1`, latest release) — no application language/runtime change.

**Primary Dependencies**: `actions/checkout@v4` and `supabase/setup-cli@v1` (both already-trusted, widely-used GitHub Actions; `actions/checkout` is already used in `deploy-pages.yml`); the Supabase CLI's `db push` and `functions deploy` subcommands.

**Storage**: N/A for this feature itself (no new schema) — the workflow's *target* is the project's existing single live Supabase Postgres project (`supabase/config.toml`'s `gia-pha-bui`).

**Testing**: No automated test framework applies to a CI workflow definition; validated via quickstart.md's six manual scenarios run against the real Actions tab (harmless migration, harmless function change, deliberately-broken migration, manual dispatch, overlapping-trigger queueing, no-op run).

**Target Platform**: `ubuntu-latest` GitHub-hosted runner (matches the existing `deploy-pages.yml` job).

**Project Type**: CI/CD automation added to the existing single-project repo — no new project/package boundary.

**Performance Goals**: N/A — a maintainer-triggered/merge-triggered deployment job, not a request-serving system; no latency/throughput target applies.

**Constraints**: Credentials MUST come from GitHub Actions repository secrets only, never a `.env` file (explicit pre-plan confirmation, now FR-008); overlapping runs MUST queue, never run concurrently or cancel each other (Clarifications 2026-07-24, FR-010); migrations MUST apply before, and MUST gate, function deployment in the same run (FR-003/FR-004).

**Scale/Scope**: Single workflow file, single job, five steps, three secrets, one existing Edge Function to deploy today (research.md §5) — matches the project's own single-maintainer, single-environment scale.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` contains only unfilled template placeholders (no principles ratified for this project) — there are no governing constraints to check against. Gate: **PASS (no applicable gates)**.

## Project Structure

### Documentation (this feature)

```text
specs/012-supabase-deploy-workflow/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── supabase-deploy-workflow.md
└── tasks.md               # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    ├── deploy-pages.yml         # UNCHANGED — existing static-site deploy, referenced only as the repo's own CI convention
    └── supabase-deploy.yml      # NEW — this feature's workflow (research.md, contracts/supabase-deploy-workflow.md)

README.md                        # "Event-reminder emails" manual-step instructions corrected to point at the new workflow (FR-009, research.md §6)
docs/event-notification-setup.md # IF this file already exists (011-email-template-schedule may implement first or later) — same correction applied there too
```

**Structure Decision**: This feature adds exactly one new file, `.github/workflows/supabase-deploy.yml`, alongside the repo's existing single GitHub Actions workflow — no new top-level directory, no application source changes. Documentation touch-points are corrected in place rather than duplicated (research.md §6).

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*
