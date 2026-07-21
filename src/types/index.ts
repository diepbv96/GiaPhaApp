// Shared types mirroring specs/001-family-tree-app/data-model.md and contracts/data-access-api.md

export type Gender = "male" | "female" | "unknown";
export type DatePrecision = "day" | "month" | "year" | "unknown";
export type RelationshipType = "parent_child" | "spouse" | "sibling";
export type UserRole = "admin" | "editor" | "viewer";
export type ImportRowStatus = "succeeded" | "failed" | "duplicate";

export interface PartialDate {
  value: string; // ISO date string, e.g. "1954-01-01"
  precision: DatePrecision;
}

export interface LayoutPosition {
  x: number;
  y: number;
}

export interface Individual {
  id: string;
  familyTreeId: string;
  fullName: string;
  alias?: string;
  gender: Gender;
  birthDate?: PartialDate;
  isDeceased: boolean;
  deathDate?: PartialDate; // only meaningful when isDeceased is true
  notes?: string; // max 100 chars, FR-007
  avatarUrl?: string;
  layoutPosition?: LayoutPosition; // manual drag position override; unset = auto layout
  /** Manually entered ordinal among siblings — Vietnamese convention: eldest = 2, then 3, 4, ... */
  siblingOrder?: number;
}

export interface Relationship {
  id: string;
  familyTreeId: string;
  type: RelationshipType;
  personAId: string;
  personBId: string;
}

export interface FamilyTreeSummary {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  isPublic: boolean;
}

/** A Gregorian date's lunar-calendar equivalent — see specs/002-lunar-events-tree-slugs/contracts/lunar-date-conversion.md. */
export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeapMonth: boolean;
}

export type LifeEventType = "birthday" | "death_anniversary";

/** A recurring, yearly occurrence derived from a person's birth/death date — never persisted. */
export interface LifeEvent {
  type: LifeEventType;
  individual: Individual;
  day: number;
}

export interface EventNotificationConfig {
  enabled: boolean;
  template: string;
  daysBefore: number;
  defaultRecipients: string[];
}

export interface NotificationRecipientsOverride {
  familyTreeId: string;
  recipients: string[];
}

export interface TreeGraph {
  individuals: Individual[];
  relationships: Relationship[];
}

/** An individual plus every family tree they belong to — for the admin dashboard's list (007). */
export interface IndividualWithTrees extends Individual {
  familyTrees: FamilyTreeSummary[];
}

/** One page of the admin dashboard's individuals list, plus the total count matching the current filter/search. */
export interface IndividualsAdminPage {
  individuals: IndividualWithTrees[];
  total: number;
}

export interface ImportRowResult {
  kind: "individual" | "relationship";
  rowNumber: number;
  status: ImportRowStatus;
  message?: string;
}

export interface ImportSummary {
  batchId: string;
  totalRows: number;
  succeededRows: number;
  failedRows: number;
  duplicateRows: number;
  rowResults: ImportRowResult[];
}

export type DataAccessErrorCode =
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "VALIDATION_FAILED"
  | "LIMIT_REACHED"
  | "CONFLICT"
  | "UNKNOWN";

export class DataAccessError extends Error {
  code: DataAccessErrorCode;

  constructor(code: DataAccessErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "DataAccessError";
  }
}
