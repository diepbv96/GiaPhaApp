import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getFamilyTrees } from "@/features/trees/treeService";
import {
  addIndividualToTree,
  getIndividualTreeMemberships,
  removeIndividualFromTree,
} from "@/features/individuals/treeMembershipService";
import type { FamilyTreeSummary, Individual } from "@/types";

export interface ManageTreeMembershipDialogProps {
  individual: Individual;
  /** Called after any membership change, so the caller can refresh its own tree graph. */
  onChanged: () => void;
  onClose: () => void;
}

/**
 * Lets an admin/editor add the selected person to another family tree, or remove them
 * from one they already belong to — always starting from an already-selected person,
 * never a cross-tree search (research.md §3).
 */
export function ManageTreeMembershipDialog({ individual, onChanged, onClose }: ManageTreeMembershipDialogProps) {
  const queryClient = useQueryClient();
  const membershipsKey = ["individual-tree-memberships", individual.id];

  const treesQuery = useQuery({ queryKey: ["family-trees", "all"], queryFn: getFamilyTrees });
  const membershipsQuery = useQuery({
    queryKey: membershipsKey,
    queryFn: () => getIndividualTreeMemberships(individual.id),
  });

  const [error, setError] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<FamilyTreeSummary | null>(null);
  const [confirmCascade, setConfirmCascade] = useState(false);

  function refreshMemberships() {
    queryClient.invalidateQueries({ queryKey: membershipsKey });
    onChanged();
  }

  const addMutation = useMutation({
    mutationFn: (tree: FamilyTreeSummary) => addIndividualToTree(individual.id, tree.id),
    onSuccess: () => {
      setError(null);
      refreshMemberships();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Không thể thêm vào cây gia phả."),
  });

  const removeMutation = useMutation({
    mutationFn: ({ tree, cascadeRelationships }: { tree: FamilyTreeSummary; cascadeRelationships: boolean }) =>
      removeIndividualFromTree(individual.id, tree.id, { cascadeRelationships }),
    onSuccess: () => {
      setError(null);
      setPendingRemoval(null);
      setConfirmCascade(false);
      refreshMemberships();
    },
    onError: (err, variables) => {
      if (err instanceof Error && err.message.includes("mối quan hệ")) {
        // Blocked because relationships still exist in that tree — ask to confirm
        // cascading their deletion too, same pattern as DeleteIndividualDialog.
        setPendingRemoval(variables.tree);
      } else {
        setError(err instanceof Error ? err.message : "Không thể xoá khỏi cây gia phả.");
      }
    },
  });

  if (treesQuery.isLoading || membershipsQuery.isLoading || !treesQuery.data || !membershipsQuery.data) {
    return <p className="text-sm text-[var(--color-ink-muted)]">Đang tải...</p>;
  }

  const memberships = membershipsQuery.data;
  const memberTreeIds = new Set(memberships.map((tree) => tree.id));
  const addableTrees = treesQuery.data.filter((tree) => !memberTreeIds.has(tree.id));
  const canRemoveAny = memberships.length > 1;
  const busy = addMutation.isPending || removeMutation.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-1 text-sm font-semibold text-[var(--color-ink)]">Đang thuộc cây gia phả</h3>
        {memberships.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Không có.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {memberships.map((tree) => (
              <li key={tree.id}>
                {pendingRemoval?.id === tree.id ? (
                  <div className="flex flex-col gap-2 rounded-lg border border-[var(--color-danger)] p-2">
                    <p className="text-xs text-[var(--color-ink)]">
                      "{tree.name}" vẫn còn mối quan hệ của cá thể này. Xoá khỏi cây sẽ đồng thời xoá các mối quan hệ
                      đó (chỉ trong cây này).
                    </p>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={confirmCascade}
                        onChange={(event) => setConfirmCascade(event.target.checked)}
                      />
                      Tôi hiểu và muốn xoá cả các mối quan hệ liên quan trong cây này.
                    </label>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPendingRemoval(null);
                          setConfirmCascade(false);
                        }}
                        className="text-xs text-[var(--color-ink-muted)]"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={busy || !confirmCascade}
                        onClick={() => removeMutation.mutate({ tree, cascadeRelationships: true })}
                        className="rounded-lg bg-[var(--color-danger)] px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                      >
                        Xoá cả mối quan hệ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span>{tree.name}</span>
                    <button
                      type="button"
                      disabled={busy || !canRemoveAny}
                      title={canRemoveAny ? undefined : "Đây là cây gia phả duy nhất của cá thể này."}
                      onClick={() => removeMutation.mutate({ tree, cascadeRelationships: false })}
                      className="text-xs text-[var(--color-danger)] hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
                    >
                      Xoá khỏi cây này
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-[var(--color-ink)]">Thêm vào cây gia phả khác</h3>
        {addableTrees.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Cá thể này đã thuộc tất cả cây gia phả hiện có.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {addableTrees.map((tree) => (
              <li key={tree.id} className="flex items-center justify-between gap-2">
                <span>{tree.name}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => addMutation.mutate(tree)}
                  className="text-xs text-[var(--color-brand-600)] hover:underline disabled:opacity-60"
                >
                  Thêm vào cây này
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <div className="flex justify-end">
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-[var(--color-ink-muted)]">
          Đóng
        </button>
      </div>
    </div>
  );
}
