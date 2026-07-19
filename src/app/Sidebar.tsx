import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

export interface SidebarProps {
  title: string;
  children: ReactNode;
}

/** Collapsible left menu panel: expanded shows the full title + nav content, collapsed
 * shrinks to a slim icon rail so the tree canvas can use the freed-up width. */
export function Sidebar({ title, children }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex h-dvh flex-shrink-0 flex-col overflow-hidden border-r border-[var(--color-brand-100)] bg-[var(--color-surface-raised)] transition-[width] duration-200 ${
        collapsed ? "w-14" : "w-72"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-brand-100)] px-3 py-3">
        {!collapsed && (
          <h1 className="min-w-0 truncate text-base font-semibold text-[var(--color-brand-700)]">{title}</h1>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)]"
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      {!collapsed && (
        <nav className="flex flex-1 flex-col divide-y divide-[var(--color-brand-100)] overflow-y-auto p-3">
          {children}
        </nav>
      )}
    </aside>
  );
}

export function SidebarSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
      {title && (
        <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wider text-[var(--color-brand-700)]">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

/** Shared row styling so every sidebar entry — links, buttons, toggles — reads as one
 * consistent list, instead of a mix of pill/outline/plain button styles. */
export const sidebarItemClass =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-brand-50)] disabled:cursor-default disabled:opacity-60";

function SidebarItemIcon({ icon }: { icon: ReactNode }) {
  return (
    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-base" aria-hidden="true">
      {icon}
    </span>
  );
}

export interface SidebarItemProps {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  to?: string;
  disabled?: boolean;
  title?: string;
}

export function SidebarItem({ children, icon, onClick, to, disabled, title }: SidebarItemProps) {
  const content = (
    <>
      {icon && <SidebarItemIcon icon={icon} />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} title={title} className={sidebarItemClass}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={sidebarItemClass}>
      {content}
    </button>
  );
}

export function SidebarToggle({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`${sidebarItemClass} cursor-pointer justify-between`}>
      <span className="flex min-w-0 items-center gap-2">
        {icon && <SidebarItemIcon icon={icon} />}
        <span className="truncate">{label}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 flex-shrink-0 accent-[var(--color-brand-600)]"
      />
    </label>
  );
}
