import type { WorkspaceDTO } from "../../types";

/** Stub — PDF export is planned for post-fork */
export class PdfExportService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async exportWorkspace(_workspace: WorkspaceDTO): Promise<void> {
    console.warn("PDF export will be added in the future future");
  }
}
