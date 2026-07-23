import type { TreeGraph } from "@/types";

/**
 * Returns a copy of the graph with every "married-in" individual removed, along with
 * anyone whose recorded parent-child ancestry traces back exclusively to one of them —
 * e.g. an in-law's own child from outside the family, or that child's descendants —
 * leaving only blood relatives and the people who married into the family.
 *
 * An individual counts as married-in (an "in-law") when they have no recorded parent
 * (never the child in a parent_child relationship) AND they are the spouse of someone who
 * does have a recorded parent. Root-generation couples (neither spouse has a recorded
 * parent) are left untouched — neither one married into a recorded blood descendant, so
 * both stay visible as the tree's founders.
 *
 * Beyond the in-laws themselves, an individual is kept only if `bloodKept` holds: anyone
 * with no recorded parent is kept (the same founder rule as above), and anyone with a
 * recorded parent is kept iff at least one of their recorded parents is both not an in-law
 * and themselves kept. This is evaluated over `parent_child` relationships only — a DAG,
 * so the recursion always terminates — and deliberately ignores `spouse`/`sibling` links
 * when deciding blood status (spec 010 research.md §2).
 */
export function filterOutInLaws(graph: TreeGraph): TreeGraph {
  const parentIdsOf = new Map<string, string[]>();
  const hasParent = new Set<string>();
  for (const rel of graph.relationships) {
    if (rel.type !== "parent_child") continue;
    hasParent.add(rel.personBId);
    const parents = parentIdsOf.get(rel.personBId) ?? [];
    parents.push(rel.personAId);
    parentIdsOf.set(rel.personBId, parents);
  }

  const inLawIds = new Set<string>();
  for (const rel of graph.relationships) {
    if (rel.type !== "spouse") continue;
    const { personAId, personBId } = rel;
    if (!hasParent.has(personAId) && hasParent.has(personBId)) inLawIds.add(personAId);
    if (!hasParent.has(personBId) && hasParent.has(personAId)) inLawIds.add(personBId);
  }

  const bloodKept = new Map<string, boolean>();
  function isBloodKept(individualId: string): boolean {
    const cached = bloodKept.get(individualId);
    if (cached !== undefined) return cached;

    const parentIds = parentIdsOf.get(individualId);
    if (!parentIds) {
      bloodKept.set(individualId, true);
      return true;
    }

    // Set a provisional value before recursing so a malformed cyclic parent_child chain
    // (which should never occur in valid tree data) can't cause infinite recursion.
    bloodKept.set(individualId, false);
    const kept = parentIds.some((parentId) => !inLawIds.has(parentId) && isBloodKept(parentId));
    bloodKept.set(individualId, kept);
    return kept;
  }

  const keepIds = new Set(
    graph.individuals.filter((individual) => !inLawIds.has(individual.id) && isBloodKept(individual.id)).map((i) => i.id),
  );

  return {
    individuals: graph.individuals.filter((individual) => keepIds.has(individual.id)),
    relationships: graph.relationships.filter(
      (rel) => keepIds.has(rel.personAId) && keepIds.has(rel.personBId),
    ),
  };
}
