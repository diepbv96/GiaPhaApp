import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Individual } from "@/types";

export interface IndividualNodeData {
  individual: Individual;
  hasChildren: boolean;
  collapsed: boolean;
  onToggleCollapse: (individualId: string) => void;
  onSelect: (individualId: string) => void;
  [key: string]: unknown;
}

const genderBorderColor: Record<Individual["gender"], string> = {
  male: "var(--color-gender-male)",
  female: "var(--color-gender-female)",
  unknown: "var(--color-gender-unknown)",
};

// Living/deceased is the card-level signal now (004-tree-display-customization
// FR-001); gender moved to the avatar's border (FR-002) — see genderBorderColor above.
const cardStatusStyle: Record<"living" | "deceased", { border: string; background: string }> = {
  living: { border: "var(--color-card-living-border)", background: "var(--color-card-living-bg)" },
  deceased: { border: "var(--color-card-deceased-border)", background: "var(--color-card-deceased-bg)" },
};

// Fixed size (kept in sync with useTreeLayout's CARD_WIDTH/CARD_HEIGHT) so every card
// lines up in the grid regardless of how long a name is or whether it has children —
// the card only ever shows the avatar and full name; everything else lives in the
// detail panel.
export function IndividualNode({ data }: NodeProps & { data: IndividualNodeData }) {
  const { individual, hasChildren, collapsed, onToggleCollapse, onSelect } = data;
  const statusStyle = cardStatusStyle[individual.isDeceased ? "deceased" : "living"];

  return (
    <div
      className="relative flex h-[150px] w-[200px] cursor-pointer flex-col items-center justify-between rounded-xl p-3 text-center shadow-md transition hover:shadow-lg"
      style={{ border: `2px solid ${statusStyle.border}`, backgroundColor: statusStyle.background }}
      onClick={() => onSelect(individual.id)}
    >
      {individual.siblingOrder !== undefined && (
        <span
          className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-xs font-semibold text-white shadow"
          title={`Thứ ${individual.siblingOrder} trong các anh/chị/em`}
        >
          {individual.siblingOrder}
        </span>
      )}

      {/* Handles are purely routing anchors (no user-drawn connections), hence opacity 0.
          Left/Right get a fixed `top` (the avatar's vertical center) so the spouse
          connector line stays level regardless of card content. */}
      <Handle type="target" position={Position.Top} id="top-target" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0, top: 40 }} />
      <Handle type="source" position={Position.Right} id="right-source" style={{ opacity: 0, top: 40 }} />

      <div className="flex flex-col items-center">
        <div
          className="mb-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[var(--color-brand-50)] text-lg font-semibold text-[var(--color-brand-600)]"
          style={{ border: `3px solid ${genderBorderColor[individual.gender]}` }}
          aria-hidden
        >
          {individual.avatarUrl ? (
            <img src={individual.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(individual.fullName)
          )}
        </div>

        <p className="w-full truncate text-sm font-semibold text-[var(--color-ink)]">{individual.fullName}</p>
      </div>

      <Handle type="source" position={Position.Bottom} id="bottom-source" style={{ opacity: 0 }} />

      <div className="mt-2 flex h-6 items-center">
        {hasChildren && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleCollapse(individual.id);
            }}
            className="rounded-full bg-[var(--color-brand-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-brand-700)]"
            aria-label={collapsed ? "Xổ ra" : "Thu gọn"}
          >
            {collapsed ? "Xổ ra ▾" : "Thu gọn ▴"}
          </button>
        )}
      </div>
    </div>
  );
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const last = parts.at(-1) ?? "";
  return last.charAt(0).toUpperCase();
}
