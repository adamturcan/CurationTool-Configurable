import type { User, CreateUserInput, WorkspaceDTO, Segment, ApiEndpointConfig } from '../types.js';

export interface DbAdapter {
  findUserById(id: string): Promise<User | null>;
  findUserByUsername(username: string): Promise<User | null>;
  createUser(input: CreateUserInput): Promise<User>;

  findWorkspaceById(id: string): Promise<WorkspaceDTO | null>;
  findWorkspacesByOwner(ownerId: string): Promise<WorkspaceDTO[]>;
  saveWorkspace(workspace: WorkspaceDTO): Promise<void>;
  deleteWorkspace(id: string): Promise<void>;
  updateSegments(workspaceId: string, segments: Segment[]): Promise<void>;

  getEndpointConfig(): Promise<ApiEndpointConfig[]>;
  saveEndpointConfig(config: ApiEndpointConfig[]): Promise<void>;
}
