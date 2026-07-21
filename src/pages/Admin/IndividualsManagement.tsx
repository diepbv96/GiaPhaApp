import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getFamilyTrees } from "@/features/trees/treeService";
import { listIndividualsAdmin } from "@/features/individuals/individualService";
import { getRelationshipCountForIndividual } from "@/features/relationships/relationshipService";
import { IndividualForm } from "@/features/individuals/IndividualForm";
import { DeleteIndividualDialog } from "@/features/individuals/DeleteIndividualDialog";
import { Modal } from "@/app/Modal";
import { useToast } from "@/app/ToastProvider";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { Individual, IndividualWithTrees } from "@/types";

const PAGE_SIZE = 25;

export default function IndividualsManagement() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [treeId, setTreeId] = useState("");
  const [page, setPage] = useState(0);
  const [editTarget, setEditTarget] = useState<IndividualWithTrees | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IndividualWithTrees | null>(null);

  const treesQuery = useQuery({ queryKey: ["family-trees", "all"], queryFn: getFamilyTrees });

  const listQuery = useQuery({
    queryKey: ["individuals", "admin", { page, treeId, search: debouncedSearch }],
    queryFn: () =>
      listIndividualsAdmin({
        page,
        pageSize: PAGE_SIZE,
        treeId: treeId || undefined,
        search: debouncedSearch || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const relationshipCountQuery = useQuery({
    queryKey: ["relationship-count", deleteTarget?.id],
    queryFn: () => getRelationshipCountForIndividual(deleteTarget!.id),
    enabled: deleteTarget !== null,
  });

  function invalidateList() {
    queryClient.invalidateQueries({ queryKey: ["individuals", "admin"] });
    queryClient.invalidateQueries({ queryKey: ["tree-graph"] });
  }

  function handleFilterChange(nextTreeId: string) {
    setTreeId(nextTreeId);
    setPage(0);
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(0);
  }

  const individuals = listQuery.data?.individuals ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-5xl p-6">
        <Link to="/" className="text-sm font-medium text-[var(--color-brand-600)] hover:underline">
          ← Về trang chủ
        </Link>

        <div className="mt-2">
          <h1 className="text-2xl font-semibold text-[var(--color-brand-700)]">Quản lý cá nhân</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Xem, tìm kiếm, lọc, sửa và xoá mọi cá thể trong tất cả các cây gia phả.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <input
            type="text"
            value={searchInput}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Tìm theo tên hoặc tên gọi khác..."
            aria-label="Tìm kiếm cá nhân"
            className="flex-1 min-w-[200px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={treeId}
            onChange={(event) => handleFilterChange(event.target.value)}
            aria-label="Lọc theo cây gia phả"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Tất cả cây gia phả</option>
            {(treesQuery.data ?? []).map((tree) => (
              <option key={tree.id} value={tree.id}>
                {tree.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6">
          {listQuery.isLoading ? (
            <p className="text-[var(--color-ink-muted)]">Đang tải...</p>
          ) : individuals.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-brand-100)] bg-[var(--color-surface-raised)] p-12 text-center">
              <p className="text-lg font-medium text-[var(--color-ink)]">Không tìm thấy cá nhân nào</p>
              <p className="max-w-sm text-sm text-[var(--color-ink-muted)]">
                Hãy thử một từ khoá khác hoặc bỏ bộ lọc cây gia phả.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {individuals.map((individual) => (
                <li
                  key={individual.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-brand-100)] bg-[var(--color-surface-raised)] p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{individual.fullName}</p>
                    <p className="truncate text-xs text-[var(--color-ink-muted)]">
                      {individual.familyTrees.map((tree) => tree.name).join(", ") || "Không có cây gia phả"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditTarget(individual)}
                      className="rounded-lg border border-[var(--color-brand-500)] px-3 py-1.5 text-xs font-medium text-[var(--color-brand-600)]"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(individual)}
                      className="rounded-lg border border-[var(--color-danger)] px-3 py-1.5 text-xs font-medium text-[var(--color-danger)]"
                    >
                      Xoá cá thể
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {total > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-ink-muted)]">
            <span>
              Trang {page + 1}/{totalPages} ({total} cá nhân)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
              >
                ← Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page + 1 >= totalPages}
                className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>

      {editTarget && (
        <Modal title="Sửa thông tin cá thể" onClose={() => setEditTarget(null)}>
          <IndividualForm
            // Never read in edit mode (initialIndividual is set) — createIndividual and the
            // create-only "Liên kết với" picker are both skipped (contracts/individual-edit.md).
            treeId={editTarget.familyTreeId}
            initialIndividual={editTarget}
            onCancel={() => setEditTarget(null)}
            onSuccess={(updated: Individual) => {
              invalidateList();
              setEditTarget(null);
              showToast("success", `Đã lưu thông tin của "${updated.fullName}".`);
            }}
          />
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Xoá cá thể" onClose={() => setDeleteTarget(null)}>
          {relationshipCountQuery.isLoading ? (
            <p className="text-sm text-[var(--color-ink-muted)]">Đang tải...</p>
          ) : (
            <DeleteIndividualDialog
              individual={deleteTarget}
              relationshipCount={relationshipCountQuery.data ?? 0}
              onCancel={() => setDeleteTarget(null)}
              onDeleted={() => {
                invalidateList();
                showToast("success", `Đã xoá "${deleteTarget.fullName}".`);
                setDeleteTarget(null);
              }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
