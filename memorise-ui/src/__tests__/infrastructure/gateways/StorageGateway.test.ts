import { describe, it, expect, vi } from 'vitest';
import { StorageGateway } from '@/infrastructure/gateways/StorageGateway';
import type { WorkspaceRepository } from '@/core/interfaces/WorkspaceRepository';
import { Workspace } from '@/core/entities/Workspace';

const mockWorkspace = Workspace.create({
  id: 'ws-1',
  name: 'Test',
  owner: 'user-1',
  text: 'Hello',
  isTemporary: false,
  updatedAt: Date.now(),
  userSpans: [],
  apiSpans: [],
  deletedApiKeys: [],
  tags: [],
  translations: [],
});

function createMockAdapter(): WorkspaceRepository {
  return {
    findById: vi.fn().mockResolvedValue(mockWorkspace),
    findByOwner: vi.fn().mockResolvedValue([mockWorkspace]),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    getRawPersistenceForOwner: vi.fn().mockResolvedValue([{ id: 'ws-1', segments: [] }]),
    updateSegments: vi.fn().mockResolvedValue(undefined),
  };
}

describe('StorageGateway', () => {
  it('delegates findById to the adapter', async () => {
    const adapter = createMockAdapter();
    const gateway = new StorageGateway(adapter);

    const result = await gateway.findById('ws-1');

    expect(adapter.findById).toHaveBeenCalledWith('ws-1');
    expect(result?.id).toBe('ws-1');
  });

  it('delegates findByOwner to the adapter', async () => {
    const adapter = createMockAdapter();
    const gateway = new StorageGateway(adapter);

    const result = await gateway.findByOwner('user-1');

    expect(adapter.findByOwner).toHaveBeenCalledWith('user-1');
    expect(result).toHaveLength(1);
  });

  it('delegates save to the adapter', async () => {
    const adapter = createMockAdapter();
    const gateway = new StorageGateway(adapter);

    await gateway.save(mockWorkspace);

    expect(adapter.save).toHaveBeenCalledWith(mockWorkspace);
  });

  it('delegates delete to the adapter', async () => {
    const adapter = createMockAdapter();
    const gateway = new StorageGateway(adapter);

    await gateway.delete('ws-1');

    expect(adapter.delete).toHaveBeenCalledWith('ws-1');
  });

  it('delegates getRawPersistenceForOwner to the adapter', async () => {
    const adapter = createMockAdapter();
    const gateway = new StorageGateway(adapter);

    const result = await gateway.getRawPersistenceForOwner('user-1');

    expect(adapter.getRawPersistenceForOwner).toHaveBeenCalledWith('user-1');
    expect(result).toEqual([{ id: 'ws-1', segments: [] }]);
  });

  it('delegates updateSegments to the adapter', async () => {
    const adapter = createMockAdapter();
    const gateway = new StorageGateway(adapter);
    const segments = [{ id: 'seg-0', start: 0, end: 5, text: 'Hello', order: 0 }];

    await gateway.updateSegments('ws-1', segments);

    expect(adapter.updateSegments).toHaveBeenCalledWith('ws-1', segments);
  });

  it('returns empty array when adapter lacks getRawPersistenceForOwner', async () => {
    const adapter: WorkspaceRepository = {
      findById: vi.fn(),
      findByOwner: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    const gateway = new StorageGateway(adapter);

    const result = await gateway.getRawPersistenceForOwner('user-1');

    expect(result).toEqual([]);
  });

  it('does nothing when adapter lacks updateSegments', async () => {
    const adapter: WorkspaceRepository = {
      findById: vi.fn(),
      findByOwner: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    const gateway = new StorageGateway(adapter);

    await expect(gateway.updateSegments('ws-1', [])).resolves.toBeUndefined();
  });
});
