# Contract: `.github/workflows/supabase-deploy.yml`

This is the "external interface" for this feature — the workflow file's trigger conditions, step contract, and required repository configuration, which a maintainer or a future editor of this file must preserve.

## Triggers

| Trigger | Condition | Satisfies |
|---|---|---|
| `push` to `main` | Only when the diff touches `supabase/migrations/**` or `supabase/functions/**` | User Stories 1 & 2 (FR-001, FR-002); avoids running Supabase CLI commands for unrelated merges (research.md §4) |
| `workflow_dispatch` | Manually started from the Actions tab, no inputs | User Story 3 (FR-005) |

## Concurrency

- `concurrency.group: supabase-deploy`
- `concurrency.cancel-in-progress: false`

**MUST NOT** be changed to `cancel-in-progress: true` — that is the exact behavior Clarifications (2026-07-24) ruled out for this workflow (FR-010). A second trigger while a run is in progress queues behind it instead.

## Job contract (single job, sequential steps — order MUST be preserved)

| Order | Step | Failure meaning | On failure |
|---|---|---|---|
| 1 | Checkout | Repo checkout itself failed (rare/infra-level) | Job stops; no Supabase step ran at all. |
| 2 | Set up Supabase CLI (`supabase/setup-cli@v1`) | Couldn't install the CLI | Job stops before any live-project contact. |
| 3 | Link project (`supabase link --project-ref $SUPABASE_PROJECT_REF`) | Authentication/project-reference problem (Edge Case: "couldn't even authenticate") | Job stops; **no migration or function step runs**. |
| 4 | Apply migrations (`supabase db push`) | A migration failed to apply (Edge Case: "authenticated but the migration itself failed") | Job stops; **Edge Function deploy step does not run** (FR-004, SC-004). |
| 5 | Deploy Edge Functions (`supabase functions deploy`) | A function failed to deploy | Job (and run) reports failure; migrations from step 4 already succeeded and are not rolled back (out of scope — see spec Assumptions; migrations are not expected to be transactionally tied to function deploys). |

Every step MUST have a distinct, human-readable name (as listed above) — this is what makes step-level status (FR-006) and the auth-vs-migration distinction (Edge Cases) visible in the Actions run UI without any custom reporting code.

## Required repository configuration (one-time, outside this workflow file)

Three secrets MUST exist under **Settings → Secrets and variables → Actions** before this workflow can succeed (data-model.md "Live Supabase Project Credentials"): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`. None are read from any `.env` file, committed or otherwise (FR-008).

## Idempotency contract (FR-007)

Running this workflow (via either trigger) when there is nothing new to migrate or deploy MUST complete with a green/successful run and zero live-project changes. This holds without any extra guard logic in the workflow itself, because both underlying CLI commands are idempotent by design (research.md §1): `supabase db push` only applies migrations not already recorded as applied; `supabase functions deploy` re-uploads identical code with no functional effect.
