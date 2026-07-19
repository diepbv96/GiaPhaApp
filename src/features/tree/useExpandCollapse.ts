import { useCallback, useMemo, useState } from "react";
import type { TreeGraph } from "@/types";

export interface ExpandCollapseState {
  hiddenIds: Set<string>;
  hasChildren: (individualId: string) => boolean;
  isCollapsed: (individualId: string) => boolean;
  toggle: (individualId: string) => void;
}

/**
 * Collapse/expand is per *couple*, not per individual: both spouses share one
 * "Thu gọn/Xổ ra" state (keyed by their conjugal unit id from useTreeLayout), so
 * clicking either card's button toggles both. Collapsing hides every descendant
 * reachable via parent_child edges *and* each of those descendants' spouses — a
 * hidden child's con dâu/con rể shouldn't be left floating on the tree without them.
 */
export function useExpandCollapse(graph: TreeGraph, unitIdOf: Map<string, string>): ExpandCollapseState {
  const [collapsedUnitIds, setCollapsedUnitIds] = useState<Set<string>>(new Set());

  const childrenOf = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const rel of graph.relationships) {
      if (rel.type !== "parent_child") continue;
      const list = map.get(rel.personAId) ?? [];
      list.push(rel.personBId);
      map.set(rel.personAId, list);
    }
    return map;
  }, [graph]);

  const spousesOf = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const rel of graph.relationships) {
      if (rel.type !== "spouse") continue;
      const a = map.get(rel.personAId) ?? [];
      a.push(rel.personBId);
      map.set(rel.personAId, a);
      const b = map.get(rel.personBId) ?? [];
      b.push(rel.personAId);
      map.set(rel.personBId, b);
    }
    return map;
  }, [graph]);

  const membersOfUnit = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const [individualId, unitId] of unitIdOf) {
      const list = map.get(unitId) ?? [];
      list.push(individualId);
      map.set(unitId, list);
    }
    return map;
  }, [unitIdOf]);

  const hiddenIds = useMemo(() => {
    const hidden = new Set<string>();
    const visited = new Set<string>();

    function hideWithSpouses(individualId: string) {
      if (visited.has(individualId)) return;
      visited.add(individualId);
      hidden.add(individualId);
      for (const spouseId of spousesOf.get(individualId) ?? []) {
        hidden.add(spouseId);
      }
      for (const childId of childrenOf.get(individualId) ?? []) {
        hideWithSpouses(childId);
      }
    }

    for (const collapsedUnitId of collapsedUnitIds) {
      for (const memberId of membersOfUnit.get(collapsedUnitId) ?? []) {
        for (const childId of childrenOf.get(memberId) ?? []) {
          hideWithSpouses(childId);
        }
      }
    }

    return hidden;
  }, [collapsedUnitIds, childrenOf, spousesOf, membersOfUnit]);

  const hasChildren = useCallback(
    (individualId: string) => {
      const unitId = unitIdOf.get(individualId);
      for (const memberId of membersOfUnit.get(unitId ?? individualId) ?? [individualId]) {
        if ((childrenOf.get(memberId)?.length ?? 0) > 0) return true;
      }
      return false;
    },
    [childrenOf, unitIdOf, membersOfUnit],
  );

  const isCollapsed = useCallback(
    (individualId: string) => collapsedUnitIds.has(unitIdOf.get(individualId) ?? individualId),
    [collapsedUnitIds, unitIdOf],
  );

  const toggle = useCallback(
    (individualId: string) => {
      const unitId = unitIdOf.get(individualId) ?? individualId;
      setCollapsedUnitIds((current) => {
        const next = new Set(current);
        if (next.has(unitId)) {
          next.delete(unitId);
        } else {
          next.add(unitId);
        }
        return next;
      });
    },
    [unitIdOf],
  );

  return { hiddenIds, hasChildren, isCollapsed, toggle };
}
