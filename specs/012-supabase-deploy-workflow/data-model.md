# Data Model: Automated Supabase Deployment Workflow

This feature introduces no application database schema. Its "entities" (per spec.md's Key Entities) are CI/CD configuration and GitHub-hosted state, documented here for completeness.

## Automated Deployment Run

Realized as: one execution of the new `.github/workflows/supabase-deploy.yml` workflow (a GitHub Actions run).

| Attribute | Realized as |
|---|---|
| Start time | The run's own `created_at` (GitHub Actions run metadata — no app-level timestamp needed). |
| Trigger | `push` to `main` (paths-filtered — research.md §4) or manual `workflow_dispatch`. |
| Per-step outcome | The job's individual step statuses (`Set up Supabase CLI` / `Link project` / `Apply migrations` / `Deploy Edge Functions`), each pass/fail independently visible in the run UI. |
| Overall status | The job's/run's own success-or-failure status, derived automatically from step statuses (a failed step fails the job; GitHub Actions default). |
| Serialization | Enforced by the workflow's `concurrency` block (`group: supabase-deploy`, `cancel-in-progress: false` — research.md §3) — a second run's steps literally cannot start while an in-progress run holds the group. |

No new persistence is introduced to represent a "run" — GitHub's own Actions run history *is* the audit record (SC-003).

## Live Supabase Project Credentials

Realized as: three GitHub Actions **repository secrets** (Settings → Secrets and variables → Actions), consumed only as step-level `env` vars, never written to a file:

| Secret name | Used by | Source |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | `supabase link`, `supabase functions deploy` | Supabase dashboard → Account → Access Tokens |
| `SUPABASE_PROJECT_REF` | `supabase link --project-ref` | Supabase dashboard project URL / `supabase/config.toml` |
| `SUPABASE_DB_PASSWORD` | `supabase db push` (non-interactive DB auth) | Supabase dashboard → Project Settings → Database |

None of these are new *concepts* to the project (the CLI already needs them for the manual flow this replaces — `README.md`'s existing steps), only new as GitHub-stored secrets rather than something a maintainer types at a local prompt.

## Workflow Trigger Configuration

Realized as: the `on:` block of `.github/workflows/supabase-deploy.yml` (research.md §4) — `push` to `main` filtered to `supabase/migrations/**` and `supabase/functions/**`, plus `workflow_dispatch` with no inputs (Story 3 needs no parameters; it just re-runs the same steps).
