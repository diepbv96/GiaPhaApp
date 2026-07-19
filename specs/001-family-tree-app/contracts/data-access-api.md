# Contract: Client Data-Access Layer

Since this feature has no custom backend server, the "API" the UI depends on is the typed service-function layer in `src/features/*` that wraps `@supabase/supabase-js` calls. This contract fixes those function signatures so UI components (Phase 2 tasks) and their tests can be written against a stable interface, independent of Supabase call details. Authorization is enforced server-side by RLS (`data-model.md`); these functions surface any resulting permission error to the caller rather than re-implementing role checks client-side.

```typescript
// src/features/trees/treeService.ts
export interface FamilyTreeSummary {
  id: string;
  name: string;
  isDefault: boolean;
  isPublic: boolean;
}

getFamilyTrees(): Promise<FamilyTreeSummary[]>;                 // FR-016
getDefaultFamilyTree(): Promise<FamilyTreeSummary | null>;       // FR-019; RLS-scoped — returns null for a guest if the default tree isn't public (FR-028)
createFamilyTree(name: string): Promise<FamilyTreeSummary>;      // FR-017 (rejects at 5)
setDefaultFamilyTree(treeId: string): Promise<void>;             // FR-018
setTreePublic(treeId: string, isPublic: boolean): Promise<void>; // FR-028, admin-only
deleteFamilyTree(treeId: string): Promise<void>;                 // FR-021 — rejects deleting the current default while
                                                                  // another tree still exists; an Admin may delete every
                                                                  // tree, including the last one

// src/features/tree/treeGraphService.ts
export interface TreeGraph {
  individuals: Individual[];
  relationships: Relationship[];
}

getTreeGraph(treeId: string): Promise<TreeGraph>;                // FR-001, powers layout (research.md §1)

// src/features/individuals/individualService.ts
export interface Individual {
  id: string;
  familyTreeId: string;
  fullName: string;
  alias?: string;
  gender: "male" | "female" | "unknown";
  birthDate?: { value: string; precision: "day" | "month" | "year" | "unknown" };
  isDeceased: boolean;
  deathDate?: { value: string; precision: "day" | "month" | "year" | "unknown" }; // only meaningful when isDeceased
  notes?: string;              // max 100 chars, validated client + DB (FR-007)
  avatarUrl?: string;          // resolved public URL for avatarPath
  layoutPosition?: { x: number; y: number }; // manual drag override; unset = computed layout
  siblingOrder?: number;       // manual ordinal, Vietnamese convention: eldest = 2, then 3, 4, ... (never 1)
}

type IndividualInput = Omit<Individual, "id" | "familyTreeId" | "avatarUrl" | "layoutPosition">;

createIndividual(treeId: string, input: IndividualInput): Promise<Individual>; // FR-005
updateIndividual(id: string, input: IndividualInput): Promise<Individual>;
updateIndividualPosition(id: string, position: { x: number; y: number }): Promise<void>; // persists a dragged node position, Admin/Editor only (RLS-enforced)
deleteIndividual(id: string, opts?: { cascadeRelationships?: boolean }): Promise<void>; // FR-012
uploadAvatar(individualId: string, file: File): Promise<string>; // FR-008, replaces existing

// src/features/relationships/relationshipService.ts
export interface Relationship {
  id: string;
  familyTreeId: string;
  type: "parent_child" | "spouse" | "sibling";
  personAId: string;
  personBId: string;
}

createRelationship(input: Omit<Relationship, "id">): Promise<Relationship>; // FR-002
deleteRelationship(id: string): Promise<void>;

// src/features/import/importService.ts
export interface ImportSummary {
  batchId: string;
  totalRows: number;
  succeededRows: number;
  failedRows: number;
  duplicateRows: number;
  rowResults: Array<{ kind: "individual" | "relationship"; rowNumber: number; status: "succeeded" | "failed" | "duplicate"; message?: string }>;
}

importFromXlsx(treeId: string, file: File): Promise<ImportSummary>; // FR-013–FR-015, FR-025; validates against contracts/xlsx-import-template.md
                                                                     // (single sheet — relationships are columns on each
                                                                     // individual's own row, not a separate sheet)

// src/features/export/exportService.ts
exportCurrentViewAsPng(viewportEl: HTMLElement): Promise<Blob>;   // FR-027
exportCurrentViewAsPdf(viewportEl: HTMLElement): Promise<Blob>;   // FR-027

// src/features/auth/authService.ts
export type UserRole = "admin" | "editor" | "viewer";

getCurrentUserRole(): Promise<UserRole | null>;                  // FR-009, drives UI gating (backed by RLS for enforcement)
signIn(email: string, password: string): Promise<void>;
signOut(): Promise<void>;
```

## Error contract

All functions reject with a typed `DataAccessError`:

```typescript
export interface DataAccessError {
  code: "NOT_FOUND" | "PERMISSION_DENIED" | "VALIDATION_FAILED" | "LIMIT_REACHED" | "CONFLICT" | "UNKNOWN";
  message: string;   // Vietnamese, user-displayable (FR-026)
}
```

- `PERMISSION_DENIED` surfaces when an RLS policy rejects a write (e.g., a Viewer's client somehow calls `createIndividual`) — the UI treats this the same as if the control had never been shown.
- `LIMIT_REACHED` surfaces `createFamilyTree` at 5 trees (FR-017).
- `VALIDATION_FAILED` surfaces notes-length violations (FR-007), missing required fields (FR-005), and malformed import rows (FR-014).
- `CONFLICT` surfaces `deleteIndividual` when relationships exist and `cascadeRelationships` was not set (FR-012), and `deleteFamilyTree` on the current default while another tree still exists and no new default has been assigned first (FR-021) — deleting the last remaining tree is allowed and does not raise this.
