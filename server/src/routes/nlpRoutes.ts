import { Router } from 'express';
import type { DbAdapter } from '../db/DbAdapter.js';
import type { AdapterRegistry } from '../adapters/AdapterRegistry.js';
import type { TranslateAdapter } from '../adapters/NlpAdapter.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export function nlpRoutes(registry: AdapterRegistry, db: DbAdapter): Router {
  const router = Router();

  router.post('/:serviceType(ner|segment|classify|translate)', authMiddleware, async (req, res) => {
    const serviceType = req.params.serviceType as string;
    const maxTextLength = parseInt(process.env.MAX_TEXT_LENGTH ?? '50000', 10);
    const text = (req.body as { text?: string })?.text;
    if (typeof text === 'string' && text.length > maxTextLength) {
      res.status(400).json({ error: `Text too long (max ${maxTextLength.toLocaleString()} characters)` });
      return;
    }

    const endpoints = await db.getEndpointConfig();
    const config = endpoints.find(ep => ep.key === serviceType);
    if (!config) {
      res.status(404).json({ error: `No config for service: ${serviceType}` });
      return;
    }

    const adapterKey = config.adapter;
    const adapter = adapterKey
      ? registry.get(serviceType, adapterKey)
      : registry.getDefault(serviceType);

    if (!adapter) {
      res.status(500).json({ error: `No adapter found for ${serviceType}` });
      return;
    }

    try {
      const result = await adapter.call(req.body, config.url);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Adapter call failed';
      res.status(502).json({ error: message });
    }
  });

  router.get('/translate/languages', authMiddleware, async (_req, res) => {
    const endpoints = await db.getEndpointConfig();
    const langConfig = endpoints.find(ep => ep.key === 'translate-languages');
    const translateConfig = endpoints.find(ep => ep.key === 'translate');
    const langUrl = langConfig?.url ?? translateConfig?.url;

    if (!langUrl) {
      res.status(404).json({ error: 'No translate-languages or translate config' });
      return;
    }

    const adapterKey = translateConfig?.adapter;
    const adapter = (adapterKey
      ? registry.get('translate', adapterKey)
      : registry.getDefault('translate')) as TranslateAdapter | null;

    if (!adapter?.getSupportedLanguages) {
      res.status(500).json({ error: 'Translate adapter missing getSupportedLanguages' });
      return;
    }

    try {
      const languages = await adapter.getSupportedLanguages(langUrl);
      res.json(languages);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch languages';
      res.status(502).json({ error: message });
    }
  });

  return router;
}
