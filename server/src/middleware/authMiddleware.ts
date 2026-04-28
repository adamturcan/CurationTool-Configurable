import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('[auth] WARNING: JWT_SECRET not set, using insecure default. Set JWT_SECRET env var in production.');
  }
  return secret ?? 'dev-secret';
};

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getSecret()) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

export function signTokens(payload: AuthPayload) {
  const secret = getSecret();
  const accessToken = jwt.sign(payload, secret, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, secret, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}
