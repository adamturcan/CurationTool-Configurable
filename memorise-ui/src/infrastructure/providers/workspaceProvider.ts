/**
 * Singleton provider for `WorkspaceApplicationService` and the underlying `WorkspaceRepository`.
 * Routes through `StorageGateway`, which delegates to `LocalStorageWorkspaceRepository` (default) or `RemoteAdapter` (when `VITE_BACKEND_URL` is set).
 * Tests can substitute the repository or the application service directly via `setWorkspaceProviderOverrides`; `resetWorkspaceProvider` clears both back to environment defaults.
 * The non-obvious detail is that overriding the repository invalidates the application-service singleton too — so the next `getWorkspaceApplicationService()` call rebuilds with the new repo, no manual cache busting needed.
 *
 * @category Infrastructure
 */
import { StorageGateway } from '../gateways/StorageGateway';
import { LocalStorageWorkspaceRepository } from '../repositories/LocalStorageWorkspaceRepository';
import { RemoteAdapter } from '../repositories/RemoteAdapter';
import type { WorkspaceRepository } from '../../core/interfaces/WorkspaceRepository';
import { WorkspaceApplicationService } from '../../application/WorkspaceApplicationService';
import { getAuthService } from './authProvider';

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
    ? new RemoteAdapter(backendUrl, () => getAuthService().getToken())
    : new LocalStorageWorkspaceRepository();
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


