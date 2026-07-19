import { useMemo } from "react";
import { hierarchy, tree, type HierarchyNode } from "d3-hierarchy";
import type { TreeGraph } from "@/types";

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
}

export interface TreeLayout {
  positions: Map<string, LayoutNode>;
  /** Individual id -> conjugal unit id (the unit a person's spouse edges group them into). */
  unitIdOf: Map<string, string>;
  /** Conjugal unit id -> the trunk point its parent→child edges route through (see JunctionNode). */
  junctions: Map<string, LayoutNode>;
}

// IndividualNode renders a fixed 200x150px card (src/features/tree/IndividualNode.tsx).
// MEMBER_GAP must exceed the width or spouses placed in the same unit overlap. Units vary
// in width (a single person vs. someone with two spouses is 3 cards wide), so there's no
// single fixed spacing that works between every pair of sibling units — see the custom
// `separation()` below, which sizes each gap from the two units' actual rendered widths.
const CARD_WIDTH = 200;
const CARD_HEIGHT = 150;
const CARD_GAP = 32; // minimum breathing room between any two adjacent cards
const MEMBER_GAP = CARD_WIDTH + CARD_GAP; // spacing between spouses in the same unit
const UNIT_GAP = CARD_GAP * 2; // gap between adjacent units that share the same parent unit
const SUBTREE_GAP = UNIT_GAP * 2; // extra gap between adjacent units from different parent units
const ROW_HEIGHT = 240;
// Sits the trunk's horizontal branch line in the empty gap between a parent row's card
// bottoms (CARD_HEIGHT) and the next row's card tops (ROW_HEIGHT).
const JUNCTION_Y_OFFSET = CARD_HEIGHT + (ROW_HEIGHT - CARD_HEIGHT) / 2;

interface UnitTreeItem {
  id: string;
  children: UnitTreeItem[];
}

/**
 * Genealogy trees are DAGs, not trees: a child can have two recorded parents, and a
 * person can have more than one spouse (remarriage). This layout groups individuals
 * into "conjugal units" (a person + all their recorded spouses, via union-find over
 * spouse edges) and lays out UNITS with d3-hierarchy instead of individuals directly.
 * That gives, for free:
 *   - spouses on the same row, placed next to each other (same unit, offset by index)
 *   - siblings on the same row (child units of the same parent unit, spread by d3.tree)
 *   - parents strictly one row above their children (unit tree depth = generation)
 * A unit's tree-parent is its members' *primary* recorded parent (lowest individual id,
 * mirroring the previous single-parent simplification) — in-law edges and any second
 * parent are still drawn directly by TreeCanvas from graph.relationships, just not used
 * to decide position. Explicit "sibling" edges that don't share a recorded parent are a
 * known layout limitation: those two people are positioned independently.
 *
 * `unitIdOf` and `junctions` (a per-unit trunk point) let TreeCanvas route parent→child
 * edges through a shared point below each couple instead of drawing two separate curves
 * straight to the child — see JunctionNode.
 */
export function useTreeLayout(graph: TreeGraph): TreeLayout {
  return useMemo(() => computeLayout(graph), [graph]);
}

function computeLayout(graph: TreeGraph): TreeLayout {
  const individualIds = new Set(graph.individuals.map((i) => i.id));

  // --- 1) Union-find over spouse edges: group mutually-married people into one unit ---
  const parentOf = new Map<string, string>();
  for (const individual of graph.individuals) parentOf.set(individual.id, individual.id);

  function find(id: string): string {
    let root = id;
    while (parentOf.get(root) !== root) root = parentOf.get(root)!;
    parentOf.set(id, root);
    return root;
  }

  function union(a: string, b: string) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parentOf.set(rootA, rootB);
  }

  for (const rel of graph.relationships) {
    if (rel.type === "spouse" && individualIds.has(rel.personAId) && individualIds.has(rel.personBId)) {
      union(rel.personAId, rel.personBId);
    }
  }

  const unitMembers = new Map<string, string[]>(); // unit root id -> member individual ids
  const unitIdOf = new Map<string, string>(); // individual id -> unit root id
  for (const individual of graph.individuals) {
    const root = find(individual.id);
    unitIdOf.set(individual.id, root);
    const members = unitMembers.get(root) ?? [];
    members.push(individual.id);
    unitMembers.set(root, members);
  }

  // --- 2) Primary recorded parent per individual (deterministic tie-break by id) ---
  const primaryParentOf = new Map<string, string>();
  for (const rel of graph.relationships) {
    if (rel.type !== "parent_child") continue;
    if (!individualIds.has(rel.personAId) || !individualIds.has(rel.personBId)) continue;
    const existing = primaryParentOf.get(rel.personBId);
    if (!existing || rel.personAId < existing) {
      primaryParentOf.set(rel.personBId, rel.personAId);
    }
  }

  // --- 3) Unit -> parent unit: among a unit's members, use whichever has the
  //        lowest id and a recorded primary parent. ---
  const unitParentUnit = new Map<string, string>();
  for (const [unitId, members] of unitMembers) {
    for (const memberId of [...members].sort()) {
      const parentId = primaryParentOf.get(memberId);
      if (parentId && individualIds.has(parentId)) {
        const parentUnit = unitIdOf.get(parentId)!;
        if (parentUnit !== unitId) unitParentUnit.set(unitId, parentUnit);
        break;
      }
    }
  }

  // --- 4) Build the unit tree ---
  const unitChildrenOf = new Map<string, string[]>();
  const unitRoots: string[] = [];
  for (const unitId of unitMembers.keys()) {
    const parentUnit = unitParentUnit.get(unitId);
    if (parentUnit) {
      const children = unitChildrenOf.get(parentUnit) ?? [];
      children.push(unitId);
      unitChildrenOf.set(parentUnit, children);
    } else {
      unitRoots.push(unitId);
    }
  }

  function buildUnitNode(id: string): UnitTreeItem {
    const children = (unitChildrenOf.get(id) ?? []).sort().map(buildUnitNode);
    return { id, children };
  }

  function unitWidth(unitId: string): number {
    const count = unitMembers.get(unitId)?.length ?? 1;
    return count * CARD_WIDTH + (count - 1) * CARD_GAP;
  }

  const virtualRoot: UnitTreeItem = { id: "__root__", children: unitRoots.sort().map(buildUnitNode) };
  const root = hierarchy<UnitTreeItem>(virtualRoot, (d) => d.children);
  // nodeSize[0] = 1 makes the layout's abstract horizontal unit a literal pixel, so the
  // separation() below can return the exact pixel gap each pair of adjacent units needs
  // — half of each unit's own rendered width plus a fixed breathing-room gap — instead of
  // relying on one fixed slot width that only fits the narrowest units.
  const layout = tree<UnitTreeItem>()
    .nodeSize([1, ROW_HEIGHT])
    .separation((a, b) => {
      const gap = a.parent === b.parent ? UNIT_GAP : SUBTREE_GAP;
      return unitWidth(a.data.id) / 2 + unitWidth(b.data.id) / 2 + gap;
    });
  layout(root);

  const unitPosition = new Map<string, { x: number; y: number }>();
  root.each((node: HierarchyNode<UnitTreeItem>) => {
    if (node.data.id === "__root__") return;
    unitPosition.set(node.data.id, { x: node.x ?? 0, y: node.y ?? 0 });
  });

  // --- 5) Order members within each unit, then place them in the unit's slot ---
  // Default convention for a simple couple: the member who continues the family's
  // recorded bloodline (has a primary parent on file) sits on the left; a spouse who
  // married in (con dâu/con rể, no recorded parent) sits on the right. Members with no
  // recorded parent at all (e.g. a root couple) keep a stable id-based order between
  // themselves — there's no blood/in-law distinction to make there.
  //
  // Units of 3+ are (almost always) one person with multiple spouses (remarriage), not
  // a group marriage: that central person — connected to every other member via a
  // spouse edge — is placed in the middle, with their spouses split evenly left/right,
  // rather than shoved to one end by the blood/in-law rule above.
  function orderUnitMembers(members: string[]): string[] {
    const orderPair = (a: string, b: string) => {
      const aIsInLaw = primaryParentOf.has(a) ? 0 : 1;
      const bIsInLaw = primaryParentOf.has(b) ? 0 : 1;
      if (aIsInLaw !== bIsInLaw) return aIsInLaw - bIsInLaw; // blood (0) before in-law (1)
      return a < b ? -1 : a > b ? 1 : 0;
    };

    if (members.length <= 2) return [...members].sort(orderPair);

    const memberSet = new Set(members);
    const spouseDegree = new Map<string, number>(members.map((id) => [id, 0]));
    for (const rel of graph.relationships) {
      if (rel.type !== "spouse") continue;
      if (!memberSet.has(rel.personAId) || !memberSet.has(rel.personBId)) continue;
      spouseDegree.set(rel.personAId, (spouseDegree.get(rel.personAId) ?? 0) + 1);
      spouseDegree.set(rel.personBId, (spouseDegree.get(rel.personBId) ?? 0) + 1);
    }

    const centerCandidates = members
      .filter((id) => spouseDegree.get(id) === members.length - 1)
      .sort();
    if (centerCandidates.length === 0) return [...members].sort(orderPair);

    const center = centerCandidates[0];
    const spouses = members.filter((id) => id !== center).sort(orderPair);
    const splitIndex = Math.ceil(spouses.length / 2);
    return [...spouses.slice(0, splitIndex), center, ...spouses.slice(splitIndex)];
  }

  const positions = new Map<string, LayoutNode>();
  for (const [unitId, members] of unitMembers) {
    const unitPos = unitPosition.get(unitId);
    if (!unitPos) continue;
    const orderedMembers = orderUnitMembers(members);
    const count = orderedMembers.length;
    orderedMembers.forEach((memberId, index) => {
      const offset = (index - (count - 1) / 2) * MEMBER_GAP;
      positions.set(memberId, { id: memberId, x: unitPos.x + offset, y: unitPos.y });
    });
  }

  for (const individual of graph.individuals) {
    if (individual.layoutPosition) {
      positions.set(individual.id, {
        id: individual.id,
        x: individual.layoutPosition.x,
        y: individual.layoutPosition.y,
      });
    }
  }

  // --- 6) Junction (trunk) point per unit, centered under the unit's card(s). ---
  const junctions = new Map<string, LayoutNode>();
  for (const [unitId, unitPos] of unitPosition) {
    junctions.set(unitId, {
      id: unitId,
      x: unitPos.x + CARD_WIDTH / 2,
      y: unitPos.y + JUNCTION_Y_OFFSET,
    });
  }

  return { positions, unitIdOf, junctions };
}
