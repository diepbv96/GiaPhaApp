# Research: Automated Supabase Deployment Workflow

## 1. How does GitHub Actions authenticate and run Supabase CLI commands non-interactively?

**Decision**: Use the official `supabase/setup-cli@v1` action to install the CLI, then run `supabase link --project-ref $SUPABASE_PROJECT_REF` followed by `supabase db push` and `supabase functions deploy`, with `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` exported as step-level `env` from GitHub Actions secrets (never from a file — per the explicit confirmation ahead of this plan).

**Rationale**: This is Supabase's own documented CI pattern (mirrors what a maintainer would type locally, per the feature's own framing of "instead of trigger manually via terminal") and requires no bespoke Docker image or custom auth handling. `SUPABASE_ACCESS_TOKEN` authenticates CLI-to-API calls (needed for `link` and `functions deploy`); `SUPABASE_DB_PASSWORD` is required for `db push` to open a non-interactive Postgres connection (the CLI otherwise prompts for it, which a CI runner can't answer).

**Alternatives considered**: Calling the Supabase Management API directly via `curl`/a custom script — rejected as significantly more code to maintain for no behavioral gain over the CLI, which already does exactly this.

## 2. How is "migrations before functions, stop on migration failure" (FR-003/FR-004) implemented?

**Decision**: A single job with sequential steps — CLI setup → link → `db push` → `functions deploy` — relying on GitHub Actions' default step behavior: if a step fails, all subsequent steps in that job are skipped automatically (no `continue-on-error`, no `if: always()` on the deploy step).

**Rationale**: This is the ordering guarantee for free, with zero custom logic. It also directly satisfies the Edge Case requirement to distinguish "couldn't authenticate" from "migration itself failed" — `link` and `db push` are separate, clearly-named steps, so the run UI shows exactly which one failed rather than a single opaque "deploy" step.

**Alternatives considered**: Two separate jobs (`migrate` → `deploy-functions` via `needs:`) — rejected as unnecessary indirection; a single job's step ordering already gives the same stop-on-failure guarantee with less YAML and one shared checkout/CLI-install instead of two.

## 3. How are overlapping runs serialized (Clarifications 2026-07-24: queue, never run concurrently)?

**Decision**: A `concurrency` block at the workflow level: `group: supabase-deploy`, `cancel-in-progress: false`.

**Rationale**: `cancel-in-progress: false` is exactly GitHub Actions' built-in "queue, don't cancel" behavior — a second run targeting the same concurrency group waits (shows as "Queued") until the first finishes, entirely at the platform level, before any step (let alone `db push`) executes. This satisfies FR-010 with a two-line YAML addition and no custom locking (e.g., a Postgres advisory lock) is needed. Contrast with the repo's existing `deploy-pages.yml`, which intentionally uses `cancel-in-progress: true` for static-site deploys (superseding an old deploy with a new one is safe there) — this workflow deliberately uses the opposite setting because superseding a live migration mid-apply is not safe (research.md of `011-email-template-schedule` reached the analogous conclusion for its own scheduling concern).

**Alternatives considered**: `cancel-in-progress: true` (matching `deploy-pages.yml`) — rejected; explicitly the option the Clarifications session ruled out. A custom Postgres advisory lock acquired at the start of `db push` — rejected as redundant: GitHub's queueing already prevents two runs from starting in the first place, so a same-outcome in-database lock would only ever fire in a scenario (two runs' steps literally executing at the same instant) that the concurrency group has already made impossible.

## 4. What triggers a run (Story 1/2 automatic + Story 3 on-demand)?

**Decision**:
```yaml
on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'
      - 'supabase/functions/**'
  workflow_dispatch:
```

**Rationale**: The `paths` filter means unrelated frontend-only merges never trigger a run at all — directly satisfying FR-007's "no pending migrations and no changed function code" case for the common case, at the trigger level rather than needing the job itself to detect "nothing to do" (though `db push`/`functions deploy` are already safe/idempotent regardless — research.md §1). `workflow_dispatch` (no inputs needed) gives Story 3's re-run-without-a-commit capability directly from the Actions tab.

**Alternatives considered**: Triggering on every push to `main` regardless of path — rejected as it would run Supabase CLI commands (network calls, a real `db push` attempt) for merges that touched nothing Supabase-related, adding noise to every run history and needlessly spending CI minutes.

## 5. What GitHub secrets are required, and what's already true vs. new?

**Decision**: Three repository secrets, none of which exist yet for this purpose: `SUPABASE_ACCESS_TOKEN` (a Supabase personal access token, from the Supabase dashboard's Account → Access Tokens), `SUPABASE_PROJECT_REF` (the project ref already visible in `supabase/config.toml`'s local link, or the dashboard URL), `SUPABASE_DB_PASSWORD` (the database password set when the project was created, resettable from the dashboard if forgotten). The existing `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` secrets (already used by `deploy-pages.yml`) are unrelated — those are client-side, publishable values for the built app, not CLI-authentication credentials, and this feature doesn't touch them.

**Rationale**: These three are the minimum the CLI itself requires for `link` + `db push` + `functions deploy`, per research.md §1 — no additional secret is needed for any FR in the spec.

**Alternatives considered**: A single combined "Supabase connection string" secret — rejected because the CLI's own commands expect these as three distinct values (access token for API auth, project ref to select which project, DB password for the Postgres connection), not one URL.

## 6. How is FR-009 ("update existing manual-step docs") satisfied given `011-email-template-schedule` may also be touching the same documentation?

**Decision**: This feature updates `README.md`'s "Event-reminder emails (Edge Function)" section (steps 1 and 3, which currently say to run `supabase functions deploy` / `supabase db push` by hand) to state that both now happen automatically via this workflow, linking to it. If `docs/event-notification-setup.md` (introduced by `011-email-template-schedule`) already exists at implementation time, the same correction is made there instead/also, whichever document currently holds the manual-step instructions.

**Rationale**: FR-009 is about not leaving a maintainer with stale, contradictory instructions — the fix targets wherever those instructions currently live, not a specific filename fixed at planning time, since the two sibling features (`011`, `012`) may implement in either order.

**Alternatives considered**: None — this is a documentation-accuracy requirement with only one reasonable interpretation.
