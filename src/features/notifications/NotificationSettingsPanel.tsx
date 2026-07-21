import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearRecipientOverride,
  DEFAULT_EVENT_REMINDER_TEMPLATE,
  getConfig,
  getRecipientOverride,
  setRecipientOverride,
  updateConfig,
} from "@/features/notifications/notificationConfigService";
import { getFamilyTrees } from "@/features/trees/treeService";
import { useAuth } from "@/features/auth/AuthContext";
import { useToast } from "@/app/ToastProvider";
import type { EventNotificationConfig, FamilyTreeSummary } from "@/types";

const DEFAULT_DAYS_BEFORE = 7;

function parseRecipients(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  );
}

function ConfigForm({ config }: { config: EventNotificationConfig }) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Initialized once from the already-loaded `config` prop — this component is only
  // ever rendered by the parent after that data has resolved, so there's no
  // load-then-sync-via-effect step needed (see NotificationSettingsPanel below).
  const [enabled, setEnabled] = useState(config.enabled);
  const [template, setTemplate] = useState(
    config.template === "" ? DEFAULT_EVENT_REMINDER_TEMPLATE : config.template,
  );
  const [daysBefore, setDaysBefore] = useState(config.daysBefore);
  const [defaultRecipientsText, setDefaultRecipientsText] = useState(config.defaultRecipients.join("\n"));

  const saveMutation = useMutation({
    mutationFn: () =>
      updateConfig(
        { enabled, template, daysBefore, defaultRecipients: parseRecipients(defaultRecipientsText) },
        session!.user.id,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-notification-config"] });
      showToast("success", "Đã lưu cấu hình thông báo sự kiện.");
    },
    onError: (err) => showToast("error", err instanceof Error ? err.message : "Không thể lưu cấu hình."),
  });

  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        saveMutation.mutate();
      }}
      className="flex flex-col gap-4 rounded-2xl border border-[var(--color-brand-100)] bg-[var(--color-surface-raised)] p-4"
    >
      <h2 className="text-base font-semibold text-[var(--color-ink)]">Nhắc nhở sự kiện qua email</h2>

      <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink)]">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="h-4 w-4 accent-[var(--color-brand-600)]"
        />
        Bật gửi email nhắc nhở tự động
      </label>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="notif-days-before">
          Số ngày báo trước
        </label>
        <input
          id="notif-days-before"
          type="number"
          min={0}
          value={daysBefore}
          onChange={(event) => setDaysBefore(Number(event.target.value))}
          className="w-32 rounded-lg border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">Mặc định là {DEFAULT_DAYS_BEFORE} ngày.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="notif-template">
          Nội dung email mẫu
        </label>
        <textarea
          id="notif-template"
          value={template}
          onChange={(event) => setTemplate(event.target.value)}
          rows={5}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder="VD: {{ten_ca_nhan}} sẽ có {{loai_su_kien}} vào ngày {{ngay_duong}} ({{ngay_am}})."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="notif-default-recipients">
          Danh sách người nhận chung (mỗi email một dòng)
        </label>
        <textarea
          id="notif-default-recipients"
          value={defaultRecipientsText}
          onChange={(event) => setDefaultRecipientsText(event.target.value)}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder="ten@vidu.com"
        />
      </div>

      <button
        type="submit"
        disabled={saveMutation.isPending}
        className="self-start rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] disabled:opacity-60"
      >
        {saveMutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
      </button>
    </form>
  );
}

function RecipientOverrideEditor({ treeId, initialRecipients }: { treeId: string; initialRecipients: string[] }) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Safe init-from-prop: the parent only mounts this (keyed by `treeId`) once that
  // tree's override has finished loading, so switching trees remounts fresh instead
  // of needing an effect to re-sync state.
  const [text, setText] = useState(initialRecipients.join("\n"));

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["notification-recipients-override", treeId] });
  }

  const saveMutation = useMutation({
    mutationFn: () => setRecipientOverride(treeId, parseRecipients(text), session!.user.id),
    onSuccess: () => {
      invalidate();
      showToast("success", "Đã lưu danh sách người nhận riêng cho cây gia phả này.");
    },
    onError: (err) => showToast("error", err instanceof Error ? err.message : "Không thể lưu."),
  });

  const clearMutation = useMutation({
    mutationFn: () => clearRecipientOverride(treeId),
    onSuccess: () => {
      setText("");
      invalidate();
      showToast("success", "Đã xoá danh sách riêng — cây này sẽ dùng danh sách chung.");
    },
    onError: (err) => showToast("error", err instanceof Error ? err.message : "Không thể xoá."),
  });

  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="notif-override-recipients">
          Danh sách người nhận riêng (mỗi email một dòng)
        </label>
        <textarea
          id="notif-override-recipients"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder="ten@vidu.com"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] disabled:opacity-60"
        >
          {saveMutation.isPending ? "Đang lưu..." : "Lưu danh sách riêng"}
        </button>
        <button
          type="button"
          onClick={() => clearMutation.mutate()}
          disabled={clearMutation.isPending || initialRecipients.length === 0}
          className="rounded-lg border border-[var(--color-danger)] px-4 py-2 text-sm font-medium text-[var(--color-danger)] disabled:opacity-60"
        >
          Xoá danh sách riêng
        </button>
      </div>
    </>
  );
}

function RecipientOverrideSection({ trees }: { trees: FamilyTreeSummary[] }) {
  const [overrideTreeId, setOverrideTreeId] = useState("");

  const overrideQuery = useQuery({
    queryKey: ["notification-recipients-override", overrideTreeId],
    queryFn: () => getRecipientOverride(overrideTreeId),
    enabled: Boolean(overrideTreeId),
  });

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-brand-100)] bg-[var(--color-surface-raised)] p-4">
      <h2 className="text-base font-semibold text-[var(--color-ink)]">Người nhận riêng theo cây gia phả</h2>
      <p className="text-sm text-[var(--color-ink-muted)]">
        Không bắt buộc — để trống nghĩa là cây gia phả dùng danh sách người nhận chung ở trên.
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="notif-override-tree">
          Cây gia phả
        </label>
        <select
          id="notif-override-tree"
          value={overrideTreeId}
          onChange={(event) => setOverrideTreeId(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        >
          <option value="">— Chọn cây gia phả —</option>
          {trees.map((tree) => (
            <option key={tree.id} value={tree.id}>
              {tree.name}
            </option>
          ))}
        </select>
      </div>

      {overrideTreeId && overrideQuery.isLoading && <p className="text-sm text-[var(--color-ink-muted)]">Đang tải...</p>}

      {overrideTreeId && !overrideQuery.isLoading && (
        <RecipientOverrideEditor
          key={overrideTreeId}
          treeId={overrideTreeId}
          initialRecipients={overrideQuery.data?.recipients ?? []}
        />
      )}
    </div>
  );
}

/** Admin-only settings for the automatic event-reminder emails: a single,
 * application-wide enabled flag, template, and days-before lead time (default 7),
 * plus a default recipient list that any one family tree may override
 * (spec FR-009–FR-011b, Clarifications 2026-07-20). */
export function NotificationSettingsPanel() {
  const configQuery = useQuery({ queryKey: ["event-notification-config"], queryFn: getConfig });
  const treesQuery = useQuery({ queryKey: ["family-trees", "all"], queryFn: getFamilyTrees });

  if (configQuery.isLoading) {
    return <p className="text-[var(--color-ink-muted)]">Đang tải...</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {configQuery.data && <ConfigForm config={configQuery.data} />}
      <RecipientOverrideSection trees={treesQuery.data ?? []} />
    </div>
  );
}
