import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { DataAccessError } from "@/types";

async function captureViewport(viewportEl: HTMLElement): Promise<string> {
  try {
    return await toPng(viewportEl, { backgroundColor: "#fffaf0", pixelRatio: 2 });
  } catch {
    throw new DataAccessError("UNKNOWN", "Không thể xuất hình ảnh cây gia phả.");
  }
}

export async function exportCurrentViewAsPng(viewportEl: HTMLElement): Promise<Blob> {
  const dataUrl = await captureViewport(viewportEl);
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function exportCurrentViewAsPdf(viewportEl: HTMLElement): Promise<Blob> {
  const dataUrl = await captureViewport(viewportEl);
  const { width, height } = viewportEl.getBoundingClientRect();

  const pdf = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "px",
    format: [width, height],
  });
  pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
  return pdf.output("blob");
}
