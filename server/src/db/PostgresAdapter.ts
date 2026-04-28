import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { DbAdapter } from './DbAdapter.js';
import type { User, CreateUserInput, WorkspaceDTO, Segment, ApiEndpointConfig } from '../types.js';

interface WorkspaceRow {
  id: string;
  name: string;
  owner: string | null;
  isTemporary: boolean;
  updatedAt: string | number | null;
  data: Record<string, unknown> | null;
}

export class PostgresAdapter implements DbAdapter {
  private readonly pool: Pool;
  private readonly initPromise: Promise<void>;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
    this.initPromise = this.runMigrations();
  }

  private async runMigrations(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin','user')),
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        is_temporary BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at BIGINT,
        data JSONB NOT NULL DEFAULT '{}'::jsonb
      );
      CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
      CREATE TABLE IF NOT EXISTS endpoint_config (
        key TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        adapter TEXT
      );
    `);
  }

  private async ready(): Promise<void> {
    await this.initPromise;
  }

  private composeWorkspace(row: WorkspaceRow): WorkspaceDTO {
    const updatedAt = row.updatedAt == null ? undefined : Number(row.updatedAt);
    const dto: WorkspaceDTO = {
      id: row.id,
      name: row.name,
      ...(row.owner ? { owner: row.owner } : {}),
      isTemporary: row.isTemporary,
      ...(updatedAt !== undefined ? { updatedAt } : {}),
      ...(row.data ?? {}),
    };
    return dto;
  }

  // Users

  async findUserById(id: string): Promise<User | null> {
    await this.ready();
    const r = await this.pool.query(
      `SELECT id, username, email, password_hash AS "passwordHash", role,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users WHERE id = $1`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async findUserByUsername(username: string): Promise<User | null> {
    await this.ready();
    const r = await this.pool.query(
      `SELECT id, username, email, password_hash AS "passwordHash", role,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users WHERE username = $1`,
      [username],
    );
    return r.rows[0] ?? null;
  }

  async createUser(input: CreateUserInput): Promise<User> {
    await this.ready();
    const passwordHash = await bcrypt.hash(input.password, 10);
    const now = Date.now();
    const user: User = {
      id: randomUUID(),
      username: input.username,
      email: input.email,
      passwordHash,
      role: input.role ?? 'user',
      createdAt: now,
      updatedAt: now,
    };
    await this.pool.query(
      `INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, user.username, user.email ?? null, user.passwordHash, user.role, user.createdAt, user.updatedAt],
    );
    return user;
  }

  // Workspaces

  async findWorkspaceById(id: string): Promise<WorkspaceDTO | null> {
    await this.ready();
    const r = await this.pool.query<WorkspaceRow>(
      `SELECT id, name, owner_id AS owner, is_temporary AS "isTemporary",
              updated_at AS "updatedAt", data
       FROM workspaces WHERE id = $1`,
      [id],
    );
    return r.rows[0] ? this.composeWorkspace(r.rows[0]) : null;
  }

  async findWorkspacesByOwner(ownerId: string): Promise<WorkspaceDTO[]> {
    await this.ready();
    const r = await this.pool.query<WorkspaceRow>(
      `SELECT id, name, owner_id AS owner, is_temporary AS "isTemporary",
              updated_at AS "updatedAt", data
       FROM workspaces WHERE owner_id = $1`,
      [ownerId],
    );
    return r.rows.map(row => this.composeWorkspace(row));
  }

  async saveWorkspace(workspace: WorkspaceDTO): Promise<void> {
    await this.ready();
    const { id, name, owner, isTemporary, updatedAt: _ignored, ...dataPayload } = workspace;
    const updatedAt = Date.now();
    await this.pool.query(
      `INSERT INTO workspaces (id, owner_id, name, is_temporary, updated_at, data)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         owner_id = EXCLUDED.owner_id,
         name = EXCLUDED.name,
         is_temporary = EXCLUDED.is_temporary,
         updated_at = EXCLUDED.updated_at,
         data = EXCLUDED.data`,
      [id, owner ?? null, name, isTemporary ?? false, updatedAt, JSON.stringify(dataPayload)],
    );
  }

  async deleteWorkspace(id: string): Promise<void> {
    await this.ready();
    await this.pool.query(`DELETE FROM workspaces WHERE id = $1`, [id]);
  }

  async updateSegments(workspaceId: string, segments: Segment[]): Promise<void> {
    await this.ready();
    await this.pool.query(
      `UPDATE workspaces
       SET data = jsonb_set(COALESCE(data, '{}'::jsonb), '{segments}', $2::jsonb, true),
           updated_at = $3
       WHERE id = $1`,
      [workspaceId, JSON.stringify(segments), Date.now()],
    );
  }

  // Endpoint config

  async getEndpointConfig(): Promise<ApiEndpointConfig[]> {
    await this.ready();
    const r = await this.pool.query<{ key: string; name: string; url: string; adapter: string | null }>(
      `SELECT key, name, url, adapter FROM endpoint_config ORDER BY key`,
    );
    return r.rows.map(row => ({
      key: row.key,
      name: row.name,
      url: row.url,
      ...(row.adapter ? { adapter: row.adapter } : {}),
    }));
  }

  async saveEndpointConfig(config: ApiEndpointConfig[]): Promise<void> {
    await this.ready();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM endpoint_config');
      for (const c of config) {
        await client.query(
          `INSERT INTO endpoint_config (key, name, url, adapter)
           VALUES ($1, $2, $3, $4)`,
          [c.key, c.name, c.url, c.adapter ?? null],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
