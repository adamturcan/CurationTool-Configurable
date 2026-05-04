import type { WorkspaceRepository } from '../../core/interfaces/WorkspaceRepository';
import type { Workspace } from '../../core/entities/Workspace';
import type { Segment } from '../../types';

/**
 * Routes WorkspaceRepository operations to whichever adapter (LocalStorageWorkspaceRepository or RemoteAdapter) is active for this build.
 * Implements WorkspaceRepository itself so consumers can depend on the gateway and never branch on local-vs-remote at the call site.
 * Adapter selection happens once in `workspaceProvider` based on `VITE_BACKEND_URL`; this class only forwards calls.
 * The non-obvious detail is that the optional methods (`getRawPersistenceForOwner`, `updateSegments`) are forwarded with optional chaining, so a remote adapter that omits them simply yields `undefined` / no-op without throwing.
 *
 * @category Infrastructure
 */
export class StorageGateway implements WorkspaceRepository {
  private readonly adapter: WorkspaceRepository;

  constructor(adapter: WorkspaceRepository) {
    this.adapter = adapter;
  }

  findById(id: string): Promise<Workspace | null> {
    return this.adapter.findById(id);
  }

  findByOwner(ownerId: string): Promise<Workspace[]> {
    return this.adapter.findByOwner(ownerId);
  }

  save(workspace: Workspace): Promise<void> {
    return this.adapter.save(workspace);
  }

  delete(id: string): Promise<void> {
    return this.adapter.delete(id);
  }

  async getRawPersistenceForOwner(ownerId: string): Promise<Array<{ id: string; segments?: Segment[] }>> {
    return this.adapter.getRawPersistenceForOwner?.(ownerId) ?? [];
  }

  async updateSegments(workspaceId: string, segments: Segment[] | undefined): Promise<void> {
    return this.adapter.updateSegments?.(workspaceId, segments);
  }
}
