import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTreeLayout } from "@/features/tree/useTreeLayout";
import type { Individual, TreeGraph } from "@/types";

function makeIndividual(
  id: string,
  gender: Individual["gender"] = "unknown",
  siblingOrder?: number,
): Individual {
  return { id, familyTreeId: "tree-1", fullName: id, gender, isDeceased: false, siblingOrder };
}

describe("useTreeLayout", () => {
  it("places every individual at a position", () => {
    const graph: TreeGraph = {
      individuals: [makeIndividual("a"), makeIndividual("b"), makeIndividual("c")],
      relationships: [
        { id: "r1", familyTreeId: "tree-1", type: "parent_child", personAId: "a", personBId: "b" },
        { id: "r2", familyTreeId: "tree-1", type: "parent_child", personAId: "a", personBId: "c" },
      ],
    };

    const { result } = renderHook(() => useTreeLayout(graph));

    expect(result.current.positions.size).toBe(3);
    expect(result.current.positions.has("a")).toBe(true);
    expect(result.current.positions.has("b")).toBe(true);
    expect(result.current.positions.has("c")).toBe(true);
  });

  it("places a parent above its children (smaller y)", () => {
    const graph: TreeGraph = {
      individuals: [makeIndividual("parent"), makeIndividual("child")],
      relationships: [
        { id: "r1", familyTreeId: "tree-1", type: "parent_child", personAId: "parent", personBId: "child" },
      ],
    };

    const { result } = renderHook(() => useTreeLayout(graph));
    const parentPos = result.current.positions.get("parent")!;
    const childPos = result.current.positions.get("child")!;

    expect(parentPos.y).toBeLessThan(childPos.y);
  });

  it("treats individuals with no parent_child edges as independent roots", () => {
    const graph: TreeGraph = {
      individuals: [makeIndividual("root1"), makeIndividual("root2")],
      relationships: [
        { id: "r1", familyTreeId: "tree-1", type: "spouse", personAId: "root1", personBId: "root2" },
      ],
    };

    const { result } = renderHook(() => useTreeLayout(graph));

    expect(result.current.positions.size).toBe(2);
  });

  it("places spouses on the same row, next to each other", () => {
    const graph: TreeGraph = {
      individuals: [makeIndividual("husband"), makeIndividual("wife")],
      relationships: [
        { id: "r1", familyTreeId: "tree-1", type: "spouse", personAId: "husband", personBId: "wife" },
      ],
    };

    const { result } = renderHook(() => useTreeLayout(graph));
    const husbandPos = result.current.positions.get("husband")!;
    const wifePos = result.current.positions.get("wife")!;

    expect(husbandPos.y).toBe(wifePos.y);
    expect(husbandPos.x).not.toBe(wifePos.x);
  });

  it("places siblings on the same row, one generation below their shared parent", () => {
    const graph: TreeGraph = {
      individuals: [makeIndividual("parent"), makeIndividual("child1"), makeIndividual("child2")],
      relationships: [
        { id: "r1", familyTreeId: "tree-1", type: "parent_child", personAId: "parent", personBId: "child1" },
        { id: "r2", familyTreeId: "tree-1", type: "parent_child", personAId: "parent", personBId: "child2" },
      ],
    };

    const { result } = renderHook(() => useTreeLayout(graph));
    const parentPos = result.current.positions.get("parent")!;
    const child1Pos = result.current.positions.get("child1")!;
    const child2Pos = result.current.positions.get("child2")!;

    expect(child1Pos.y).toBe(child2Pos.y);
    expect(child1Pos.y).toBeGreaterThan(parentPos.y);
  });

  it("orders siblings left-to-right by their recorded birth-order position, unpositioned ones last", () => {
    // Deliberately declared/id'd out of order ("z" sorts after "a" alphabetically) so
    // this only passes if position — not id — drives the order.
    const graph: TreeGraph = {
      individuals: [
        makeIndividual("parent"),
        makeIndividual("zPositionTwo", "male", 2),
        makeIndividual("aPositionFour", "female", 4),
        makeIndividual("bPositionThree", "unknown", 3),
        makeIndividual("noPosition", "unknown"),
      ],
      relationships: [
        { id: "r1", familyTreeId: "tree-1", type: "parent_child", personAId: "parent", personBId: "zPositionTwo" },
        { id: "r2", familyTreeId: "tree-1", type: "parent_child", personAId: "parent", personBId: "aPositionFour" },
        { id: "r3", familyTreeId: "tree-1", type: "parent_child", personAId: "parent", personBId: "bPositionThree" },
        { id: "r4", familyTreeId: "tree-1", type: "parent_child", personAId: "parent", personBId: "noPosition" },
      ],
    };

    const { result } = renderHook(() => useTreeLayout(graph));
    const xOf = (id: string) => result.current.positions.get(id)!.x;

    expect(xOf("zPositionTwo")).toBeLessThan(xOf("bPositionThree"));
    expect(xOf("bPositionThree")).toBeLessThan(xOf("aPositionFour"));
    expect(xOf("aPositionFour")).toBeLessThan(xOf("noPosition"));
  });

  it("groups a person with more than one spouse into a single row, centered between them", () => {
    const graph: TreeGraph = {
      individuals: [makeIndividual("person"), makeIndividual("firstSpouse"), makeIndividual("secondSpouse")],
      relationships: [
        { id: "r1", familyTreeId: "tree-1", type: "spouse", personAId: "person", personBId: "firstSpouse" },
        { id: "r2", familyTreeId: "tree-1", type: "spouse", personAId: "person", personBId: "secondSpouse" },
      ],
    };

    const { result } = renderHook(() => useTreeLayout(graph));
    const personPos = result.current.positions.get("person")!;
    const firstPos = result.current.positions.get("firstSpouse")!;
    const secondPos = result.current.positions.get("secondSpouse")!;

    expect(firstPos.y).toBe(personPos.y);
    expect(secondPos.y).toBe(personPos.y);
    expect(new Set([personPos.x, firstPos.x, secondPos.x]).size).toBe(3);
    // the person with 2 spouses sits between them, not off to one side
    expect(personPos.x).toBeGreaterThan(Math.min(firstPos.x, secondPos.x));
    expect(personPos.x).toBeLessThan(Math.max(firstPos.x, secondPos.x));
  });

  it("places the blood descendant on the left and their in-law spouse on the right", () => {
    // "zchild" deliberately sorts after "ainlaw" alphabetically, so this only passes if
    // ordering is driven by who has a recorded parent, not by id.
    const graph: TreeGraph = {
      individuals: [makeIndividual("grandparent"), makeIndividual("zchild"), makeIndividual("ainlaw")],
      relationships: [
        { id: "r1", familyTreeId: "tree-1", type: "parent_child", personAId: "grandparent", personBId: "zchild" },
        { id: "r2", familyTreeId: "tree-1", type: "spouse", personAId: "zchild", personBId: "ainlaw" },
      ],
    };

    const { result } = renderHook(() => useTreeLayout(graph));
    const childPos = result.current.positions.get("zchild")!;
    const inlawPos = result.current.positions.get("ainlaw")!;

    expect(childPos.y).toBe(inlawPos.y);
    expect(childPos.x).toBeLessThan(inlawPos.x);
  });

  it("keeps a wide unit (2 spouses) from overlapping its narrower sibling unit", () => {
    // grandparent's two children: "wide" has two spouses (3-card-wide unit), "narrow"
    // has one (2-card-wide unit). A fixed per-unit slot width sized for 2-card units
    // isn't enough room for the 3-card unit, so it must spill into its neighbor's slot
    // unless the layout accounts for each unit's actual rendered width.
    const CARD_WIDTH = 200;
    const CARD_GAP = 32;

    const graph: TreeGraph = {
      individuals: [
        makeIndividual("grandparent"),
        makeIndividual("wide"),
        makeIndividual("wideSpouseA"),
        makeIndividual("wideSpouseB"),
        makeIndividual("narrow"),
        makeIndividual("narrowSpouse"),
      ],
      relationships: [
        { id: "r1", familyTreeId: "tree-1", type: "parent_child", personAId: "grandparent", personBId: "wide" },
        { id: "r2", familyTreeId: "tree-1", type: "parent_child", personAId: "grandparent", personBId: "narrow" },
        { id: "r3", familyTreeId: "tree-1", type: "spouse", personAId: "wide", personBId: "wideSpouseA" },
        { id: "r4", familyTreeId: "tree-1", type: "spouse", personAId: "wide", personBId: "wideSpouseB" },
        { id: "r5", familyTreeId: "tree-1", type: "spouse", personAId: "narrow", personBId: "narrowSpouse" },
      ],
    };

    const { result } = renderHook(() => useTreeLayout(graph));
    const wideXs = ["wide", "wideSpouseA", "wideSpouseB"].map((id) => result.current.positions.get(id)!.x);
    const narrowXs = ["narrow", "narrowSpouse"].map((id) => result.current.positions.get(id)!.x);

    const wideRightEdge = Math.max(...wideXs) + CARD_WIDTH / 2;
    const wideLeftEdge = Math.min(...wideXs) - CARD_WIDTH / 2;
    const narrowRightEdge = Math.max(...narrowXs) + CARD_WIDTH / 2;
    const narrowLeftEdge = Math.min(...narrowXs) - CARD_WIDTH / 2;

    // whichever unit sits on the left, its right edge must not pass the other unit's
    // left edge (with at least a card-gap of breathing room)
    const gapBetweenUnits =
      wideLeftEdge <= narrowLeftEdge ? narrowLeftEdge - wideRightEdge : wideLeftEdge - narrowRightEdge;
    expect(gapBetweenUnits).toBeGreaterThanOrEqual(CARD_GAP);
  });

  it("uses a manually dragged position instead of the computed one", () => {
    const individual: Individual = { ...makeIndividual("solo"), layoutPosition: { x: 999, y: 42 } };
    const graph: TreeGraph = { individuals: [individual], relationships: [] };

    const { result } = renderHook(() => useTreeLayout(graph));
    const pos = result.current.positions.get("solo")!;

    expect(pos).toEqual({ id: "solo", x: 999, y: 42 });
  });
});
