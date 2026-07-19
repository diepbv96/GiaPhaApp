# Gia Phả Dòng Họ Bùi

Web app for viewing and maintaining the Bùi family genealogy tree. React + TypeScript +
React Flow + D3 (layout) on the frontend, Supabase (Postgres + Auth + Storage) as the
backend — see `specs/001-family-tree-app/` for the full spec, plan, and design docs.

## Prerequisites

- Node.js 20 LTS and npm
- A Supabase project (a free tier project, or `supabase start` for local dev)
- The [Supabase CLI](https://supabase.com/docs/guides/cli) if you want to apply
  migrations/seed data with `supabase db push` / `supabase db reset`

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Supabase project's URL and publishable key.
   **`.env` is git-ignored — never commit real credentials.**

   ```bash
   cp .env.example .env
   ```

3. Apply the database schema (tables, constraints, RLS policies) to your Supabase
   project. Two ways to do this — pick one:

   - **Supabase CLI** (recommended if you have it installed and linked to your
     project): applies `supabase/migrations/` in filename order.

     ```bash
     supabase db push
     ```

   - **Dashboard SQL Editor** (no CLI needed): open `supabase/bootstrap.sql`, edit
     the Admin email/password near the bottom of the file, paste the whole file into
     Dashboard → SQL Editor → New query, and run it once. It's the same schema as
     the migrations above plus a single Admin account you sign in with first —
     don't run it twice against the same project (see the file's header comment).
     If that account can't sign in even with the right password, run
     `supabase/reset-admin-password.sql` (edit the email/password in it first) —
     the usual cause is a missing `auth.identities` row, which that script repairs.

4. (Optional, local/dev only) Load sample data — one seeded family tree plus
   `admin` / `editor` / `viewer` test accounts — from `supabase/seed/seed.sql`. See
   that file for the seeded test credentials. Never run it against a production
   project.

5. Start the dev server:

   ```bash
   npm run dev
   ```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Format the codebase with Prettier |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run end-to-end tests (Playwright) — requires a running Supabase backend with `supabase/seed/seed.sql` applied |
| `npm run clean` | Delete build artifacts/caches (`node_modules`, `dist`, `coverage`, `playwright-report`, etc.) **and `.env`** to shrink the folder and strip local secrets before zipping it up to share — back up `.env` first if you still need it, then run `npm install` and recreate `.env` from `.env.example` afterward |

## Deployment (GitHub Pages)

`.github/workflows/deploy-pages.yml` builds and publishes `main` to GitHub Pages automatically on every push, via the standard `upload-pages-artifact` / `deploy-pages` actions.

**One-time setup**:

1. **Settings → Pages → Build and deployment → Source**: select "GitHub Actions" (not "Deploy from a branch").
2. **Settings → Secrets and variables → Actions → New repository secret**: add
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

   Same values as your local `.env`. The Supabase publishable key is designed to be safe inside a public client bundle (RLS is what actually protects data — see `specs/001-family-tree-app/data-model.md`), but it's still read from a secret rather than committed anywhere.
3. Push to `main` (or run the workflow manually from the Actions tab). The site is served at `https://<owner>.github.io/<repo>/`.

The workflow sets `BASE_PATH=/<repo-name>/` at build time so asset paths and the router's `basename` (`src/app/router.tsx`) resolve correctly under that subpath, and copies `dist/index.html` to `dist/404.html` so deep-linked routes (e.g. `/dang-nhap`) survive a hard refresh on GitHub Pages, which has no server-side SPA fallback.

## Project layout

See `specs/001-family-tree-app/plan.md` ("Project Structure") for the full rationale.
In short: `src/features/*` holds one folder per capability (tree rendering, individuals,
relationships, import, export, auth, trees), `src/pages/*` are routed pages, and
`supabase/migrations/*` is the database schema, applied in filename order.

## Docs

- [`specs/001-family-tree-app/spec.md`](specs/001-family-tree-app/spec.md) — feature spec
- [`specs/001-family-tree-app/plan.md`](specs/001-family-tree-app/plan.md) — implementation plan
- [`specs/001-family-tree-app/data-model.md`](specs/001-family-tree-app/data-model.md) — database schema
- [`specs/001-family-tree-app/contracts/`](specs/001-family-tree-app/contracts/) — `.xlsx` import template and client data-access API
- [`public/templates/import-template.xlsx`](public/templates/import-template.xlsx) — the downloadable template file itself (linked from the in-app import dialog); regenerate with `npm run generate:import-template` after editing `scripts/generate-import-template.mjs` or the contract above
- [`specs/001-family-tree-app/quickstart.md`](specs/001-family-tree-app/quickstart.md) — manual end-to-end validation scenarios
- [`supabase/bootstrap.sql`](supabase/bootstrap.sql) — one-shot schema + editable Admin account, for the Dashboard SQL Editor (CLI-free alternative to `supabase/migrations/`)
- [`supabase/reset-admin-password.sql`](supabase/reset-admin-password.sql) — fixes an Admin account that won't sign in (repairs the password hash and the `auth.identities` row)
- [`supabase/teardown.sql`](supabase/teardown.sql) — drops everything `bootstrap.sql` created (destructive) so you can re-run `bootstrap.sql` against a clean slate
