import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getDefaultFamilyTree, getFamilyTreeBySlug } from "@/features/trees/treeService";
import { getTreeGraph } from "@/features/tree/treeGraphService";
import { CalendarGrid } from "@/features/events/CalendarGrid";
import { DayEventsPanel } from "@/features/events/DayEventsPanel";
import { useMonthEvents } from "@/features/events/useMonthEvents";
import { toLunarDate } from "@/lib/lunarCalendar";
import { formatLunarDate } from "@/features/individuals/LunarDateBadge";
import { Modal } from "@/app/Modal";
import { useAuth } from "@/features/auth/AuthContext";

const today = new Date();

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** "01/01/2025 (10/12/2024 AL)" — the selected day's Gregorian date inline with its
 * lunar equivalent (or nothing extra when the lunar side is out of the supported
 * range), matching the format used everywhere else a lunar date is shown. */
function dayHeading(day: number, month: number, year: number): string {
  const gregorian = `${pad2(day)}/${pad2(month)}/${year}`;
  const lunar = toLunarDate({ day, month, year });
  return lunar ? `${gregorian} (${formatLunarDate(lunar)})` : gregorian;
}

/** Sự kiện sắp tới: month calendar (Gregorian + lunar per day, events highlighted) for
 * whichever tree this page was opened from — the default tree at "/su-kien-sap-toi",
 * or a specific tree at "/<slug>/su-kien-sap-toi" (spec FR-001, Clarifications: "the
 * tree currently being viewed") — visible to guests exactly when that tree is public
 * (spec FR-021). */
export default function UpcomingEvents() {
  const { slug } = useParams<{ slug?: string }>();
  const { session, loading: authLoading } = useAuth();
  const isGuest = !session;

  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const treeQuery = useQuery({
    queryKey: slug
      ? ["family-trees", "by-slug", slug, session?.user.id ?? "guest"]
      : ["family-trees", "default", session?.user.id ?? "guest"],
    queryFn: () => (slug ? getFamilyTreeBySlug(slug) : getDefaultFamilyTree()),
    enabled: !authLoading,
  });

  const treeId = treeQuery.data?.id;

  const treeGraphQuery = useQuery({
    queryKey: ["tree-graph", treeId],
    queryFn: () => getTreeGraph(treeId!),
    enabled: Boolean(treeId),
  });

  const individuals = treeGraphQuery.data?.individuals ?? [];
  const eventsByDay = useMonthEvents(individuals, month);

  const backTo = slug ? `/${slug}` : "/";

  function navigateMonth(direction: -1 | 1) {
    setSelectedDay(null);
    let nextMonth = month + direction;
    let nextYear = year;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    setMonth(nextMonth);
    setYear(nextYear);
  }

  return (
    <div className="min-h-dvh">
      <div className="mx-auto w-full max-w-6xl p-6 lg:w-4/5">
        <Link to={backTo} className="text-sm font-medium text-[var(--color-brand-600)] hover:underline">
          ← Về trang chủ
        </Link>

        <h1 className="mt-2 text-2xl font-semibold text-[var(--color-brand-700)]">Sự kiện sắp tới</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Xem ngày sinh và ngày giỗ theo cả lịch dương và lịch âm.
        </p>

        <div className="mt-6">
          {authLoading || treeQuery.isLoading || treeGraphQuery.isLoading ? (
            <p className="text-[var(--color-ink-muted)]">Đang tải...</p>
          ) : !treeQuery.data ? (
            isGuest ? (
              <div className="text-[var(--color-ink-muted)]">
                <p className="mb-2">Cây gia phả này chưa được công khai.</p>
                <Link to="/dang-nhap" className="font-medium text-[var(--color-brand-600)] hover:underline">
                  Đăng nhập để xem
                </Link>
              </div>
            ) : slug ? (
              <p className="text-[var(--color-ink-muted)]">Không tìm thấy cây gia phả này.</p>
            ) : (
              <p className="text-[var(--color-ink-muted)]">Chưa có cây gia phả nào được đặt làm mặc định.</p>
            )
          ) : (
            <div className="rounded-2xl border border-[var(--color-brand-100)] bg-[var(--color-surface-raised)] p-4">
              <CalendarGrid
                month={month}
                year={year}
                eventsByDay={eventsByDay}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                onNavigateMonth={navigateMonth}
              />
            </div>
          )}
        </div>
      </div>

      {selectedDay !== null && (
        <Modal title={dayHeading(selectedDay, month, year)} onClose={() => setSelectedDay(null)}>
          <DayEventsPanel day={selectedDay} eventsByDay={eventsByDay} />
        </Modal>
      )}
    </div>
  );
}
