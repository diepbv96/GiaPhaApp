// Maps raw Supabase (snake_case) rows onto the camelCase app types in src/types/index.ts.

import type { DatePrecision, FamilyTreeSummary, Individual, PartialDate, Relationship } from "@/types";

export interface IndividualRow {
  id: string;
  family_tree_id: string;
  full_name: string;
  alias: string | null;
  gender: Individual["gender"];
  birth_date: string | null;
  birth_date_precision: DatePrecision | null;
  is_deceased: boolean;
  death_date: string | null;
  death_date_precision: DatePrecision | null;
  notes: string | null;
  avatar_path: string | null;
  layout_x: number | null;
  layout_y: number | null;
  sibling_order: number | null;
}

export interface RelationshipRow {
  id: string;
  family_tree_id: string;
  type: Relationship["type"];
  person_a_id: string;
  person_b_id: string;
}

export interface FamilyTreeRow {
  id: string;
  name: string;
  slug: string;
  is_default: boolean;
  is_public: boolean;
}

function toPartialDate(value: string | null, precision: DatePrecision | null): PartialDate | undefined {
  if (!value) return undefined;
  return { value, precision: precision ?? "unknown" };
}

export function mapIndividualRow(row: IndividualRow, avatarUrl?: string): Individual {
  return {
    id: row.id,
    familyTreeId: row.family_tree_id,
    fullName: row.full_name,
    alias: row.alias ?? undefined,
    gender: row.gender,
    birthDate: toPartialDate(row.birth_date, row.birth_date_precision),
    isDeceased: row.is_deceased,
    deathDate: toPartialDate(row.death_date, row.death_date_precision),
    notes: row.notes ?? undefined,
    avatarUrl,
    layoutPosition: row.layout_x != null && row.layout_y != null ? { x: row.layout_x, y: row.layout_y } : undefined,
    siblingOrder: row.sibling_order ?? undefined,
  };
}

export function mapRelationshipRow(row: RelationshipRow): Relationship {
  return {
    id: row.id,
    familyTreeId: row.family_tree_id,
    type: row.type,
    personAId: row.person_a_id,
    personBId: row.person_b_id,
  };
}

export function mapFamilyTreeRow(row: FamilyTreeRow): FamilyTreeSummary {
  return { id: row.id, name: row.name, slug: row.slug, isDefault: row.is_default, isPublic: row.is_public };
}
