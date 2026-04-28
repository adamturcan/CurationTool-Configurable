import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { DbAdapter } from './DbAdapter.js';
import type { User, CreateUserInput, WorkspaceDTO, Segment, ApiEndpointConfig } from '../types.js';

export class JsonFileAdapter implements DbAdapter {
  private readonly dataPath: string;

  constructor(dataPath: string) {
    this.dataPath = dataPath;
  }

  private filePath(name: string): string {
    return join(this.dataPath, name);
  }

  private async ensureDir(): Promise<void> {
    if (!existsSync(this.dataPath)) {
      await mkdir(this.dataPath, { recursive: true });
    }
  }

  private async readJson<T>(name: string, fallback: T): Promise<T> {
    await this.ensureDir();
    const path = this.filePath(name);
    if (!existsSync(path)) return fallback;
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw) as T;
  }

  private async writeJson<T>(name: string, data: T): Promise<void> {
    await this.ensureDir();
    await writeFile(this.filePath(name), JSON.stringify(data, null, 2), 'utf-8');
  }

  // Users

  async findUserById(id: string): Promise<User | null> {
    const users = await this.readJson<User[]>('users.json', []);
    return users.find(u => u.id === id) ?? null;
  }

  async findUserByUsername(username: string): Promise<User | null> {
    const users = await this.readJson<User[]>('users.json', []);
    return users.find(u => u.username === username) ?? null;
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const users = await this.readJson<User[]>('users.json', []);
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user: User = {
      id: randomUUID(),
      username: input.username,
      email: input.email,
      passwordHash,
      role: input.role ?? 'user',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    users.push(user);
    await this.writeJson('users.json', users);
    return user;
  }

  // Workspaces

  async findWorkspaceById(id: string): Promise<WorkspaceDTO | null> {
    const workspaces = await this.readJson<WorkspaceDTO[]>('workspaces.json', []);
    return workspaces.find(w => w.id === id) ?? null;
  }

  async findWorkspacesByOwner(ownerId: string): Promise<WorkspaceDTO[]> {
    const workspaces = await this.readJson<WorkspaceDTO[]>('workspaces.json', []);
    return workspaces.filter(w => w.owner === ownerId);
  }

  async saveWorkspace(workspace: WorkspaceDTO): Promise<void> {
    const workspaces = await this.readJson<WorkspaceDTO[]>('workspaces.json', []);
    const idx = workspaces.findIndex(w => w.id === workspace.id);
    if (idx >= 0) {
      workspaces[idx] = { ...workspace, updatedAt: Date.now() };
    } else {
      workspaces.push({ ...workspace, updatedAt: Date.now() });
    }
    await this.writeJson('workspaces.json', workspaces);
  }

  async deleteWorkspace(id: string): Promise<void> {
    const workspaces = await this.readJson<WorkspaceDTO[]>('workspaces.json', []);
    await this.writeJson('workspaces.json', workspaces.filter(w => w.id !== id));
  }

  async updateSegments(workspaceId: string, segments: Segment[]): Promise<void> {
    const workspaces = await this.readJson<WorkspaceDTO[]>('workspaces.json', []);
    const ws = workspaces.find(w => w.id === workspaceId);
    if (ws) {
      ws.segments = segments;
      ws.updatedAt = Date.now();
      await this.writeJson('workspaces.json', workspaces);
    }
  }

  // Config

  async getEndpointConfig(): Promise<ApiEndpointConfig[]> {
    return this.readJson<ApiEndpointConfig[]>('config.json', []);
  }

  async saveEndpointConfig(config: ApiEndpointConfig[]): Promise<void> {
    await this.writeJson('config.json', config);
  }
}
