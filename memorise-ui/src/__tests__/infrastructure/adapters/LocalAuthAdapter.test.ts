import { describe, it, expect, beforeEach } from 'vitest';
import { LocalAuthAdapter } from '@/infrastructure/adapters/LocalAuthAdapter';

describe('LocalAuthAdapter', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('login stores username and returns User with id === username', async () => {
    const adapter = new LocalAuthAdapter();
    const result = await adapter.login({ username: 'alice', password: 'ignored' });

    expect(result.user.id).toBe('alice');
    expect(result.user.username).toBe('alice');
    expect(result.token).toBeUndefined();
    expect(localStorage.getItem('memorise.user.v1')).toBe('alice');
  });

  it('login ignores password', async () => {
    const adapter = new LocalAuthAdapter();
    const result = await adapter.login({ username: 'bob', password: 'secret123' });
    expect(result.user.id).toBe('bob');
  });

  it('login trims username', async () => {
    const adapter = new LocalAuthAdapter();
    const result = await adapter.login({ username: '  charlie  ', password: '' });
    expect(result.user.id).toBe('charlie');
    expect(localStorage.getItem('memorise.user.v1')).toBe('charlie');
  });

  it('login throws on empty username', async () => {
    const adapter = new LocalAuthAdapter();
    await expect(adapter.login({ username: '', password: '' })).rejects.toThrow('Username is required');
  });

  it('register behaves same as login', async () => {
    const adapter = new LocalAuthAdapter();
    const result = await adapter.register({ username: 'dave', email: 'd@e.com', password: 'pass' });
    expect(result.user.id).toBe('dave');
    expect(localStorage.getItem('memorise.user.v1')).toBe('dave');
  });

  it('logout removes localStorage key', async () => {
    const adapter = new LocalAuthAdapter();
    await adapter.login({ username: 'alice', password: '' });
    expect(localStorage.getItem('memorise.user.v1')).toBe('alice');

    await adapter.logout();
    expect(localStorage.getItem('memorise.user.v1')).toBeNull();
  });

  it('getCurrentUser returns User when key exists', async () => {
    localStorage.setItem('memorise.user.v1', 'alice');
    const adapter = new LocalAuthAdapter();
    const user = await adapter.getCurrentUser();
    expect(user).not.toBeNull();
    expect(user?.id).toBe('alice');
    expect(user?.username).toBe('alice');
  });

  it('getCurrentUser returns null when key absent', async () => {
    const adapter = new LocalAuthAdapter();
    const user = await adapter.getCurrentUser();
    expect(user).toBeNull();
  });

  it('isAuthenticated returns true when key exists', () => {
    localStorage.setItem('memorise.user.v1', 'alice');
    const adapter = new LocalAuthAdapter();
    expect(adapter.isAuthenticated()).toBe(true);
  });

  it('isAuthenticated returns false when key absent', () => {
    const adapter = new LocalAuthAdapter();
    expect(adapter.isAuthenticated()).toBe(false);
  });

  it('getToken always returns null', () => {
    const adapter = new LocalAuthAdapter();
    expect(adapter.getToken()).toBeNull();
  });
});
