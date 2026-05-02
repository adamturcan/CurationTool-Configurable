import type { User, CreateUserInput, WorkspaceDTO, Segment, ApiEndpointConfig } from '../types.js';

/**
 * Persistence contract used by the server
 * Concrete implementations are `JsonFileAdapter` and `PostgresAdapter`, selected at runtime by `createDbAdapter()`.
 */
export interface DbAdapter {
  findUserById(id: string): Promise<User | null>;
  findUserByUsername(username: string): Promise<User | null>;
  /** Hashes the password and persists a new user. */
  createUser(input: CreateUserInput): Promise<User>;

  findWorkspaceById(id: string): Promise<WorkspaceDTO | null>;
  findWorkspacesByOwner(ownerId: string): Promise<WorkspaceDTO[]>;
  /** Inserts or replaces the workspace. */
  saveWorkspace(workspace: WorkspaceDTO): Promise<void>;
  deleteWorkspace(id: string): Promise<void>;
  /** Replaces only the segment list of a workspace. */
  updateSegments(workspaceId: string, segments: Segment[]): Promise<void>;

  getEndpointConfig(): Promise<ApiEndpointConfig[]>;
  saveEndpointConfig(config: ApiEndpointConfig[]): Promise<void>;
}
