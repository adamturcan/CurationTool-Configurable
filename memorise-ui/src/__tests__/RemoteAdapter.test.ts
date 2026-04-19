import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RemoteAdapter } from '../infrastructure/repositories/RemoteAdapter';
import { Workspace } from '../core/entities/Workspace';

const BACKEND = 'https://api.example.com';
const wsDto = { id: 'ws-1', name: 'Test', owner: 'user-1', text: 'hello' };

const ws = Workspace.create({
  id: 'ws-1', name: 'Test', owner: 'user-1', text: 'hello',
  isTemporary: false, updatedAt: Date.now(),
});

function adapter() { return new RemoteAdapter(BACKEND, () => 'test-token'); }

beforeEach(() => { vi.restoreAllMocks(); });

describe('RemoteAdapter', () => {
  it('findById returns workspace on 200, null on 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(wsDto), { status: 200 }));
    expect((await adapter().findById('ws-1'))!.name).toBe('Test');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('', { status: 404 }));
    expect(await adapter().findById('ws-1')).toBeNull();
  });

  it('save sends PUT with auth header', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await adapter().save(ws);

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/api/workspaces/ws-1'),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('delete sends DELETE, updateSegments sends PUT to segments endpoint', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await adapter().delete('ws-1');
    await adapter().updateSegments('ws-1', []);

    expect(spy.mock.calls[0][1]).toEqual(expect.objectContaining({ method: 'DELETE' }));
    expect(spy.mock.calls[1][0]).toEqual(expect.stringContaining('/api/workspaces/ws-1/segments'));
  });
});
