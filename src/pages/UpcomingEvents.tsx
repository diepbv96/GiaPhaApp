import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getDefaultFamilyTree } from "@/features/trees/treeService";
import { getTreeGraph } from "@/features/tree/treeGraphService";
import { CalendarGrid } from "@/features/events/CalendarGrid";
import { DayEventsPanel } from "@/features/events/DayEventsPanel";
import { useMonthEvents } from "@/features/events/useMonthEvents";
import { useAuth } from "@/features/auth/AuthContext";

const today = new Date();

/** Sự kiện sắp tới: month calendar (Gregorian + lunar per day, events highlighted) for
 * whichever tree Home currently shows (spec Clarifications: "the tree currently being
 * viewed") — visible to guests exactly when that tree is public (spec FR-021). */
export default function UpcomingEvents() {
  const { session, loading: authLoading } = useAuth();
  const isGuest = !session;

  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const defaultTreeQuery = useQuery({
    queryKey: ["family-trees", "default", session?.user.id ?? "guest"],
    queryFn: getDefaultFamilyTree,
    enabled: !authLoading,
  });

  const treeId = defaultTreeQuery.data?.id;

  const treeGraphQuery = useQuery({
    queryKey: ["tree-graph", treeId],
    queryFn: () => getTreeGraph(treeId!),
    enabled: Boolean(treeId),
  });

  const individuals = treeGraphQuery.data?.individuals ?? [];
  const eventsByDay = useMonthEvents(individuals, month);

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
      <div className="mx-auto max-w-3xl p-6">
        <Link to="/" className="text-sm font-medium text-[var(--color-brand-600)] hover:underline">
          ← Về trang chủ
        </Link>

        <h1 className="mt-2 text-2xl font-semibold text-[var(--color-brand-700)]">Sự kiện sắp tới</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Xem ngày sinh và ngày giỗ theo cả lịch dương và lịch âm.
        </p>

        <div className="mt-6">
          {authLoading || defaultTreeQuery.isLoading || treeGraphQuery.isLoading ? (
            <p className="text-[var(--color-ink-muted)]">Đang tải...</p>
          ) : !defaultTreeQuery.data ? (
            isGuest ? (
              <div className="text-[var(--color-ink-muted)]">
                <p className="mb-2">Cây gia phả này chưa được công khai.</p>
                <Link to="/dang-nhap" className="font-medium text-[var(--color-brand-600)] hover:underline">
                  Đăng nhập để xem
                </Link>
              </div>
            ) : (
              <p className="text-[var(--color-ink-muted)]">Chưa có cây gia phả nào được đặt làm mặc định.</p>
            )
          ) : (
            <div className="flex flex-col gap-6 sm:flex-row">
              <div className="flex-1 rounded-2xl border border-[var(--color-brand-100)] bg-[var(--color-surface-raised)] p-4">
                <CalendarGrid
                  month={month}
                  year={year}
                  eventsByDay={eventsByDay}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  onNavigateMonth={navigateMonth}
                />
              </div>
              <div className="flex-1 rounded-2xl border border-[var(--color-brand-100)] bg-[var(--color-surface-raised)] p-4">
                <DayEventsPanel day={selectedDay} month={month} year={year} eventsByDay={eventsByDay} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
