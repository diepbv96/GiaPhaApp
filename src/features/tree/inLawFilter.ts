import type { TreeGraph } from "@/types";

/**
 * Returns a copy of the graph with every "married-in" individual removed, leaving only
 * blood relatives. An individual counts as married-in when they have no recorded parent
 * (never the child in a parent_child relationship) AND they are the spouse of someone who
 * does have a recorded parent. Root-generation couples (neither spouse has a recorded
 * parent) are left untouched — neither one married into a recorded blood descendant, so
 * both stay visible as the tree's founders.
 */
export function filterOutInLaws(graph: TreeGraph): TreeGraph {
  const hasParent = new Set<string>();
  for (const rel of graph.relationships) {
    if (rel.type === "parent_child") hasParent.add(rel.personBId);
  }

  const inLawIds = new Set<string>();
  for (const rel of graph.relationships) {
    if (rel.type !== "spouse") continue;
    const { personAId, personBId } = rel;
    if (!hasParent.has(personAId) && hasParent.has(personBId)) inLawIds.add(personAId);
    if (!hasParent.has(personBId) && hasParent.has(personAId)) inLawIds.add(personBId);
  }

  return {
    individuals: graph.individuals.filter((individual) => !inLawIds.has(individual.id)),
    relationships: graph.relationships.filter(
      (rel) => !inLawIds.has(rel.personAId) && !inLawIds.has(rel.personBId),
    ),
  };
}
