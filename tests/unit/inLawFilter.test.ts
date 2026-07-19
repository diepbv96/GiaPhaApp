import { describe, expect, it } from "vitest";
import { filterOutInLaws } from "@/features/tree/inLawFilter";
import type { Individual, TreeGraph } from "@/types";

function person(id: string): Individual {
  return { id, familyTreeId: "t", fullName: id, gender: "unknown", isDeceased: false };
}

describe("filterOutInLaws", () => {
  it("keeps a founding couple even though neither has a recorded parent", () => {
    const graph: TreeGraph = {
      individuals: [person("grandfather"), person("grandmother")],
      relationships: [
        { id: "r1", familyTreeId: "t", type: "spouse", personAId: "grandfather", personBId: "grandmother" },
      ],
    };

    const result = filterOutInLaws(graph);
    expect(result.individuals.map((i) => i.id).sort()).toEqual(["grandfather", "grandmother"]);
  });

  it("hides a spouse who married a recorded blood descendant", () => {
    const graph: TreeGraph = {
      individuals: [person("father"), person("son"), person("daughter-in-law")],
      relationships: [
        { id: "r1", familyTreeId: "t", type: "parent_child", personAId: "father", personBId: "son" },
        { id: "r2", familyTreeId: "t", type: "spouse", personAId: "son", personBId: "daughter-in-law" },
      ],
    };

    const result = filterOutInLaws(graph);
    expect(result.individuals.map((i) => i.id).sort()).toEqual(["father", "son"]);
    expect(result.relationships.map((r) => r.id)).toEqual(["r1"]);
  });

  it("keeps siblings and their shared parent, only removing the in-law", () => {
    const graph: TreeGraph = {
      individuals: [person("mother"), person("son"), person("daughter"), person("son-in-law")],
      relationships: [
        { id: "r1", familyTreeId: "t", type: "parent_child", personAId: "mother", personBId: "son" },
        { id: "r2", familyTreeId: "t", type: "parent_child", personAId: "mother", personBId: "daughter" },
        { id: "r3", familyTreeId: "t", type: "sibling", personAId: "son", personBId: "daughter" },
        { id: "r4", familyTreeId: "t", type: "spouse", personAId: "daughter", personBId: "son-in-law" },
      ],
    };

    const result = filterOutInLaws(graph);
    expect(result.individuals.map((i) => i.id).sort()).toEqual(["daughter", "mother", "son"]);
  });
});
