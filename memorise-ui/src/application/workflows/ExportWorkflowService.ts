import type { WorkspaceDTO, WorkflowResult, TagItem } from "../../types";
import { getWorkspaceApplicationService } from "../../infrastructure/providers/workspaceProvider";

export interface ExportOutput {
  blob: Blob;
  filename: string;
}

export type ExportResult = WorkflowResult & {
  output?: ExportOutput;
};

/**
 * Generates JSON and PDF exports of a workspace.
 * Fetches the full workspace, delegates to the appropriate generator,
 * and returns a blob + filename for the presentation layer to download.
 *
 * @category Application
 */
export class ExportWorkflowService {

  async exportWorkspace(workspaceId: string, format: "json" | "pdf"): Promise<ExportResult> {
    try {
      const service = getWorkspaceApplicationService();
      const workspace = await service.getWorkspaceById(workspaceId);

      if (!workspace) {
        return { ok: false, notice: { message: "Workspace not found.", tone: "error" } };
      }

      const output = format === "json"
        ? this.generateJson(workspace)
        : await this.generatePdf(workspace);

      return {
        ok: true,
        notice: { message: `Exported "${workspace.name}" as ${format.toUpperCase()}.`, tone: "success" },
        output,
      };
    } catch (error) {
      console.error("Export failed:", error);
      return { ok: false, notice: { message: "Export failed.", tone: "error" } };
    }
  }

  private sanitizeName(name: string): string {
    return name.replace(/[^a-z0-9]/gi, "_");
  }

  private formatTimestamp(ts: number | undefined): string | undefined {
    if (typeof ts !== "number" || !Number.isFinite(ts)) return undefined;
    return new Date(ts).toISOString();
  }

  private generateJson(workspace: WorkspaceDTO): ExportOutput {
    const exportedAt = Date.now();
    const exportData = {
      id: workspace.id,
      name: workspace.name,
      owner: workspace.owner,
      text: workspace.text,
      isTemporary: workspace.isTemporary,
      createdAt: workspace.createdAt,
      createdAtFormatted: this.formatTimestamp(workspace.createdAt),
      updatedAt: workspace.updatedAt,
      updatedAtFormatted: this.formatTimestamp(workspace.updatedAt),
      userSpans: workspace.userSpans,
      apiSpans: workspace.apiSpans,
      deletedApiKeys: workspace.deletedApiKeys,
      tags: workspace.tags,
      translations: workspace.translations,
      segments: workspace.segments,
      counters: workspace.counters,
      exportedAt,
      exportedAtFormatted: this.formatTimestamp(exportedAt),
      exportVersion: "1.1",
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const filename = `${this.sanitizeName(workspace.name)}_${workspace.id}.json`;
    return { blob, filename };
  }

  private async loadFont(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const chunkSize = 8192;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return btoa(binary);
  }

  private async generatePdf(workspace: WorkspaceDTO): Promise<ExportOutput> {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    // Load Unicode fonts for Czech/Slovak support
    const basePath = import.meta.env.BASE_URL ?? "/";
    const [regularBase64, boldBase64] = await Promise.all([
      this.loadFont(`${basePath}fonts/NotoSans-Regular.ttf`),
      this.loadFont(`${basePath}fonts/NotoSans-Bold.ttf`),
    ]);

    doc.addFileToVFS("NotoSans-Regular.ttf", regularBase64);
    doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    doc.addFileToVFS("NotoSans-Bold.ttf", boldBase64);
    doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
    doc.setFont("NotoSans");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const addSection = (title: string) => {
      ensureSpace(16);
      doc.setFontSize(13);
      doc.setFont("NotoSans", "bold");
      doc.text(title, margin, y);
      y += 8;
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(10);
    };

    const addWrappedText = (text: string) => {
      const lines: string[] = doc.splitTextToSize(text, maxWidth);
      for (const line of lines) {
        ensureSpace(6);
        doc.text(line, margin, y);
        y += 5;
      }
    };

    // Title
    doc.setFontSize(18);
    doc.setFont("NotoSans", "bold");
    doc.text(workspace.name, margin, y);
    y += 10;

    // Metadata
    doc.setFontSize(9);
    doc.setFont("NotoSans", "normal");
    doc.setTextColor(100);
    doc.text(`ID: ${workspace.id}`, margin, y); y += 5;
    if (workspace.owner) { doc.text(`Owner: ${workspace.owner}`, margin, y); y += 5; }
    if (workspace.createdAt) { doc.text(`Created: ${new Date(workspace.createdAt).toLocaleString()}`, margin, y); y += 5; }
    if (workspace.updatedAt) { doc.text(`Updated: ${new Date(workspace.updatedAt).toLocaleString()}`, margin, y); y += 5; }
    doc.text(`Exported: ${new Date().toLocaleString()}`, margin, y); y += 5;
    doc.setTextColor(0);
    y += 6;

    const sourceText = workspace.text ?? "";
    const segments = workspace.segments ?? [];
    const docTags = workspace.tags?.filter(t => !t.segmentId) ?? [];
    const segmentTagsById = new Map<string, TagItem[]>();
    for (const tag of workspace.tags ?? []) {
      if (!tag.segmentId) continue;
      const list = segmentTagsById.get(tag.segmentId) ?? [];
      list.push(tag);
      segmentTagsById.set(tag.segmentId, list);
    }

    const allSpans = [...(workspace.userSpans ?? []), ...(workspace.apiSpans ?? [])];
    const spansForSegment = (start: number, end: number) =>
      allSpans
        .filter(s => s.start >= start && s.end <= end)
        .sort((a, b) => a.start - b.start);

    // Source text — always the original text, never a translation
    if (sourceText) {
      addSection("Source Text (Original)");
      addWrappedText(sourceText);
      y += 6;
    }

    // Segments with per-segment tags & NER
    if (segments.length) {
      addSection(`Segments (${segments.length})`);
      const ordered = [...segments].sort((a, b) => a.order - b.order);
      ordered.forEach((seg, idx) => {
        ensureSpace(14);
        doc.setFont("NotoSans", "bold");
        doc.text(`Segment ${idx + 1}  [${seg.start}–${seg.end}]`, margin, y);
        doc.setFont("NotoSans", "normal");
        y += 5;

        const segText = sourceText ? sourceText.substring(seg.start, seg.end) : (seg.text ?? "");
        if (segText) addWrappedText(segText);

        const segTags = segmentTagsById.get(seg.id) ?? [];
        if (segTags.length) {
          ensureSpace(6);
          doc.setTextColor(80);
          addWrappedText(`Semantic tags: ${segTags.map(t => t.name).join(", ")}`);
          doc.setTextColor(0);
        }

        const segSpans = spansForSegment(seg.start, seg.end);
        if (segSpans.length) {
          ensureSpace(6);
          doc.setTextColor(80);
          const spanList = segSpans
            .map(s => `${sourceText.substring(s.start, s.end)} (${s.entity}${s.origin === "api" ? "" : ", user"})`)
            .join("; ");
          addWrappedText(`Entities: ${spanList}`);
          doc.setTextColor(0);
        }
        y += 3;
      });
      y += 4;
    }

    // Spans summary
    const userCount = workspace.userSpans?.length ?? 0;
    const apiCount = workspace.apiSpans?.length ?? 0;
    if (userCount > 0 || apiCount > 0) {
      addSection("Annotation Totals");
      doc.text(`User spans: ${userCount}  |  API spans: ${apiCount}`, margin, y);
      y += 8;
    }

    // Document-level tags
    if (docTags.length) {
      addSection(`Document Tags (${docTags.length})`);
      addWrappedText(docTags.map(t => t.name).join(", "));
      y += 6;
    }

    // Action counters
    if (workspace.counters) {
      const c = workspace.counters;
      addSection("Action Counters");
      addWrappedText(`NER edits: ${c.nerEdits} (created ${c.nerBreakdown.created}, deleted user ${c.nerBreakdown.deletedUser}, deleted API ${c.nerBreakdown.deletedApi}, category changed ${c.nerBreakdown.categoryChanged}, text edited ${c.nerBreakdown.textEdited})`);
      addWrappedText(`Segment edits: ${c.segmentEdits} (split ${c.segmentBreakdown.split}, join ${c.segmentBreakdown.join}, shift ${c.segmentBreakdown.shift})`);
      addWrappedText(`Tag adds: ${c.tagAdds}  |  Tag removals: ${c.tagRemovals}`);
      y += 6;
    }

    // Translations — skip language layers with no remaining content
    const liveTranslations = (workspace.translations ?? []).filter(t => {
      const segCount = Object.values(t.segmentTranslations ?? {}).filter(s => s && s.length > 0).length;
      return segCount > 0 || (t.text && t.text.length > 0);
    });
    if (liveTranslations.length) {
      addSection(`Translations (${liveTranslations.length})`);
      const segOrder = [...segments].sort((a, b) => a.order - b.order);
      for (const t of liveTranslations) {
        ensureSpace(14);
        doc.setFont("NotoSans", "bold");
        const editedCount = Object.values(t.editedSegmentTranslations ?? {}).filter(Boolean).length;
        const editedSuffix = editedCount > 0 ? `  · ${editedCount} edited` : "";
        doc.text(`${t.language} (from ${t.sourceLang})${editedSuffix}`, margin, y);
        doc.setFont("NotoSans", "normal");
        y += 5;

        if (segOrder.length && t.segmentTranslations) {
          segOrder.forEach((seg, idx) => {
            const segText = t.segmentTranslations?.[seg.id];
            if (!segText) return;
            const isEdited = Boolean(t.editedSegmentTranslations?.[seg.id]);
            ensureSpace(8);
            doc.setTextColor(80);
            doc.text(`Segment ${idx + 1}${isEdited ? " (edited)" : ""}`, margin, y);
            doc.setTextColor(0);
            y += 4;
            addWrappedText(segText);
            y += 2;
          });
        } else if (t.text) {
          addWrappedText(t.text);
        }
        y += 4;
      }
    }

    const blob = doc.output("blob");
    const filename = `${this.sanitizeName(workspace.name)}_${workspace.id}.pdf`;
    return { blob, filename };
  }
}

export const exportWorkflowService = new ExportWorkflowService();
