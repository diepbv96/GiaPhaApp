import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getFamilyTreeBySlug } from "@/features/trees/treeService";
import { TreeWorkspace } from "@/features/tree/TreeWorkspace";
import { useAuth } from "@/features/auth/AuthContext";

/**
 * A specific, non-default family tree reached by its slug URL (spec FR-017/FR-018),
 * with the exact same sidebar navigation and — for Admin/Editor — the same
 * add/edit/delete/import management capability as the default tree on the home
 * screen (spec FR-002; the underlying RLS already permits this, see data-model.md).
 * An authenticated user sees any tree they can already see today; an unauthenticated
 * guest sees it (read-only) only when it's public. Denies access with a clear message
 * otherwise, rather than exposing content (spec Edge Cases).
 */
export default function TreeBySlug() {
  const { slug } = useParams<{ slug: string }>();
  const { session, loading: authLoading } = useAuth();
  const isGuest = !session;

  const treeQuery = useQuery({
    queryKey: ["family-trees", "by-slug", slug, session?.user.id ?? "guest"],
    queryFn: () => getFamilyTreeBySlug(slug!),
    enabled: !authLoading && Boolean(slug),
  });

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
    <TreeWorkspace
      treeId={treeQuery.data.id}
      treeName={treeQuery.data.name}
      upcomingEventsPath={`/${slug}/su-kien-sap-toi`}
    />
  );
}
