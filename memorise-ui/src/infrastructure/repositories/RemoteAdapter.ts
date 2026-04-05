import type { WorkspaceRepository } from '../../core/interfaces/WorkspaceRepository';
import type { Workspace } from '../../core/entities/Workspace';
import type { Segment } from '../../types';

/**
 * Placeholder for future server-backed storage. Every method throws until
 * a real backend is wired in.
 *
 * @category Infrastructure
 */
export class RemoteAdapter implements WorkspaceRepository {
  private readonly notImplementedMsg: string;

  constructor(backendUrl: string) {
    this.notImplementedMsg =
      `RemoteAdapter for ${backendUrl} is not yet implemented. ` +
      'Set VITE_BACKEND_URL to empty to use local storage.';
  }

  async findById(): Promise<Workspace | null> {
    throw new Error(this.notImplementedMsg);
  }

  async findByOwner(): Promise<Workspace[]> {
    throw new Error(this.notImplementedMsg);
  }

  async save(): Promise<void> {
    throw new Error(this.notImplementedMsg);
  }

  async delete(): Promise<void> {
    throw new Error(this.notImplementedMsg);
  }

  async getRawPersistenceForOwner(): Promise<Array<{ id: string; segments?: Segment[] }>> {
    throw new Error(this.notImplementedMsg);
  }

  async updateSegments(): Promise<void> {
    throw new Error(this.notImplementedMsg);
  }
}
