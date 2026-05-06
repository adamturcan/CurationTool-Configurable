import { Workspace } from '../entities/Workspace';
import type { Segment } from '../../types';

/**
 * Storage contract for workspace persistence.
 *
 * Implemented by LocalStorageWorkspaceRepository (browser localStorage), RemoteAdapter (REST against the optional server), and StorageGateway (a router that delegates to whichever of the above is active).
 *
 * StorageGateway implements this interface as a routing wrapper rather than a real backend, dispatching to either LocalStorageWorkspaceRepository or RemoteAdapter based on the deployment mode.
 *
 * Consumers depend only on this interface. The concrete pick is decided in `workspaceProvider` based on `VITE_BACKEND_URL`.
 *
 * `getRawPersistenceForOwner` and `updateSegments` are optional. LocalStorageWorkspaceRepository implements them; RemoteAdapter does not. Callers must guard with `?.` and tolerate absence.
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

