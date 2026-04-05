/**
 * Singleton provider for WorkspaceApplicationService and its repository.
 * Supports DI overrides for testing. Production code uses getWorkspaceApplicationService().
 *
 * Uses StorageGateway to route between LocalStorageAdapter (default) and
 * RemoteAdapter (when VITE_BACKEND_URL is set).
 *
 * @category Infrastructure
 */
import { StorageGateway } from '../gateways/StorageGateway';
import { LocalStorageAdapter } from '../repositories/LocalStorageAdapter';
import { RemoteAdapter } from '../repositories/RemoteAdapter';
import type { WorkspaceRepository } from '../../core/interfaces/WorkspaceRepository';
import { WorkspaceApplicationService } from '../../application/services/WorkspaceApplicationService';

export interface WorkspaceProviderOverrides {
  repository?: WorkspaceRepository; 
  applicationService?: WorkspaceApplicationService;
}

let repositorySingleton: WorkspaceRepository | null = null;

let applicationServiceSingleton: WorkspaceApplicationService | null = null;
let overrides: WorkspaceProviderOverrides | null = null;

export function setWorkspaceProviderOverrides(next: WorkspaceProviderOverrides): void {
  overrides = next;
  if (next.repository) {
    repositorySingleton = null;

    applicationServiceSingleton = null;
  }
  if (next.applicationService) {
    applicationServiceSingleton = null;
  }
}

export function resetWorkspaceProvider(): void {
  overrides = null;
  repositorySingleton = null;
  applicationServiceSingleton = null;
}

function createDefaultRepository(): WorkspaceRepository {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const adapter = backendUrl
    ? new RemoteAdapter(backendUrl)
    : new LocalStorageAdapter();
  return new StorageGateway(adapter);
}

function ensureRepository(): WorkspaceRepository {
  if (overrides?.repository) {
    return overrides.repository;
  }

  if (!repositorySingleton) {
    repositorySingleton = createDefaultRepository();
  }

  return repositorySingleton;
}


export function getWorkspaceApplicationService(): WorkspaceApplicationService {
  if (overrides?.applicationService) {
    return overrides.applicationService;
  }

  if (!applicationServiceSingleton) {
    applicationServiceSingleton = new WorkspaceApplicationService({
      workspaceRepository: ensureRepository(),
    });
  }

  return applicationServiceSingleton;
}


