# Quickstart: Validating the Automated Supabase Deployment Workflow

Prerequisites: the three repository secrets exist (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` — contracts/supabase-deploy-workflow.md), and `.github/workflows/supabase-deploy.yml` is merged to `main`.

## 1. A harmless migration merged to main applies automatically (User Story 1)

1. On a branch, add a no-op-safe migration, e.g. `supabase/migrations/00xx_noop_comment.sql` containing only `comment on table public.event_notification_config is 'no-op validation migration';`.
2. Open a PR, merge it to `main`.
3. In the **Actions** tab, confirm a `supabase-deploy` run started automatically, and that its "Apply migrations" step succeeded.
4. Confirm the change reached the live project without running anything locally: `select obj_description('public.event_notification_config'::regclass);` via the Supabase SQL editor.

## 2. A harmless Edge Function change merged to main deploys automatically (User Story 2)

1. Make a comment-only change to `supabase/functions/send-event-reminders/index.ts`, merge to `main`.
2. Confirm the same run's "Deploy Edge Functions" step succeeded, and that it ran *after* "Apply migrations" (FR-003 — check the step order in the run log).

## 3. A failed migration blocks the function-deploy step in the same run (FR-004/SC-004)

1. On a branch, add a deliberately broken migration (e.g., referencing a nonexistent column) alongside a harmless function-code change.
2. Merge to `main`; confirm "Apply migrations" fails and "Deploy Edge Functions" shows as **skipped**, not attempted, in the same run.
3. Fix the migration in a follow-up commit/merge, or re-run via `workflow_dispatch` (see §4) once fixed.

## 4. On-demand re-run without a new commit (User Story 3)

1. From the Actions tab, select the workflow and click **Run workflow** on `main` with no preceding commit.
2. Confirm it runs the same "Link → Apply migrations → Deploy Edge Functions" sequence and reports the same kind of step-level status as an automatic run.

## 5. Overlapping runs queue instead of racing (Clarifications 2026-07-24)

1. Trigger the workflow via `workflow_dispatch`, then immediately trigger it again (a second manual run, or a merge) before the first finishes.
2. Confirm the second run's status shows **Queued**, and its steps do not start until the first run completes — never two runs with in-progress Supabase CLI steps at the same time.

## 6. No-op run is safe (FR-007)

1. Trigger the workflow via `workflow_dispatch` when nothing has changed since the last successful run.
2. Confirm it completes successfully with no live-project changes (both CLI commands are idempotent — research.md §1).
