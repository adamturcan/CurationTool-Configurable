import { Workspace } from '../entities/Workspace';
import type { Segment } from '../../types';

/**
 * Storage contract for workspace persistence. Implemented by
 * LocalStorageAdapter (localStorage) and RemoteAdapter (server API).
 * StorageGateway delegates to the active adapter based on configuration.
 *
 * @category Interfaces
 */
export interface WorkspaceRepository {
  findById(id: string): Promise<Workspace | null>;
  findByOwner(ownerId: string): Promise<Workspace[]>;
  save(workspace: Workspace): Promise<void>;
  delete(id: string): Promise<void>;

  /** Returns raw persistence data including segments (metadata not on the domain entity) */
  getRawPersistenceForOwner?(ownerId: string): Promise<Array<{ id: string; segments?: Segment[] }>>;
  /** Updates segments directly in storage, bypassing entity layer */
  updateSegments?(workspaceId: string, segments: Segment[] | undefined): Promise<void>;
}

