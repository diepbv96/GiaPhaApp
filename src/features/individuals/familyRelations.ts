import type { Individual, TreeGraph } from "@/types";

export interface InLawChild {
  individual: Individual;
  marriedTo: Individual; // the biological child this in-law is married to
}

export interface FamilyRelations {
  parents: Individual[]; // biological parents (FR: click a person to see their real parents)
  spouses: Individual[]; // supports more than one (remarriage)
  siblings: Individual[];
  biologicalChildren: Individual[];
  inLawChildren: InLawChild[]; // con dâu/con rể — married into the family, not blood children
}

function spouseIdsOf(personId: string, graph: TreeGraph): string[] {
  return graph.relationships
    .filter((r) => r.type === "spouse")
    .flatMap((r) => {
      if (r.personAId === personId) return [r.personBId];
      if (r.personBId === personId) return [r.personAId];
      return [];
    });
}

function byIds(ids: string[], byId: Map<string, Individual>): Individual[] {
  return ids.map((id) => byId.get(id)).filter((x): x is Individual => Boolean(x));
}

export function getFamilyRelations(individual: Individual, graph: TreeGraph): FamilyRelations {
  const byId = new Map(graph.individuals.map((i) => [i.id, i]));

  const parentIds = graph.relationships
    .filter((r) => r.type === "parent_child" && r.personBId === individual.id)
    .map((r) => r.personAId);

  const biologicalChildIds = graph.relationships
    .filter((r) => r.type === "parent_child" && r.personAId === individual.id)
    .map((r) => r.personBId);
  const biologicalChildIdSet = new Set(biologicalChildIds);

  const siblingIdSet = new Set<string>();
  for (const parentId of parentIds) {
    for (const r of graph.relationships) {
      if (r.type === "parent_child" && r.personAId === parentId && r.personBId !== individual.id) {
        siblingIdSet.add(r.personBId);
      }
    }
  }
  for (const r of graph.relationships) {
    if (r.type !== "sibling") continue;
    if (r.personAId === individual.id) siblingIdSet.add(r.personBId);
    if (r.personBId === individual.id) siblingIdSet.add(r.personAId);
  }

  // Con dâu/con rể: spouses of this person's biological children who are not
  // themselves also a biological child of this person.
  const inLawChildren: InLawChild[] = [];
  for (const childId of biologicalChildIds) {
    const child = byId.get(childId);
    if (!child) continue;
    for (const spouseId of spouseIdsOf(childId, graph)) {
      if (biologicalChildIdSet.has(spouseId)) continue;
      const spouse = byId.get(spouseId);
      if (spouse) inLawChildren.push({ individual: spouse, marriedTo: child });
    }
  }

  return {
    parents: byIds(parentIds, byId),
    spouses: byIds(spouseIdsOf(individual.id, graph), byId),
    siblings: byIds([...siblingIdSet], byId),
    biologicalChildren: byIds(biologicalChildIds, byId),
    inLawChildren,
  };
}

/** Describes an in-law by their own role to their spouse — "Vợ"/"Chồng" of that
 * spouse's name — rather than "con dâu/con rể của <tên>", which read as though the
 * name belonged to the in-law's parent-in-law instead of their own husband/wife. */
export function spouseRoleLabel(person: Individual): string {
  if (person.gender === "female") return "Vợ";
  if (person.gender === "male") return "Chồng";
  return "Vợ/Chồng";
}
