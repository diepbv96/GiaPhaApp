import { useState, type ReactNode } from "react";
import type { Individual, Relationship, TreeGraph } from "@/types";
import { formatPartialDate, genderLabel, siblingOrderLabel } from "@/lib/formatters";
import { getFamilyRelations, spouseRoleLabel } from "@/features/individuals/familyRelations";
import { LunarDateBadge } from "@/features/individuals/LunarDateBadge";

export interface IndividualDetailPanelProps {
  individual: Individual | null;
  graph: TreeGraph;
  onClose: () => void;
  onSelectIndividual?: (individualId: string) => void;
  /** Whether the current user may edit/delete relationships (admin/editor). */
  canManage?: boolean;
  /** Called when the user chooses to change an existing relationship's type. */
  onEditRelationship?: (relationship: Relationship, otherPerson: Individual) => void;
  /** Called when the user chooses to delete an existing relationship. */
  onDeleteRelationship?: (relationship: Relationship, otherPerson: Individual) => void;
  /** Slot for Admin/Editor-only edit/delete controls, wired in by later stories (FR-010/FR-011). */
  actions?: ReactNode;
}

/** Finds the direct relationship edge between two people, optionally restricted to one
 * type. Siblings can be inferred from two separate parent_child edges with no direct
 * edge of their own — callers should treat `undefined` as "nothing to edit/delete here". */
function findRelationship(
  graph: TreeGraph,
  aId: string,
  bId: string,
  type?: Relationship["type"],
): Relationship | undefined {
  return graph.relationships.find(
    (r) =>
      (type === undefined || r.type === type) &&
      ((r.personAId === aId && r.personBId === bId) || (r.personAId === bId && r.personBId === aId)),
  );
}

function PersonList({
  people,
  onSelectIndividual,
  labelFor,
  getRelationship,
  canManage,
  onEdit,
  onDelete,
}: {
  people: Individual[];
  onSelectIndividual?: (individualId: string) => void;
  labelFor?: (person: Individual) => string | undefined;
  getRelationship?: (person: Individual) => Relationship | undefined;
  canManage?: boolean;
  onEdit?: (relationship: Relationship, person: Individual) => void;
  onDelete?: (relationship: Relationship, person: Individual) => void;
}) {
  if (people.length === 0) return <p className="text-sm text-[var(--color-ink-muted)]">Chưa rõ</p>;

  return (
    <ul className="flex flex-col gap-1 text-sm">
      {people.map((person) => {
        const suffix = labelFor?.(person);
        const relationship = getRelationship?.(person);
        return (
          <li key={person.id} className="flex items-center justify-between gap-2">
            <span>
              <button
                type="button"
                onClick={() => onSelectIndividual?.(person.id)}
                disabled={!onSelectIndividual}
                className="text-left font-medium text-[var(--color-brand-600)] hover:underline disabled:cursor-default disabled:text-[var(--color-ink)] disabled:no-underline"
              >
                {person.fullName}
              </button>
              {suffix && <span className="text-[var(--color-ink-muted)]"> — {suffix}</span>}
            </span>
            {canManage && relationship && (
              <span className="flex flex-shrink-0 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => onEdit?.(relationship, person)}
                  className="text-[var(--color-brand-600)] hover:underline"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={() => onDelete?.(relationship, person)}
                  className="text-[var(--color-danger)] hover:underline"
                >
                  Xoá
                </button>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Chip({ tone, children }: { tone: "brand" | "success" | "muted" | "gold"; children: ReactNode }) {
  const toneClass = {
    brand: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
    success: "bg-green-100 text-green-800",
    muted: "bg-gray-100 text-[var(--color-ink-muted)]",
    gold: "bg-amber-100 text-amber-800",
  }[tone];

  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}>{children}</span>;
}

export function IndividualDetailPanel({
  individual,
  graph,
  onClose,
  onSelectIndividual,
  canManage,
  onEditRelationship,
  onDeleteRelationship,
  actions,
}: IndividualDetailPanelProps) {
  const [familyExpanded, setFamilyExpanded] = useState(false);

  // Collapse the (potentially long) family section again whenever the selected
  // individual changes, so navigating to a relative always starts from the same
  // compact, no-scroll-needed view rather than inheriting the previous person's
  // expanded state. Adjusting state during render (not in an effect) avoids an
  // extra post-mount render — see https://react.dev/learn/you-might-not-need-an-effect.
  const [lastIndividualId, setLastIndividualId] = useState(individual?.id);
  if (individual?.id !== lastIndividualId) {
    setLastIndividualId(individual?.id);
    setFamilyExpanded(false);
  }

  if (!individual) return null;

  const relations = getFamilyRelations(individual, graph);
  const familyCount =
    relations.parents.length +
    relations.spouses.length +
    relations.siblings.length +
    relations.biologicalChildren.length +
    relations.inLawChildren.length;

  return (
    <aside
      className="fixed right-0 top-0 flex h-dvh w-full max-w-sm flex-col bg-[var(--color-surface-raised)] shadow-2xl"
      aria-label="Thông tin cá nhân"
    >
      {/* Fixed header: stays in place while the body below scrolls. */}
      <div className="flex flex-shrink-0 flex-col items-center gap-2 border-b border-[var(--color-brand-100)] p-4">
        <button
          type="button"
          onClick={onClose}
          className="self-end text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          Đóng ✕
        </button>

        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[var(--color-brand-50)] text-2xl font-semibold text-[var(--color-brand-600)]">
          {individual.avatarUrl ? (
            <img src={individual.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            individual.fullName.charAt(0).toUpperCase()
          )}
        </div>
        <h2 className="text-center text-lg font-semibold text-[var(--color-ink)]">{individual.fullName}</h2>
        {individual.alias && (
          <p className="text-center text-sm italic text-[var(--color-ink-muted)]">Bí danh: "{individual.alias}"</p>
        )}

        <div className="flex flex-wrap justify-center gap-1.5">
          <Chip tone="brand">{genderLabel[individual.gender]}</Chip>
          <Chip tone={individual.isDeceased ? "muted" : "success"}>
            {individual.isDeceased ? "Đã mất" : "Còn sống"}
          </Chip>
          {individual.siblingOrder !== undefined && (
            <Chip tone="gold">{siblingOrderLabel(individual.siblingOrder, individual.gender)}</Chip>
          )}
        </div>
      </div>

      {/* Scrollable body — everything that can grow long lives in here, not the header/footer. */}
      <div className="flex-1 overflow-y-auto p-4">
        <dl className="grid grid-cols-3 gap-y-2 text-sm">
          <dt className="col-span-1 font-medium text-[var(--color-ink-muted)]">Ngày sinh</dt>
          <dd className="col-span-2">
            {formatPartialDate(individual.birthDate)}
            <LunarDateBadge date={individual.birthDate} />
          </dd>

          {individual.isDeceased && (
            <>
              <dt className="col-span-1 font-medium text-[var(--color-ink-muted)]">Ngày mất</dt>
              <dd className="col-span-2">
                {formatPartialDate(individual.deathDate)}
                <LunarDateBadge date={individual.deathDate} />
              </dd>
            </>
          )}
        </dl>

        {individual.notes && (
          <div className="mt-4">
            <h3 className="mb-1 text-sm font-medium text-[var(--color-ink-muted)]">Ghi chú</h3>
            <p className="text-sm text-[var(--color-ink)]">{individual.notes}</p>
          </div>
        )}

        <div className="mt-4 border-t border-[var(--color-brand-100)] pt-3">
          <button
            type="button"
            onClick={() => setFamilyExpanded((value) => !value)}
            aria-expanded={familyExpanded}
            className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-brand-50)]"
          >
            <span>Gia đình{familyCount > 0 ? ` (${familyCount})` : ""}</span>
            <span className="text-sm font-medium text-[var(--color-brand-600)]">
              {familyExpanded ? "Ẩn ▾" : "Xem chi tiết ▸"}
            </span>
          </button>

          {familyExpanded && (
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-[var(--color-ink-muted)]">Cha mẹ ruột</p>
                <PersonList
                  people={relations.parents}
                  onSelectIndividual={onSelectIndividual}
                  getRelationship={(person) => findRelationship(graph, person.id, individual.id, "parent_child")}
                  canManage={canManage}
                  onEdit={onEditRelationship}
                  onDelete={onDeleteRelationship}
                />
              </div>

              <div>
                <p className="mb-1 text-xs font-medium uppercase text-[var(--color-ink-muted)]">Vợ/chồng</p>
                <PersonList
                  people={relations.spouses}
                  onSelectIndividual={onSelectIndividual}
                  getRelationship={(person) => findRelationship(graph, individual.id, person.id, "spouse")}
                  canManage={canManage}
                  onEdit={onEditRelationship}
                  onDelete={onDeleteRelationship}
                />
              </div>

              <div>
                <p className="mb-1 text-xs font-medium uppercase text-[var(--color-ink-muted)]">Anh/chị/em</p>
                <PersonList
                  people={relations.siblings}
                  onSelectIndividual={onSelectIndividual}
                  getRelationship={(person) => findRelationship(graph, individual.id, person.id, "sibling")}
                  canManage={canManage}
                  onEdit={onEditRelationship}
                  onDelete={onDeleteRelationship}
                />
              </div>

              <div>
                <p className="mb-1 text-xs font-medium uppercase text-[var(--color-ink-muted)]">Con ruột</p>
                <PersonList
                  people={relations.biologicalChildren}
                  onSelectIndividual={onSelectIndividual}
                  getRelationship={(person) => findRelationship(graph, individual.id, person.id, "parent_child")}
                  canManage={canManage}
                  onEdit={onEditRelationship}
                  onDelete={onDeleteRelationship}
                />
              </div>

              {relations.inLawChildren.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-[var(--color-ink-muted)]">Con dâu / Con rể</p>
                  <PersonList
                    people={relations.inLawChildren.map((inLaw) => inLaw.individual)}
                    onSelectIndividual={onSelectIndividual}
                    labelFor={(person) => {
                      const inLaw = relations.inLawChildren.find((c) => c.individual.id === person.id);
                      return inLaw ? `${spouseRoleLabel(person)} của ${inLaw.marriedTo.fullName}` : undefined;
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed footer: primary actions are always reachable without scrolling. */}
      {actions && <div className="flex-shrink-0 border-t border-[var(--color-brand-100)] p-4">{actions}</div>}
    </aside>
  );
}
