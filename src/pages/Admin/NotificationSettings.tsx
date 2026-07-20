import { Link } from "react-router-dom";
import { NotificationSettingsPanel } from "@/features/notifications/NotificationSettingsPanel";

export default function NotificationSettings() {
  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-2xl p-6">
        <Link to="/" className="text-sm font-medium text-[var(--color-brand-600)] hover:underline">
          ← Về trang chủ
        </Link>

        <div className="mt-2">
          <h1 className="text-2xl font-semibold text-[var(--color-brand-700)]">Cấu hình thông báo sự kiện</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Thiết lập email nhắc nhở tự động cho sinh nhật và ngày giỗ sắp tới.
          </p>
        </div>

        <div className="mt-6">
          <NotificationSettingsPanel />
        </div>
      </div>
    </div>
  );
}
