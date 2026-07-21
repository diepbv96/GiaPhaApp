import type { TreeGraph } from "@/types";

/**
 * Returns the ids of every individual in the graph referenced by zero relationships —
 * i.e. individuals with no relationship recorded in this specific tree. Used only to flag
 * these individuals for display (008-display-unconnected-individuals); every individual in
 * `graph.individuals` is still rendered regardless of membership in this set.
 */
export function computeIsolatedIds(graph: TreeGraph): Set<string> {
  const connectedIds = new Set<string>();
  for (const rel of graph.relationships) {
    connectedIds.add(rel.personAId);
    connectedIds.add(rel.personBId);
  }

  return new Set(graph.individuals.filter((individual) => !connectedIds.has(individual.id)).map((i) => i.id));
}
