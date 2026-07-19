import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getDefaultFamilyTree, getFamilyTrees } from "@/features/trees/treeService";
import { getTreeGraph } from "@/features/tree/treeGraphService";
import { TreeCanvas } from "@/features/tree/TreeCanvas";
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

export default function Home() {
  const { session, role, loading: authLoading } = useAuth();
  const isGuest = !session;
  const canManage = role === "admin" || role === "editor";
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [hideInLaws, setHideInLaws] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const defaultTreeQuery = useQuery({
    queryKey: ["family-trees", "default", session?.user.id ?? "guest"],
    queryFn: getDefaultFamilyTree,
    enabled: !authLoading,
  });

  const allTreesQuery = useQuery({
    queryKey: ["family-trees", "all"],
    queryFn: getFamilyTrees,
    enabled: canManage,
  });

  const treeId = defaultTreeQuery.data?.id;

  const treeGraphQuery = useQuery({
    queryKey: ["tree-graph", treeId],
    queryFn: () => getTreeGraph(treeId!),
    enabled: Boolean(treeId),
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
      <Sidebar title={defaultTreeQuery.data?.name ?? "Gia Phả Dòng Họ Bùi"}>
        <SidebarSection title="Hiển thị">
          <SidebarToggle
            icon="🧬"
            label="Chỉ hiển thị cùng huyết thống"
            checked={hideInLaws}
            onChange={setHideInLaws}
          />
          {graph && <ExportButton viewportRef={viewportRef} />}
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
            <SidebarItem icon="🌳" to="/quan-tri/cay-gia-pha">
              Quản lý cây gia phả
            </SidebarItem>
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
        {authLoading || defaultTreeQuery.isLoading || treeGraphQuery.isLoading ? (
          <p className="p-6 text-[var(--color-ink-muted)]">Đang tải cây gia phả...</p>
        ) : !defaultTreeQuery.data ? (
          isGuest ? (
            <div className="p-6 text-[var(--color-ink-muted)]">
              <p className="mb-2">Cây gia phả này chưa được công khai.</p>
              <Link to="/dang-nhap" className="font-medium text-[var(--color-brand-600)] hover:underline">
                Đăng nhập để xem
              </Link>
            </div>
          ) : (
            <p className="p-6 text-[var(--color-ink-muted)]">Chưa có cây gia phả nào được đặt làm mặc định.</p>
          )
        ) : graph ? (
          <TreeCanvas
            ref={viewportRef}
            graph={graph}
            onSelectIndividual={setSelectedId}
            canDrag={canManage}
            onNodePositionChange={handleNodePositionChange}
            hideInLaws={hideInLaws}
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

      {modal?.kind === "create-individual" && treeId && (
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

      {modal?.kind === "edit-individual" && treeId && (
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

      {modal?.kind === "create-relationship" && treeId && graph && (
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
            trees={allTreesQuery.data ?? (defaultTreeQuery.data ? [defaultTreeQuery.data] : [])}
            defaultTreeId={treeId}
            onClose={() => setModal(null)}
            onImported={refreshGraph}
          />
        </Modal>
      )}
    </div>
  );
}
