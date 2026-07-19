import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useExpandCollapse } from "@/features/tree/useExpandCollapse";
import type { TreeGraph } from "@/types";

const graph: TreeGraph = {
  individuals: [],
  relationships: [
    { id: "r1", familyTreeId: "t", type: "spouse", personAId: "father", personBId: "mother" },
    { id: "r2", familyTreeId: "t", type: "parent_child", personAId: "father", personBId: "child" },
    { id: "r3", familyTreeId: "t", type: "parent_child", personAId: "mother", personBId: "child" },
    { id: "r4", familyTreeId: "t", type: "spouse", personAId: "child", personBId: "inlaw" },
  ],
};

const unitIdOf = new Map([
  ["father", "unit-parents"],
  ["mother", "unit-parents"],
  ["child", "unit-child"],
  ["inlaw", "unit-child"],
]);

describe("useExpandCollapse", () => {
  it("toggling one spouse collapses both (shared couple state)", () => {
    const { result } = renderHook(() => useExpandCollapse(graph, unitIdOf));
    act(() => result.current.toggle("father"));

    expect(result.current.isCollapsed("father")).toBe(true);
    expect(result.current.isCollapsed("mother")).toBe(true);
  });

  it("collapsing a couple hides descendants and the descendants' spouses", () => {
    const { result } = renderHook(() => useExpandCollapse(graph, unitIdOf));
    act(() => result.current.toggle("father"));

    expect(result.current.hiddenIds.has("child")).toBe(true);
    expect(result.current.hiddenIds.has("inlaw")).toBe(true);
  });

  it("toggling either spouse re-expands both", () => {
    const { result } = renderHook(() => useExpandCollapse(graph, unitIdOf));
    act(() => result.current.toggle("father"));
    act(() => result.current.toggle("mother"));

    expect(result.current.isCollapsed("father")).toBe(false);
    expect(result.current.isCollapsed("mother")).toBe(false);
    expect(result.current.hiddenIds.has("child")).toBe(false);
  });

  it("hasChildren is true for both spouses when either has a recorded child", () => {
    const { result } = renderHook(() => useExpandCollapse(graph, unitIdOf));

    expect(result.current.hasChildren("father")).toBe(true);
    expect(result.current.hasChildren("mother")).toBe(true);
    expect(result.current.hasChildren("child")).toBe(false);
  });
});
