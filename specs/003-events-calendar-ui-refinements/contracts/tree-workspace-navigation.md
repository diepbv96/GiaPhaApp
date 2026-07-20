# Contract: Shared Tree Workspace & Route-Scoped Events

## `TreeWorkspace` component contract (`src/features/tree/TreeWorkspace.tsx`)

```text
<TreeWorkspace treeId={string} treeName={string} upcomingEventsPath={string} />
```

Renders, for the given `treeId`, exactly what `Home.tsx` renders today for the default tree — nothing added, nothing removed, only the data source parameterized:

- **Sidebar**, titled `treeName`, with:
  - "Hiển thị" section: the in-laws toggle (label per `contracts/copy-updates.md`), the export action, and a "Sự kiện sắp tới" link pointing at `upcomingEventsPath` — so a slug-viewed tree's link goes to `/:slug/su-kien-sap-toi`, and the home/default tree's link stays `/su-kien-sap-toi` (spec FR-001, FR-004).
  - "Quản lý cá thể" section (add individual, import) — shown only when `role` is `admin` or `editor` (spec FR-002, FR-002a). Behaves identically regardless of `treeId`, since the underlying RLS check is role-only (`data-model.md`).
  - "Tài khoản" section — Admin-only global links ("Quản lý cây gia phả," "Cấu hình thông báo") plus sign-in/sign-out — unaffected by which tree is open, shown identically on every tree.
- **Main canvas**: `TreeCanvas` for `treeId`'s graph, `canDrag` true only for admin/editor (spec FR-002/FR-002a), plus `IndividualDetailPanel` with the same edit/add-relationship/delete actions shown only for admin/editor.
- **Modals**: create/edit/delete individual, create relationship, import — each already accepts a `treeId` prop (existing `IndividualForm`/`RelationshipForm`/`ImportDialog`/`DeleteIndividualDialog` signatures are unchanged) — wired to the `treeId` passed into `TreeWorkspace`, not a hardcoded default tree.

Role/session state (`useAuth`) is read internally by `TreeWorkspace`, not passed in — it is not tree-specific, matching how `Home.tsx` reads it today.

## Caller contracts

- **`Home.tsx`**: resolves the default tree exactly as today (loading / "not published, please sign in" for guests / "no default tree" for authenticated users with none). Once resolved, renders `<TreeWorkspace treeId={tree.id} treeName={tree.name} upcomingEventsPath="/su-kien-sap-toi" />`. Behavior for a guest on a non-public default tree, or an authenticated user with no default tree, is byte-for-byte unchanged from today (spec acceptance scenario 5 — "unchanged from today").
- **`TreeBySlug.tsx`**: resolves the tree by its `slug` route param exactly as today (loading / "not found or not public" messaging, unchanged). Once resolved, renders `<TreeWorkspace treeId={tree.id} treeName={tree.name} upcomingEventsPath={`/${slug}/su-kien-sap-toi`} />` in place of its current bespoke read-only rendering. A Viewer or guest sees exactly the same read-only experience as before (spec FR-002a, acceptance scenario 3/6) because `TreeWorkspace` itself already gates every management affordance on `role`.

## Route contract (`src/app/router.tsx`)

| Route | Resolves | Notes |
|---|---|---|
| `/su-kien-sap-toi` | Default tree's events (unchanged) | Existing route, existing behavior |
| `/:slug/su-kien-sap-toi` | The slug-named tree's events | New route, declared before `/:slug` in the route array |
| `/:slug` | `TreeBySlug` (now renders `TreeWorkspace`) | Existing route; unaffected by the new sibling route above it |

`UpcomingEvents.tsx` reads an optional `slug` param: present → `getFamilyTreeBySlug(slug)`; absent → `getDefaultFamilyTree()` (spec FR-001). Its "back" link target follows the same branch: `/${slug}` when present, `/` otherwise.
