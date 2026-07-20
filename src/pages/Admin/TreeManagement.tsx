import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  createFamilyTree,
  deleteFamilyTree,
  getFamilyTrees,
  setDefaultFamilyTree,
  setTreePublic,
} from "@/features/trees/treeService";
import { Modal } from "@/app/Modal";
import { useToast } from "@/app/ToastProvider";
import { SlugField } from "@/features/trees/SlugField";
import type { FamilyTreeSummary } from "@/types";

const MAX_TREES = 5;

export default function TreeManagement() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [newTreeName, setNewTreeName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FamilyTreeSummary | null>(null);
  const [slugEditTarget, setSlugEditTarget] = useState<FamilyTreeSummary | null>(null);

  const treesQuery = useQuery({ queryKey: ["family-trees", "all"], queryFn: getFamilyTrees });

  function invalidateTrees() {
    queryClient.invalidateQueries({ queryKey: ["family-trees"] });
  }

  const createMutation = useMutation({
    mutationFn: (name: string) => createFamilyTree(name),
    onSuccess: (tree) => {
      setNewTreeName("");
      setCreateError(null);
      setCreateOpen(false);
      invalidateTrees();
      showToast("success", `Đã tạo cây gia phả "${tree.name}".`);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Không thể tạo cây gia phả.";
      setCreateError(message);
      showToast("error", message);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (treeId: string) => setDefaultFamilyTree(treeId),
    onSuccess: () => {
      invalidateTrees();
      showToast("success", "Đã đặt cây gia phả mặc định.");
    },
    onError: (err) => showToast("error", err instanceof Error ? err.message : "Không thể đặt cây mặc định."),
  });

  const setPublicMutation = useMutation({
    mutationFn: ({ treeId, isPublic }: { treeId: string; isPublic: boolean }) => setTreePublic(treeId, isPublic),
    onSuccess: (_data, variables) => {
      invalidateTrees();
      showToast("success", variables.isPublic ? "Đã công khai cây gia phả." : "Đã chuyển về riêng tư.");
    },
    onError: (err) =>
      showToast("error", err instanceof Error ? err.message : "Không thể thay đổi trạng thái công khai."),
  });

  const deleteMutation = useMutation({
    mutationFn: (treeId: string) => deleteFamilyTree(treeId),
    onSuccess: () => {
      invalidateTrees();
      setDeleteTarget(null);
      showToast("success", "Đã xoá cây gia phả.");
    },
    onError: (err) => showToast("error", err instanceof Error ? err.message : "Không thể xoá cây gia phả."),
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!newTreeName.trim()) return;
    createMutation.mutate(newTreeName.trim());
  }

  function openCreate() {
    setNewTreeName("");
    setCreateError(null);
    setCreateOpen(true);
  }

  const trees = treesQuery.data ?? [];
  const atLimit = trees.length >= MAX_TREES;

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-5xl p-6">
        <Link to="/" className="text-sm font-medium text-[var(--color-brand-600)] hover:underline">
          ← Về trang chủ
        </Link>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-brand-700)]">Quản lý cây gia phả</h1>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              Tạo, đặt mặc định, công khai hoặc xoá các cây gia phả trong hệ thống.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            disabled={atLimit}
            title={atLimit ? "Đã đạt tối đa 5 cây gia phả. Xoá một cây để tạo cây mới." : undefined}
            className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Tạo cây gia phả mới
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: MAX_TREES }).map((_, index) => (
              <span
                key={index}
                className={`h-2 w-6 rounded-full ${
                  index < trees.length ? "bg-[var(--color-brand-500)]" : "bg-[var(--color-brand-100)]"
                }`}
              />
            ))}
          </div>
          <span>
            {trees.length}/{MAX_TREES} cây gia phả
          </span>
        </div>

        <div className="mt-6">
          {treesQuery.isLoading ? (
            <p className="text-[var(--color-ink-muted)]">Đang tải...</p>
          ) : trees.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--color-brand-100)] bg-[var(--color-surface-raised)] p-12 text-center">
              <p className="text-lg font-medium text-[var(--color-ink)]">Chưa có cây gia phả nào</p>
              <p className="max-w-sm text-sm text-[var(--color-ink-muted)]">
                Tạo cây gia phả đầu tiên để bắt đầu thêm thành viên và xây dựng phả hệ dòng họ.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="mt-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)]"
              >
                + Tạo cây gia phả mới
              </button>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trees.map((tree) => (
                <li
                  key={tree.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--color-brand-100)] bg-[var(--color-surface-raised)] p-4 shadow-sm transition hover:shadow-md"
                >
                  <div>
                    <p className="truncate text-base font-semibold text-[var(--color-ink)]" title={tree.name}>
                      {tree.name}
                    </p>
                    <p className="truncate font-mono text-xs text-[var(--color-ink-muted)]" title={tree.slug}>
                      /{tree.slug}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tree.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          🏠 Mặc định
                        </span>
                      )}
                      {tree.isPublic ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-50)] px-2 py-0.5 text-xs font-medium text-[var(--color-brand-600)]">
                          🌐 Công khai
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-[var(--color-ink-muted)]">
                          🔒 Riêng tư
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-1 border-t border-[var(--color-brand-100)] pt-3">
                    {!tree.isDefault && (
                      <button
                        type="button"
                        onClick={() => setDefaultMutation.mutate(tree.id)}
                        disabled={setDefaultMutation.isPending}
                        className="w-full rounded-lg px-2 py-1.5 text-left text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-brand-50)] disabled:opacity-60"
                      >
                        🏠 Đặt làm mặc định
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPublicMutation.mutate({ treeId: tree.id, isPublic: !tree.isPublic })}
                      disabled={setPublicMutation.isPending}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-brand-50)] disabled:opacity-60"
                    >
                      {tree.isPublic ? "🔒 Chuyển về riêng tư" : "🌐 Công khai"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlugEditTarget(tree)}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-brand-50)]"
                    >
                      ✏️ Sửa slug
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(tree)}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-sm font-medium text-[var(--color-danger)] transition hover:bg-red-50"
                    >
                      🗑️ Xoá cây gia phả
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {createOpen && (
        <Modal title="Tạo cây gia phả mới" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="newTreeName">
                Tên cây gia phả
              </label>
              <input
                id="newTreeName"
                autoFocus
                value={newTreeName}
                onChange={(event) => setNewTreeName(event.target.value)}
                placeholder="VD: Gia phả họ Bùi - Chi 1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            {createError && <p className="text-sm text-[var(--color-danger)]">{createError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg px-4 py-2 text-sm text-[var(--color-ink-muted)]"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || !newTreeName.trim()}
                className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] disabled:opacity-60"
              >
                {createMutation.isPending ? "Đang tạo..." : "Tạo mới"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {slugEditTarget && (
        <Modal title={`Sửa slug — ${slugEditTarget.name}`} onClose={() => setSlugEditTarget(null)}>
          <SlugField
            treeId={slugEditTarget.id}
            currentSlug={slugEditTarget.slug}
            onCancel={() => setSlugEditTarget(null)}
            onSaved={() => setSlugEditTarget(null)}
          />
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Xoá cây gia phả" onClose={() => setDeleteTarget(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--color-ink)]">
              Xoá cây <strong>"{deleteTarget.name}"</strong> sẽ xoá toàn bộ cá thể, mối quan hệ và lịch sử nhập liệu
              của cây này. Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg px-4 py-2 text-sm text-[var(--color-ink-muted)]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-[var(--color-danger)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Đang xoá..." : "Xoá"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
