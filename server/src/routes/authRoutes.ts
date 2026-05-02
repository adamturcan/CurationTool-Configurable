import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { DbAdapter } from '../db/DbAdapter.js';
import { signTokens } from '../middleware/authMiddleware.js';

/** Authentication routes mounted under `/auth`: login, register, logout and token refresh. */
export function authRoutes(db: DbAdapter): Router {
  const router = Router();

  /** `POST /auth/login` - verifies credentials and returns the user with a fresh token pair. */
  router.post('/login', async (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    const user = await db.findUserByUsername(username);
    if (!user || !await bcrypt.compare(password ?? '', user.passwordHash)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const tokens = signTokens({ id: user.id, username: user.username, role: user.role });
    res.json({
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      ...tokens,
    });
  });

  /** `POST /auth/register` - validates input, creates the user and returns a token pair so they are signed in. */
  router.post('/register', async (req, res) => {
    const { username, email, password } = req.body as { username?: string; email?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    if (username.length < 2 || username.length > 50) {
      res.status(400).json({ error: 'Username must be 2-50 characters' });
      return;
    }
    if (password.length < 4 || password.length > 128) {
      res.status(400).json({ error: 'Password must be 4-128 characters' });
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    const existing = await db.findUserByUsername(username);
    if (existing) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }

    const user = await db.createUser({ username, email, password });
    const tokens = signTokens({ id: user.id, username: user.username, role: user.role });
    res.json({
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      ...tokens,
    });
  });

  /** `POST /auth/logout` - no-op; the client just discards its tokens. */
  router.post('/logout', (_req, res) => {
    res.sendStatus(204);
  });

  /** `POST /auth/refresh` - exchanges a valid refresh token for a new access + refresh token pair. */
  router.post('/refresh', (req, res) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    try {
      const secret = process.env.JWT_SECRET ?? 'dev-secret';
      const payload = jwt.verify(refreshToken, secret) as { id: string; username: string; role: 'admin' | 'user' };
      const tokens = signTokens({ id: payload.id, username: payload.username, role: payload.role });
      res.json(tokens);
    } catch {
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  });

  return router;
}
