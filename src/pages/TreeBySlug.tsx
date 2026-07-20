import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getFamilyTreeBySlug } from "@/features/trees/treeService";
import { getTreeGraph } from "@/features/tree/treeGraphService";
import { TreeCanvas } from "@/features/tree/TreeCanvas";
import { IndividualDetailPanel } from "@/features/individuals/IndividualDetailPanel";
import { useAuth } from "@/features/auth/AuthContext";

/**
 * Read-only view of one specific, non-default family tree reached by its slug URL
 * (spec FR-017/FR-018) — an authenticated user sees any tree they can already see
 * today; an unauthenticated guest sees it only when it's public. Denies access with a
 * clear message otherwise, rather than exposing content (spec Edge Cases).
 */
export default function TreeBySlug() {
  const { slug } = useParams<{ slug: string }>();
  const { session, loading: authLoading } = useAuth();
  const isGuest = !session;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const treeQuery = useQuery({
    queryKey: ["family-trees", "by-slug", slug, session?.user.id ?? "guest"],
    queryFn: () => getFamilyTreeBySlug(slug!),
    enabled: !authLoading && Boolean(slug),
  });

  const treeId = treeQuery.data?.id;

  const treeGraphQuery = useQuery({
    queryKey: ["tree-graph", treeId],
    queryFn: () => getTreeGraph(treeId!),
    enabled: Boolean(treeId),
  });

  const graph = treeGraphQuery.data;
  const selectedIndividual = graph?.individuals.find((i) => i.id === selectedId) ?? null;

  if (authLoading || treeQuery.isLoading) {
    return <p className="p-6 text-[var(--color-ink-muted)]">Đang tải cây gia phả...</p>;
  }

  if (!treeQuery.data) {
    return (
      <div className="p-6 text-[var(--color-ink-muted)]">
        <p className="mb-2">Không tìm thấy cây gia phả này, hoặc cây gia phả này chưa được công khai.</p>
        {isGuest ? (
          <Link to="/dang-nhap" className="font-medium text-[var(--color-brand-600)] hover:underline">
            Đăng nhập để xem
          </Link>
        ) : (
          <Link to="/" className="font-medium text-[var(--color-brand-600)] hover:underline">
            ← Về trang chủ
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-dvh">
      <main className="relative flex-1">
        <div className="absolute left-4 top-4 z-10 rounded-lg bg-[var(--color-surface-raised)] px-3 py-1.5 text-sm font-semibold text-[var(--color-brand-700)] shadow">
          {treeQuery.data.name}
        </div>

        {treeGraphQuery.isLoading || !graph ? (
          <p className="p-6 text-[var(--color-ink-muted)]">Đang tải cây gia phả...</p>
        ) : (
          <TreeCanvas ref={viewportRef} graph={graph} onSelectIndividual={setSelectedId} canDrag={false} />
        )}

        <IndividualDetailPanel
          individual={selectedIndividual}
          graph={graph ?? { individuals: [], relationships: [] }}
          onSelectIndividual={setSelectedId}
          onClose={() => setSelectedId(null)}
        />
      </main>
    </div>
  );
}
