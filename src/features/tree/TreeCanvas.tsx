import { forwardRef, useMemo } from "react";
import { ReactFlow, Background, Controls, type Edge, type Node, type OnNodeDrag } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { TreeGraph } from "@/types";
import { useTreeLayout } from "@/features/tree/useTreeLayout";
import { useExpandCollapse } from "@/features/tree/useExpandCollapse";
import { IndividualNode, type IndividualNodeData } from "@/features/tree/IndividualNode";
import { JunctionNode } from "@/features/tree/JunctionNode";
import { RelationshipEdge, type RelationshipEdgeData } from "@/features/tree/RelationshipEdge";
import { filterOutInLaws } from "@/features/tree/inLawFilter";

const nodeTypes = { individual: IndividualNode, junction: JunctionNode };
const edgeTypes = { relationship: RelationshipEdge };

export interface TreeCanvasProps {
  graph: TreeGraph;
  onSelectIndividual: (individualId: string) => void;
  /** Admin/Editor only — Viewers and guests get a read-only, non-draggable canvas. */
  canDrag?: boolean;
  onNodePositionChange?: (individualId: string, position: { x: number; y: number }) => void;
  /** When true, hides every married-in individual, showing only blood relatives. */
  hideInLaws?: boolean;
}

export const TreeCanvas = forwardRef<HTMLDivElement, TreeCanvasProps>(function TreeCanvas(
  { graph, onSelectIndividual, canDrag = false, onNodePositionChange, hideInLaws = false },
  ref,
) {
  // spec.md US2 acceptance scenario 1: a newly created individual only appears on the
  // tree once at least one relationship links them to it — isolated individuals with
  // zero relationships are excluded from the visual diagram.
  const connectedGraph = useMemo<TreeGraph>(() => {
    const connectedIds = new Set<string>();
    for (const rel of graph.relationships) {
      connectedIds.add(rel.personAId);
      connectedIds.add(rel.personBId);
    }
    return {
      individuals: graph.individuals.filter((individual) => connectedIds.has(individual.id)),
      relationships: graph.relationships,
    };
  }, [graph]);

  const displayGraph = useMemo<TreeGraph>(
    () => (hideInLaws ? filterOutInLaws(connectedGraph) : connectedGraph),
    [connectedGraph, hideInLaws],
  );

  const { positions, unitIdOf, junctions } = useTreeLayout(displayGraph);
  const { hiddenIds, hasChildren, isCollapsed, toggle } = useExpandCollapse(displayGraph, unitIdOf);

  const { nodes, edges } = useMemo(() => {
    const visibleIndividuals = displayGraph.individuals.filter((individual) => !hiddenIds.has(individual.id));
    const visibleIds = new Set(visibleIndividuals.map((individual) => individual.id));

    const edgeList: Edge<RelationshipEdgeData>[] = [];

    // parent_child: route through a shared "junction" trunk point per conjugal unit
    // instead of drawing separate curves straight from each parent to the child — see
    // useTreeLayout's `junctions` and JunctionNode. Group each child's recorded parents
    // by unit first so two spouses feeding the same child share one trunk.
    const parentIdsByChildAndUnit = new Map<string, Map<string, string[]>>();
    for (const rel of displayGraph.relationships) {
      if (rel.type !== "parent_child") continue;
      const parentId = rel.personAId;
      const childId = rel.personBId;
      if (!visibleIds.has(parentId) || !visibleIds.has(childId)) continue;
      const unitId = unitIdOf.get(parentId);
      if (!unitId) continue;

      const byUnit = parentIdsByChildAndUnit.get(childId) ?? new Map<string, string[]>();
      const parentIds = byUnit.get(unitId) ?? [];
      parentIds.push(parentId);
      byUnit.set(unitId, parentIds);
      parentIdsByChildAndUnit.set(childId, byUnit);
    }

    const activeJunctionUnitIds = new Set<string>();
    const parentToJunctionDrawn = new Set<string>();

    for (const [childId, byUnit] of parentIdsByChildAndUnit) {
      for (const [unitId, parentIds] of byUnit) {
        activeJunctionUnitIds.add(unitId);
        const junctionNodeId = `junction-${unitId}`;

        for (const parentId of parentIds) {
          const key = `${parentId}->${unitId}`;
          if (parentToJunctionDrawn.has(key)) continue;
          parentToJunctionDrawn.add(key);
          edgeList.push({
            id: `pj-${key}`,
            type: "relationship",
            source: parentId,
            sourceHandle: "bottom-source",
            target: junctionNodeId,
            targetHandle: "top-target",
            data: { type: "parent_child" },
          });
        }

        edgeList.push({
          id: `jc-${unitId}-${childId}`,
          type: "relationship",
          source: junctionNodeId,
          sourceHandle: "bottom-source",
          target: childId,
          targetHandle: "top-target",
          data: { type: "parent_child" },
        });
      }
    }

    // spouse/sibling: same-row connections drawn as a straight horizontal line between
    // whichever member sits further left (its right handle) and further right (its left
    // handle) — avoids the diagonal line you'd get from forcing the top/bottom handles.
    for (const rel of displayGraph.relationships) {
      if (rel.type === "parent_child") continue;
      if (!visibleIds.has(rel.personAId) || !visibleIds.has(rel.personBId)) continue;
      const posA = positions.get(rel.personAId);
      const posB = positions.get(rel.personBId);
      if (!posA || !posB) continue;

      const [leftId, rightId] = posA.x <= posB.x ? [rel.personAId, rel.personBId] : [rel.personBId, rel.personAId];
      edgeList.push({
        id: rel.id,
        type: "relationship",
        source: leftId,
        sourceHandle: "right-source",
        target: rightId,
        targetHandle: "left-target",
        data: { type: rel.type },
      });
    }

    const individualNodes: Node<IndividualNodeData>[] = visibleIndividuals.map((individual) => {
      const position = positions.get(individual.id) ?? { x: 0, y: 0 };
      return {
        id: individual.id,
        type: "individual",
        position: { x: position.x, y: position.y },
        data: {
          individual,
          hasChildren: hasChildren(individual.id),
          collapsed: isCollapsed(individual.id),
          onToggleCollapse: toggle,
          onSelect: onSelectIndividual,
        },
      };
    });

    const junctionNodes: Node[] = [...activeJunctionUnitIds].map((unitId) => {
      const junctionPos = junctions.get(unitId) ?? { x: 0, y: 0 };
      return {
        id: `junction-${unitId}`,
        type: "junction",
        position: { x: junctionPos.x, y: junctionPos.y },
        draggable: false,
        selectable: false,
        data: {},
      };
    });

    return { nodes: [...individualNodes, ...junctionNodes], edges: edgeList };
  }, [displayGraph, positions, unitIdOf, junctions, hiddenIds, hasChildren, isCollapsed, toggle, onSelectIndividual]);

  const handleNodeDragStop: OnNodeDrag = (_event, node) => {
    onNodePositionChange?.(node.id, node.position);
  };

  return (
    <div ref={ref} className="h-full w-full" data-testid="tree-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={canDrag}
        onNodeDragStop={handleNodeDragStop}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--color-brand-100)" gap={24} />
        <Controls />
      </ReactFlow>
    </div>
  );
});
