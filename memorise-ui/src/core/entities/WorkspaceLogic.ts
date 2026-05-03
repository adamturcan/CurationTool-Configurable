import type { WorkspaceMetadata } from "./Workspace";

/**
 * Pure functions for workspace-list rules that aren't tied to a single Workspace
 * instance (e.g. uniqueness across the user's workspaces).
 *
 * @category Entities
 */
export const WorkspaceLogic = {

  /**
   * True when another workspace already uses `candidate` as its name (case-insensitive, after trimming).
   * The workspace identified by `id` is excluded from the comparison so that a no-op rename of an existing workspace is not flagged as a duplicate.
   * Empty/whitespace-only candidates return false — those are rejected separately.
   */
  isRenameDuplicate(
    workspaces: WorkspaceMetadata[],
    id: string,
    candidate: string
  ): boolean {
    const lower = candidate.trim().toLowerCase();
    if (!lower) return false;
    return workspaces.some(
      (other) => other.id !== id && other.name.trim().toLowerCase() === lower
    );
  },
};
