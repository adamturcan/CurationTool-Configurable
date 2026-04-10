import { describe, it, expect } from 'vitest';
import { User } from '@/core/entities/User';

describe('User', () => {
  it('creates user with valid props', () => {
    const user = User.create({ id: 'u1', username: 'alice' });
    expect(user.id).toBe('u1');
    expect(user.username).toBe('alice');
    expect(user.email).toBeUndefined();
  });

  it('creates user with email', () => {
    const user = User.create({ id: 'u1', username: 'alice', email: 'alice@example.com' });
    expect(user.email).toBe('alice@example.com');
  });

  it('trims whitespace from id and username', () => {
    const user = User.create({ id: '  u1  ', username: '  alice  ', email: '  a@b.com  ' });
    expect(user.id).toBe('u1');
    expect(user.username).toBe('alice');
    expect(user.email).toBe('a@b.com');
  });

  it('throws on empty id', () => {
    expect(() => User.create({ id: '', username: 'alice' })).toThrow('User id is required');
    expect(() => User.create({ id: '   ', username: 'alice' })).toThrow('User id is required');
  });

  it('throws on empty username', () => {
    expect(() => User.create({ id: 'u1', username: '' })).toThrow('User username is required');
    expect(() => User.create({ id: 'u1', username: '   ' })).toThrow('User username is required');
  });
});
