import { describe, expect, it } from "vitest";
import { computeIsolatedIds } from "@/features/tree/isolatedIndividuals";
import type { Individual, TreeGraph } from "@/types";

function person(id: string): Individual {
  return { id, familyTreeId: "t", fullName: id, gender: "unknown", isDeceased: false };
}

describe("computeIsolatedIds", () => {
  it("includes an individual with zero relationships", () => {
    const graph: TreeGraph = {
      individuals: [person("solo")],
      relationships: [],
    };

    expect(computeIsolatedIds(graph)).toEqual(new Set(["solo"]));
  });

  it("excludes an individual referenced by a relationship", () => {
    const graph: TreeGraph = {
      individuals: [person("husband"), person("wife")],
      relationships: [{ id: "r1", familyTreeId: "t", type: "spouse", personAId: "husband", personBId: "wife" }],
    };

    expect(computeIsolatedIds(graph)).toEqual(new Set());
  });

  it("returns every individual for a graph with no relationships", () => {
    const graph: TreeGraph = {
      individuals: [person("a"), person("b")],
      relationships: [],
    };

    expect(computeIsolatedIds(graph)).toEqual(new Set(["a", "b"]));
  });

  it("returns an empty set for a graph with no individuals", () => {
    const graph: TreeGraph = { individuals: [], relationships: [] };

    expect(computeIsolatedIds(graph)).toEqual(new Set());
  });

  it("flags only the unconnected individual in a mixed graph", () => {
    const graph: TreeGraph = {
      individuals: [person("husband"), person("wife"), person("solo")],
      relationships: [{ id: "r1", familyTreeId: "t", type: "spouse", personAId: "husband", personBId: "wife" }],
    };

    expect(computeIsolatedIds(graph)).toEqual(new Set(["solo"]));
  });
});
