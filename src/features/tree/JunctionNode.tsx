import { Handle, Position } from "@xyflow/react";

/**
 * Invisible routing point sitting between a couple and their children: parents'
 * "bottom-source" handles feed into this node's "top-target", and its own
 * "bottom-source" fans out to each child's "top-target". Combined with the
 * smoothstep (elbow) edge path, this is what turns two separate parent→child
 * lines into a single shared ⊓-shaped trunk instead of two crossing curves.
 */
export function JunctionNode() {
  return (
    <div style={{ width: 1, height: 1 }}>
      <Handle type="target" position={Position.Top} id="top-target" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" style={{ opacity: 0 }} />
    </div>
  );
}
