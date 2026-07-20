import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFamilyTrees } from "@/features/trees/treeService";
import { getTreeGraph } from "@/features/tree/treeGraphService";
import { TreeCanvas } from "@/features/tree/TreeCanvas";
import { BackgroundColorControl } from "@/features/tree/BackgroundColorControl";
import { useBackgroundColorPreference } from "@/features/tree/useBackgroundColorPreference";
import { IndividualDetailPanel } from "@/features/individuals/IndividualDetailPanel";
import { IndividualForm } from "@/features/individuals/IndividualForm";
import { DeleteIndividualDialog } from "@/features/individuals/DeleteIndividualDialog";
import { updateIndividualPosition } from "@/features/individuals/individualService";
import { RelationshipForm } from "@/features/relationships/RelationshipForm";
import { ImportDialog } from "@/features/import/ImportDialog";
import { ExportButton } from "@/features/export/ExportButton";
import { Modal } from "@/app/Modal";
import { Sidebar, SidebarSection, SidebarItem, SidebarToggle } from "@/app/Sidebar";
import { useAuth } from "@/features/auth/AuthContext";
import { signOut } from "@/features/auth/authService";
import type { Individual } from "@/types";

type ModalState =
  | { kind: "create-individual" }
  | { kind: "edit-individual"; individual: Individual }
  | { kind: "delete-individual"; individual: Individual }
  | { kind: "create-relationship"; personAId?: string }
  | { kind: "import" }
  | null;

export interface TreeWorkspaceProps {
  treeId: string;
  treeName: string;
  /** Where this tree's "Sự kiện sắp tới" sidebar link points — the default tree uses
   * "/su-kien-sap-toi"; a slug-viewed tree uses "/<slug>/su-kien-sap-toi" (spec FR-001). */
  upcomingEventsPath: string;
}

/**
 * The full tree-viewing-and-management experience — sidebar, canvas, detail panel,
 * and every create/edit/delete/import modal — parameterized by which tree to show.
 * Used identically by the home screen (default tree) and by a slug-viewed tree
 * (spec FR-002): the underlying RLS policies already grant Admin/Editor write access
 * to any tree regardless of `is_default` (data-model.md), so this component simply
 * makes that already-permitted capability reachable everywhere, not just at "/".
 */
export function TreeWorkspace({ treeId, treeName, upcomingEventsPath }: TreeWorkspaceProps) {
  const { session, role } = useAuth();
  const isGuest = !session;
  const canManage = role === "admin" || role === "editor";
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [hideInLaws, setHideInLaws] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const backgroundColorPreference = useBackgroundColorPreference(treeId);

  const allTreesQuery = useQuery({ queryKey: ["family-trees", "all"], queryFn: getFamilyTrees, enabled: canManage });

  const treeGraphQuery = useQuery({
    queryKey: ["tree-graph", treeId],
    queryFn: () => getTreeGraph(treeId),
  });

  const graph = treeGraphQuery.data;
  const selectedIndividual = graph?.individuals.find((i) => i.id === selectedId) ?? null;
  const relationshipCount = selectedIndividual
    ? (graph?.relationships.filter(
        (r) => r.personAId === selectedIndividual.id || r.personBId === selectedIndividual.id,
      ).length ?? 0)
    : 0;

  function refreshGraph() {
    queryClient.invalidateQueries({ queryKey: ["tree-graph", treeId] });
  }

  function handleNodePositionChange(individualId: string, position: { x: number; y: number }) {
    updateIndividualPosition(individualId, position).catch(() => {
      // Best-effort persistence; the node keeps its dragged position for this
      // session even if the save fails, so no error UI is needed here.
    });
  }

  return (
    <div className="flex h-dvh">
      <Sidebar title={treeName}>
        <SidebarSection title="Hiển thị">
          <SidebarToggle icon="🧬" label="Ẩn dâu/rễ" checked={hideInLaws} onChange={setHideInLaws} />
          <BackgroundColorControl preference={backgroundColorPreference} />
          {graph && <ExportButton viewportRef={viewportRef} />}
          <SidebarItem icon="📅" to={upcomingEventsPath}>
            Sự kiện sắp tới
          </SidebarItem>
        </SidebarSection>

        {canManage && graph && (
          <SidebarSection title="Quản lý cá thể">
            <SidebarItem icon="➕" onClick={() => setModal({ kind: "create-individual" })}>
              Thêm cá thể
            </SidebarItem>
            <SidebarItem icon="📥" onClick={() => setModal({ kind: "import" })}>
              Nhập từ Excel
            </SidebarItem>
          </SidebarSection>
        )}

        <SidebarSection title="Tài khoản">
          {role === "admin" && (
            <>
              <SidebarItem icon="🌳" to="/quan-tri/cay-gia-pha">
                Quản lý cây gia phả
              </SidebarItem>
              <SidebarItem icon="🔔" to="/quan-tri/thong-bao">
                Cấu hình thông báo
              </SidebarItem>
            </>
          )}
          {isGuest ? (
            <SidebarItem icon="🔑" to="/dang-nhap">
              Đăng nhập
            </SidebarItem>
          ) : (
            <SidebarItem icon="🚪" onClick={() => signOut()}>
              Đăng xuất
            </SidebarItem>
          )}
        </SidebarSection>
      </Sidebar>

      <main className="relative flex-1">
        {treeGraphQuery.isLoading ? (
          <p className="p-6 text-[var(--color-ink-muted)]">Đang tải cây gia phả...</p>
        ) : graph ? (
          <TreeCanvas
            ref={viewportRef}
            graph={graph}
            onSelectIndividual={setSelectedId}
            canDrag={canManage}
            onNodePositionChange={handleNodePositionChange}
            hideInLaws={hideInLaws}
            backgroundColor={backgroundColorPreference.effectiveColor}
          />
        ) : null}

        <IndividualDetailPanel
          individual={selectedIndividual}
          graph={graph ?? { individuals: [], relationships: [] }}
          onSelectIndividual={setSelectedId}
          onClose={() => setSelectedId(null)}
          actions={
            canManage && selectedIndividual ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setModal({ kind: "edit-individual", individual: selectedIndividual })}
                  className="rounded-lg border border-[var(--color-brand-500)] px-3 py-1.5 text-sm font-medium text-[var(--color-brand-600)]"
                >
                  Sửa thông tin
                </button>
                <button
                  type="button"
                  onClick={() => setModal({ kind: "create-relationship", personAId: selectedIndividual.id })}
                  className="rounded-lg border border-[var(--color-brand-500)] px-3 py-1.5 text-sm font-medium text-[var(--color-brand-600)]"
                >
                  Thêm mối quan hệ
                </button>
                <button
                  type="button"
                  onClick={() => setModal({ kind: "delete-individual", individual: selectedIndividual })}
                  className="rounded-lg border border-[var(--color-danger)] px-3 py-1.5 text-sm font-medium text-[var(--color-danger)]"
                >
                  Xoá cá thể
                </button>
              </div>
            ) : undefined
          }
        />
      </main>

      {modal?.kind === "create-individual" && (
        <Modal title="Thêm cá thể mới" onClose={() => setModal(null)}>
          <IndividualForm
            treeId={treeId}
            existingIndividuals={graph?.individuals ?? []}
            onCancel={() => setModal(null)}
            onSuccess={() => {
              refreshGraph();
              setModal(null);
            }}
          />
        </Modal>
      )}

      {modal?.kind === "edit-individual" && (
        <Modal title="Sửa thông tin cá thể" onClose={() => setModal(null)}>
          <IndividualForm
            treeId={treeId}
            initialIndividual={modal.individual}
            onCancel={() => setModal(null)}
            onSuccess={() => {
              refreshGraph();
              setModal(null);
            }}
          />
        </Modal>
      )}

      {modal?.kind === "delete-individual" && (
        <Modal title="Xoá cá thể" onClose={() => setModal(null)}>
          <DeleteIndividualDialog
            individual={modal.individual}
            relationshipCount={relationshipCount}
            onCancel={() => setModal(null)}
            onDeleted={() => {
              refreshGraph();
              setSelectedId(null);
              setModal(null);
            }}
          />
        </Modal>
      )}

      {modal?.kind === "create-relationship" && graph && (
        <Modal title="Thêm mối quan hệ" onClose={() => setModal(null)}>
          <RelationshipForm
            treeId={treeId}
            individuals={graph.individuals}
            defaultPersonAId={modal.personAId}
            onCancel={() => setModal(null)}
            onSuccess={() => {
              refreshGraph();
              setModal(null);
            }}
          />
        </Modal>
      )}

      {modal?.kind === "import" && (
        <Modal title="Nhập cây gia phả từ Excel" onClose={() => setModal(null)}>
          <ImportDialog
            trees={allTreesQuery.data ?? [{ id: treeId, name: treeName, slug: "", isDefault: false, isPublic: false }]}
            defaultTreeId={treeId}
            onClose={() => setModal(null)}
            onImported={refreshGraph}
          />
        </Modal>
      )}
    </div>
  );
}
