import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getDefaultFamilyTree } from "@/features/trees/treeService";
import { TreeWorkspace } from "@/features/tree/TreeWorkspace";
import { useAuth } from "@/features/auth/AuthContext";

export default function Home() {
  const { session, loading: authLoading } = useAuth();
  const isGuest = !session;

  const defaultTreeQuery = useQuery({
    queryKey: ["family-trees", "default", session?.user.id ?? "guest"],
    queryFn: getDefaultFamilyTree,
    enabled: !authLoading,
  });

  if (authLoading || defaultTreeQuery.isLoading) {
    return <p className="p-6 text-[var(--color-ink-muted)]">Đang tải cây gia phả...</p>;
  }

  if (!defaultTreeQuery.data) {
    return isGuest ? (
      <div className="p-6 text-[var(--color-ink-muted)]">
        <p className="mb-2">Cây gia phả này chưa được công khai.</p>
        <Link to="/dang-nhap" className="font-medium text-[var(--color-brand-600)] hover:underline">
          Đăng nhập để xem
        </Link>
      </div>
    ) : (
      <p className="p-6 text-[var(--color-ink-muted)]">Chưa có cây gia phả nào được đặt làm mặc định.</p>
    );
  }

  return (
    <TreeWorkspace
      treeId={defaultTreeQuery.data.id}
      treeName={defaultTreeQuery.data.name}
      upcomingEventsPath="/su-kien-sap-toi"
    />
  );
}
