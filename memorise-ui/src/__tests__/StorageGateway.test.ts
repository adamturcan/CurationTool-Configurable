import { describe, it, expect, vi } from 'vitest';
import { StorageGateway } from '../infrastructure/gateways/StorageGateway';
import type { WorkspaceRepository } from '../core/interfaces/WorkspaceRepository';
import { Workspace } from '../core/entities/Workspace';

const ws = Workspace.create({
  id: 'ws-1', name: 'Test', owner: 'user-1', text: 'Hello',
  isTemporary: false, updatedAt: Date.now(),
});

function mockAdapter(): WorkspaceRepository {
  return {
    findById: vi.fn().mockResolvedValue(ws),
    findByOwner: vi.fn().mockResolvedValue([ws]),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    getRawPersistenceForOwner: vi.fn().mockResolvedValue([{ id: 'ws-1', segments: [] }]),
    updateSegments: vi.fn().mockResolvedValue(undefined),
  };
}

describe('StorageGateway', () => {
  it('delegates all CRUD operations to the adapter', async () => {
    const adapter = mockAdapter();
    const gw = new StorageGateway(adapter);

    await gw.findById('ws-1');
    await gw.findByOwner('user-1');
    await gw.save(ws);
    await gw.delete('ws-1');

    expect(adapter.findById).toHaveBeenCalledWith('ws-1');
    expect(adapter.findByOwner).toHaveBeenCalledWith('user-1');
    expect(adapter.save).toHaveBeenCalledWith(ws);
    expect(adapter.delete).toHaveBeenCalledWith('ws-1');
  });

  it('gracefully handles missing optional methods', async () => {
    const minimal: WorkspaceRepository = {
      findById: vi.fn(), findByOwner: vi.fn(), save: vi.fn(), delete: vi.fn(),
    };
    const gw = new StorageGateway(minimal);

    expect(await gw.getRawPersistenceForOwner('user-1')).toEqual([]);
    await expect(gw.updateSegments('ws-1', [])).resolves.toBeUndefined();
  });
});
