import { useState, type RefObject } from "react";
import { exportCurrentViewAsPdf, exportCurrentViewAsPng } from "@/features/export/exportService";
import { SidebarItem } from "@/app/Sidebar";

export interface ExportButtonProps {
  viewportRef: RefObject<HTMLDivElement | null>;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportButton({ viewportRef }: ExportButtonProps) {
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(format: "png" | "pdf") {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;

    setBusy(format);
    setError(null);
    try {
      const blob =
        format === "png"
          ? await exportCurrentViewAsPng(viewportEl)
          : await exportCurrentViewAsPdf(viewportEl);
      downloadBlob(blob, `gia-pha.${format}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xuất cây gia phả không thành công.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <SidebarItem icon="🖼️" onClick={() => handleExport("png")} disabled={busy !== null}>
        {busy === "png" ? "Đang xuất..." : "Xuất ảnh (PNG)"}
      </SidebarItem>
      <SidebarItem icon="🖨️" onClick={() => handleExport("pdf")} disabled={busy !== null}>
        {busy === "pdf" ? "Đang xuất..." : "In / Xuất PDF"}
      </SidebarItem>
      {error && <span className="px-3 text-sm text-[var(--color-danger)]">{error}</span>}
    </div>
  );
}
