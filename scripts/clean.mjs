// Removes generated/build artifacts, caches, and local secrets so the project folder is
// small and clean before zipping it up to send to someone else. Run with:
//
//   npm run clean
//
// This deletes .env (your local Supabase credentials) — copy it somewhere safe first if
// you still need it, then recreate it from .env.example after unzipping. Doesn't touch
// .git/.claude/.specify; exclude those yourself when creating the zip if needed.
//
// node_modules is removed too, so run `npm install` again before developing locally.

import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  "node_modules",
  "dist",
  "dist-ssr",
  "build",
  "coverage",
  "playwright-report",
  "test-results",
  "blob-report",
  "tsconfig.app.tsbuildinfo",
  "tsconfig.node.tsbuildinfo",
  ".DS_Store",
  ".env",
];

for (const target of targets) {
  rmSync(path.join(projectRoot, target), { recursive: true, force: true });
  console.log(`Removed ${target}`);
}

console.log("\nClean complete. Run `npm install` before developing again.");
