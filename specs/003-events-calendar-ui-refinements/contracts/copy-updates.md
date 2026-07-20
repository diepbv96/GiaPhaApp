# Contract: Copy Updates

Exact strings, verbatim as requested (spec Assumptions — no spelling correction applied). Each row is a find-and-replace, not a behavior change.

## In-laws toggle (spec FR-009)

| Old | New | Location |
|---|---|---|
| `Chỉ hiển thị cùng huyết thống` | `Ẩn dâu/rễ` | The `SidebarToggle` label inside `TreeWorkspace.tsx` (post-extraction — was `Home.tsx`) |

No change to the toggle's `checked`/`onChange` wiring or to `TreeCanvas`'s `hideInLaws` behavior — label only.

## App's own generic name (spec FR-010)

| Old | New | Location | Why in scope |
|---|---|---|---|
| `Gia Phả Dòng Họ Bùi` | `Gia Phả App` | `index.html` `<title>` | Browser tab title — represents the app itself, not any tree |
| `Gia Phả Dòng Họ Bùi` | `Gia Phả App` | `src/pages/Login.tsx` heading | Sign-in screen — shown before any tree is loaded |
| `Gia Phả Dòng Họ Bùi` (fallback string) | `Gia Phả App` | `TreeWorkspace.tsx`'s `Sidebar title={... ?? "Gia Phả Dòng Họ Bùi"}` (post-extraction — was `Home.tsx`) | Only used while the default tree's own name hasn't loaded yet — a generic-app-label fallback, not a tree name |

## Explicitly NOT changed

- `README.md`'s top-level heading ("# Gia Phả Dòng Họ Bùi") — developer-facing documentation title, not an end-user-visible app label (spec Assumptions).
- The seed/sample tree's own name, `"Gia Phả Dòng Họ Bùi (Mẫu)"` (`supabase/seed/seed.sql`, referenced by `tests/e2e/lunar-events-tree-slugs.spec.ts`) — this is a specific family tree's name, not the app's generic label; renaming it would be renaming someone's tree, which is explicitly out of scope (spec User Story 4 acceptance scenario 3).
