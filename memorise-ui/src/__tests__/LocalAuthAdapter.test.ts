import { describe, it, expect, beforeEach } from 'vitest';
import { LocalAuthAdapter } from '../infrastructure/adapters/LocalAuthAdapter';

describe('LocalAuthAdapter', () => {
  beforeEach(() => { window.localStorage.clear(); });

  it('login stores username and returns User', async () => {
    const adapter = new LocalAuthAdapter();
    const result = await adapter.login({ username: '  alice  ', password: 'ignored' });

    expect(result.user.id).toBe('alice');
    expect(result.token).toBeUndefined();
    expect(localStorage.getItem('memorise.user.v1')).toBe('alice');
  });

  it('login throws on empty username', async () => {
    const adapter = new LocalAuthAdapter();
    await expect(adapter.login({ username: '', password: '' })).rejects.toThrow(/username is required/i);
  });

  it('logout removes stored user', async () => {
    const adapter = new LocalAuthAdapter();
    await adapter.login({ username: 'alice', password: '' });
    await adapter.logout();
    expect(localStorage.getItem('memorise.user.v1')).toBeNull();
  });

  it('getCurrentUser round-trips through localStorage', async () => {
    const adapter = new LocalAuthAdapter();
    expect(await adapter.getCurrentUser()).toBeNull();

    await adapter.login({ username: 'alice', password: '' });
    const user = await adapter.getCurrentUser();
    expect(user?.id).toBe('alice');
  });

  it('isAuthenticated reflects localStorage state', () => {
    const adapter = new LocalAuthAdapter();
    expect(adapter.isAuthenticated()).toBe(false);

    localStorage.setItem('memorise.user.v1', 'alice');
    expect(adapter.isAuthenticated()).toBe(true);
  });
});
