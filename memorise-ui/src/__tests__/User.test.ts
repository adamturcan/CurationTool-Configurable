import { describe, it, expect } from 'vitest';
import { User } from '../core/entities/User';

describe('User', () => {
  it('creates user with valid props and trims whitespace', () => {
    const user = User.create({ id: '  u1  ', username: '  alice  ', email: '  a@b.com  ' });
    expect(user.id).toBe('u1');
    expect(user.username).toBe('alice');
    expect(user.email).toBe('a@b.com');
  });

  it('throws on empty id or username', () => {
    expect(() => User.create({ id: '', username: 'alice' })).toThrow('User id is required');
    expect(() => User.create({ id: 'u1', username: '   ' })).toThrow('User username is required');
  });
});
