import { describe, it, expect } from 'vitest';
import { RemoteAdapter } from '@/infrastructure/repositories/RemoteAdapter';
import { Workspace } from '@/core/entities/Workspace';

const ERROR_MSG = 'RemoteAdapter for http://localhost:8080 is not yet implemented. Set VITE_BACKEND_URL to empty to use local storage.';

const mockWorkspace = Workspace.create({
  id: 'ws-1',
  name: 'Test',
  owner: 'user-1',
  text: '',
  isTemporary: false,
  updatedAt: Date.now(),
  userSpans: [],
  apiSpans: [],
  deletedApiKeys: [],
  tags: [],
  translations: [],
});

describe('RemoteAdapter', () => {
  const adapter = new RemoteAdapter('http://localhost:8080');

  it('throws on findById', async () => {
    await expect(adapter.findById('ws-1')).rejects.toThrow(ERROR_MSG);
  });

  it('throws on findByOwner', async () => {
    await expect(adapter.findByOwner('user-1')).rejects.toThrow(ERROR_MSG);
  });

  it('throws on save', async () => {
    await expect(adapter.save(mockWorkspace)).rejects.toThrow(ERROR_MSG);
  });

  it('throws on delete', async () => {
    await expect(adapter.delete('ws-1')).rejects.toThrow(ERROR_MSG);
  });

  it('throws on getRawPersistenceForOwner', async () => {
    await expect(adapter.getRawPersistenceForOwner('user-1')).rejects.toThrow(ERROR_MSG);
  });

  it('throws on updateSegments', async () => {
    await expect(adapter.updateSegments('ws-1', [])).rejects.toThrow(ERROR_MSG);
  });
});
