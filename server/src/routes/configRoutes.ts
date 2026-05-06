import { Router } from 'express';
import type { DbAdapter } from '../db/DbAdapter.js';
import type { AdapterRegistry } from '../adapters/AdapterRegistry.js';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware.js';
import { validateEntityPalette } from './validateEntityPalette.js';
import type { EntityColor } from '../types.js';

/**
 * Config routes mounted under `/api`: read the endpoint config, write it (admin only), probe endpoint health, and list registered adapters.
 */
export function configRoutes(db: DbAdapter, registry: AdapterRegistry): Router {
  const router = Router();

  /** `GET /api/config` - returns endpoints and the entity color palette. Public so the frontend can read it before login. */
  router.get('/config', async (_req, res) => {
    const [endpoints, palette] = await Promise.all([
      db.getEndpointConfig(),
      db.getEntityPalette(),
    ]);
    res.json({ endpoints, palette });
  });

  /**
   * `PUT /api/config` - admin-only partial update of app config.
   * Each section is optional: clients send only the slice they edited.
   * Always returns the resulting full state so the cache stays in sync.
   */
  router.put('/config', authMiddleware, adminMiddleware, async (req, res) => {
    const { endpoints, palette } = req.body as { endpoints?: unknown; palette?: unknown };

    if (endpoints === undefined && palette === undefined) {
      res.status(400).json({ error: 'endpoints or palette required' });
      return;
    }

    if (endpoints !== undefined) {
      if (!Array.isArray(endpoints)) {
        res.status(400).json({ error: 'endpoints must be an array' });
        return;
      }
      await db.saveEndpointConfig(endpoints);
    }

    if (palette !== undefined) {
      const error = validateEntityPalette(palette);
      if (error) {
        res.status(400).json({ error });
        return;
      }
      await db.saveEntityPalette(palette as EntityColor[]);
    }

    const [savedEndpoints, savedPalette] = await Promise.all([
      db.getEndpointConfig(),
      db.getEntityPalette(),
    ]);
    res.json({ endpoints: savedEndpoints, palette: savedPalette });
  });

  /**
   * `POST /api/health` - pings each supplied endpoint (`HEAD`, falling back to `POST`) with a 5s timeout and returns its status and latency for the admin Services page.
   */
  router.post('/health', authMiddleware, async (req, res) => {
    const { endpoints } = req.body as { endpoints?: { key: string; name: string; url: string }[] };
    if (!Array.isArray(endpoints)) {
      res.status(400).json({ error: 'endpoints array required' });
      return;
    }

    const results = await Promise.all(
      endpoints.map(async (ep) => {
        const start = performance.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        try {
          let response: Response;
          try {
            response = await fetch(ep.url, { method: 'HEAD', signal: controller.signal });
          } catch {
            response = await fetch(ep.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: '' }),
              signal: controller.signal,
            });
          }

          const latencyMs = Math.round(performance.now() - start);

          return {
            key: ep.key,
            name: ep.name,
            url: ep.url,
            status: response.status !== 404 && response.status < 500 ? 'up' : 'down',
            latencyMs,
            httpStatus: response.status,
            error: response.ok ? null : `HTTP ${response.status}`,
            checkedAt: Date.now(),
          };
        } catch (err) {
          const latencyMs = Math.round(performance.now() - start);
          const isTimeout = err instanceof DOMException && err.name === 'AbortError';
          return {
            key: ep.key,
            name: ep.name,
            url: ep.url,
            status: 'down' as const,
            latencyMs: isTimeout ? null : latencyMs,
            httpStatus: null,
            error: isTimeout ? 'Timeout' : (err instanceof Error ? err.message : 'Unknown error'),
            checkedAt: Date.now(),
          };
        } finally {
          clearTimeout(timer);
        }
      })
    );

    res.json(results);
  });

  /** `GET /api/adapters` - lists registered adapters; `?serviceType=ner` filters to one service. */
  router.get('/adapters', authMiddleware, (req, res) => {
    const serviceType = req.query.serviceType as string | undefined;
    if (serviceType) {
      res.json(registry.listForService(serviceType));
    } else {
      const all: Record<string, { key: string; name: string }[]> = {};
      for (const type of ['ner', 'segment', 'classify', 'translate']) {
        all[type] = registry.listForService(type);
      }
      res.json(all);
    }
  });

  return router;
}
