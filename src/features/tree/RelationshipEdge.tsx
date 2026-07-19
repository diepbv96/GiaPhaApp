import { BaseEdge, getStraightPath, type EdgeProps } from "@xyflow/react";
import type { RelationshipType } from "@/types";

export interface RelationshipEdgeData {
  type: RelationshipType;
  [key: string]: unknown;
}

const edgeStyleByType: Record<RelationshipType, { stroke: string; strokeDasharray?: string }> = {
  parent_child: { stroke: "var(--color-rel-parent-child)" },
  spouse: { stroke: "var(--color-rel-spouse)", strokeDasharray: "6 4" },
  sibling: { stroke: "var(--color-rel-sibling)", strokeDasharray: "1 5" },
};

// A hand-built elbow with exactly one bend (down/across/down), rather than
// getSmoothStepPath's heuristic routing — that library function adds its own
// stub offsets and can double-bend depending on relative node positions, which
// on a dense tree reads as an unwanted zigzag. This is always: straight down if
// the two ends already line up, otherwise one clean 90° bend at the midpoint.
function elbowPath(sourceX: number, sourceY: number, targetX: number, targetY: number): string {
  if (Math.abs(sourceX - targetX) < 1) {
    return `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
  }
  const midY = (sourceY + targetY) / 2;
  return `M ${sourceX},${sourceY} L ${sourceX},${midY} L ${targetX},${midY} L ${targetX},${targetY}`;
}

export function RelationshipEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps & { data: RelationshipEdgeData }) {
  const type = data.type;
  // parent_child edges connect either a parent to its couple's junction trunk point, or
  // that trunk down to a child (see TreeCanvas/JunctionNode) — a single right-angled
  // elbow reads as the classic ⊓ family-tree connector, unlike a bezier curve.
  const path =
    type === "parent_child"
      ? elbowPath(sourceX, sourceY, targetX, targetY)
      : getStraightPath({ sourceX, sourceY, targetX, targetY })[0];

  const { stroke, strokeDasharray } = edgeStyleByType[type];

  return (
    <BaseEdge
      path={path}
      style={{ stroke, strokeWidth: 2, strokeDasharray }}
      labelX={(sourceX + targetX) / 2}
      labelY={(sourceY + targetY) / 2}
    />
  );
}
