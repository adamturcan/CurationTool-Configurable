import type { WorkspaceRepository } from '../../core/interfaces/WorkspaceRepository';
import { Workspace } from '../../core/entities/Workspace';
import type { Segment, WorkspaceDTO } from '../../types';

/**
 * Server-backed workspace storage via backend REST API.
 * Used when VITE_BACKEND_URL is set.
 *
 * @category Infrastructure
 */
export class RemoteAdapter implements WorkspaceRepository {
  private readonly backendUrl: string;
  private readonly getAuthToken: () => string | null;

  constructor(backendUrl: string, getAuthToken?: () => string | null) {
    this.backendUrl = backendUrl.replace(/\/$/, '');
    this.getAuthToken = getAuthToken ?? (() => null);
  }

  async findById(id: string): Promise<Workspace | null> {
    const response = await this.fetch(`/api/workspaces/${encodeURIComponent(id)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Failed to fetch workspace (HTTP ${response.status})`);
    const dto = await response.json() as WorkspaceDTO;
    return Workspace.fromDto(dto);
  }

  async findByOwner(ownerId: string): Promise<Workspace[]> {
    const response = await this.fetch(`/api/workspaces?owner=${encodeURIComponent(ownerId)}`);
    if (!response.ok) throw new Error(`Failed to fetch workspaces (HTTP ${response.status})`);
    const dtos = await response.json() as WorkspaceDTO[];
    return dtos.map(dto => Workspace.fromDto(dto));
  }

  async save(workspace: Workspace): Promise<void> {
    const dto = workspace.toDto();
    const response = await this.fetch(`/api/workspaces/${encodeURIComponent(dto.id!)}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
    if (response.status === 404) {
      // New workspace - create
      const createResponse = await this.fetch('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      if (!createResponse.ok) throw new Error(`Failed to create workspace (HTTP ${createResponse.status})`);
      return;
    }
    if (!response.ok) throw new Error(`Failed to save workspace (HTTP ${response.status})`);
  }

  async delete(id: string): Promise<void> {
    const response = await this.fetch(`/api/workspaces/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete workspace (HTTP ${response.status})`);
    }
  }

  async getRawPersistenceForOwner(ownerId: string): Promise<Array<{ id: string; segments?: Segment[] }>> {
    const response = await this.fetch(`/api/workspaces?owner=${encodeURIComponent(ownerId)}`);
    if (!response.ok) return [];
    const dtos = await response.json() as WorkspaceDTO[];
    return dtos.map(dto => ({ id: dto.id, segments: dto.segments }));
  }

  async updateSegments(workspaceId: string, segments: Segment[] | undefined): Promise<void> {
    const response = await this.fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/segments`, {
      method: 'PUT',
      body: JSON.stringify({ segments: segments ?? [] }),
    });
    if (!response.ok) throw new Error(`Failed to update segments (HTTP ${response.status})`);
  }

  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> ?? {}),
    };
    const token = this.getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return globalThis.fetch(`${this.backendUrl}${path}`, {
      ...init,
      headers,
    });
  }
}
