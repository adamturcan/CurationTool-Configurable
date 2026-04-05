import type { WorkspaceRepository } from '../../core/interfaces/WorkspaceRepository';
import type { Workspace } from '../../core/entities/Workspace';
import type { Segment } from '../../types';

/**
 * Routes storage operations to the active adapter (local or remote).
 * Implements WorkspaceRepository so it is transparent to all consumers.
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
