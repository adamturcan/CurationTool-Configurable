/**
 * Server entry point.
 * Sets up the Express app, the database adapter, the registry of NLP adapters and the four route groups, and seeds a default config and admin user on first run.
 */
import express from 'express';
import cors from 'cors';
import { createDbAdapter } from './db/index.js';
import { AdapterRegistry } from './adapters/AdapterRegistry.js';
import { SduNerAdapter } from './adapters/ner/SduNerAdapter.js';
import { SduSegmentAdapter } from './adapters/segment/SduSegmentAdapter.js';
import { SduClassifyAdapter } from './adapters/classify/SduClassifyAdapter.js';
import { SduTranslateAdapter } from './adapters/translate/SduTranslateAdapter.js';
import { MockMedicalNerAdapter } from './adapters/ner/MockMedicalNerAdapter.js';
import { MockMedicalSegmentAdapter } from './adapters/segment/MockMedicalSegmentAdapter.js';
import { MockMedicalClassifyAdapter } from './adapters/classify/MockMedicalClassifyAdapter.js';
import { MockMedicalTranslateAdapter } from './adapters/translate/MockMedicalTranslateAdapter.js';
import { authRoutes } from './routes/authRoutes.js';
import { configRoutes } from './routes/configRoutes.js';
import { nlpRoutes } from './routes/nlpRoutes.js';
import { workspaceRoutes } from './routes/workspaceRoutes.js';

const app = express();
const port = parseInt(process.env.PORT ?? '3001', 10);

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '5mb' }));

// Database
const db = createDbAdapter();

// Adapter registry
const registry = new AdapterRegistry();
registry.register('ner', new SduNerAdapter());
registry.register('segment', new SduSegmentAdapter());
registry.register('classify', new SduClassifyAdapter());
registry.register('translate', new SduTranslateAdapter());
registry.register('ner', new MockMedicalNerAdapter());
registry.register('segment', new MockMedicalSegmentAdapter());
registry.register('classify', new MockMedicalClassifyAdapter());
registry.register('translate', new MockMedicalTranslateAdapter());

// Routes
app.use('/auth', authRoutes(db));
app.use('/api', configRoutes(db, registry));
app.use('/api', nlpRoutes(registry, db));
app.use('/api', workspaceRoutes(db));

/** Seeds the default endpoint config and admin user on first run; skipped if either already exists. */
async function seedConfig() {
  const existing = await db.getEndpointConfig();
  if (existing.length === 0) {
    await db.saveEndpointConfig([
      { name: 'Named Entity Recognition', key: 'ner', url: process.env.NER_URL ?? 'https://ner-api.dev.memorise.sdu.dk/recognize', adapter: process.env.NER_ADAPTER ?? 'sdu-ner' },
      { name: 'Text Segmentation', key: 'segment', url: process.env.SEGMENT_URL ?? 'https://textseg-api.dev.memorise.sdu.dk/segment', adapter: process.env.SEGMENT_ADAPTER ?? 'sdu-segment' },
      { name: 'Semantic Classification', key: 'classify', url: process.env.CLASSIFY_URL ?? 'https://semtag-api.dev.memorise.sdu.dk/classify', adapter: process.env.CLASSIFY_ADAPTER ?? 'sdu-classify' },
      { name: 'Machine Translation', key: 'translate', url: process.env.TRANSLATE_URL ?? 'https://mt-api.dev.memorise.sdu.dk/translate', adapter: process.env.TRANSLATE_ADAPTER ?? 'sdu-translate' },
      { name: 'Supported Languages', key: 'translate-languages', url: process.env.TRANSLATE_LANGUAGES_URL ?? 'https://mt-api.dev.memorise.sdu.dk/supported_languages' },
    ]);
    console.log('[server] Seeded default endpoint config');
  }

  // Seed admin user if no users exist
  const admin = await db.findUserByUsername('admin');
  if (!admin) {
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin';
    await db.createUser({ username: 'admin', email: 'admin@memorise.local', password: adminPassword, role: 'admin' });
    console.log('[server] Seeded admin user (username: admin)');
  }
}

seedConfig().then(() => {
  app.listen(port, () => {
    console.log(`[server] Memorise API running on http://localhost:${port}`);
  });
}).catch(err => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
