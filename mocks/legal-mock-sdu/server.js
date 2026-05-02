// Mock NLP service that uses the same URL paths and request/response
// shapes as SDU but returns legal-domain content.
// Used to demo switching providers via configuration only.

import express from 'express';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '5001', 10);

// Load all sample JSONs from samples/ at startup.
const samplesDir = join(__dirname, 'samples');
const samples = readdirSync(samplesDir)
  .filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(readFileSync(join(samplesDir, f), 'utf-8')));

console.log(`[legal-mock] loaded ${samples.length} sample document(s)`);

// Find a sample whose text contains the input or is contained by it.
function findSample(text) {
  if (!text || typeof text !== 'string') return null;
  const norm = text.trim();
  if (!norm) return null;
  return samples.find(s => s.text.includes(norm) || norm.includes(s.text)) ?? null;
}

function buildNerResponse(text, sample) {
  if (sample) {
    const result = [];
    for (const ent of sample.entities) {
      const idx = text.indexOf(ent.text);
      if (idx >= 0) {
        result.push({ start: idx, end: idx + ent.text.length, type: ent.type, score: 0.95 });
      }
    }
    return { result };
  }
  // Fallback for unknown text. Tag capitalised tokens as PERSON.
  const result = [];
  const re = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    result.push({ start: m.index, end: m.index + m[0].length, type: 'PERSON', score: 0.5 });
  }
  return { result };
}

function buildSegmentResponse(text, sample) {
  if (sample) {
    return { results: sample.sentences.map(s => ({ sentence_text: s, label: 0, score: 0.95 })) };
  }
  // Fallback, split on sentence ending punctuation followed by whitespace.
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  return { results: sentences.map(s => ({ sentence_text: s, label: 0, score: 0.7 })) };
}

function buildClassifyResponse(text, sample) {
  if (sample) return { result: sample.classify };
  return { result: [{ label: 9999, score: 0.5, name: 'general legal' }] };
}

function buildTranslateResponse(text, tgt, sample) {
  const translations = sample?.translations?.[tgt];
  if (translations) {
    // Per-sentence translations, pick the ones whose source sentence is in the input.
    if (Array.isArray(translations) && Array.isArray(sample.sentences)) {
      const picked = [];
      for (let i = 0; i < sample.sentences.length; i++) {
        if (text.includes(sample.sentences[i])) picked.push(translations[i]);
      }
      if (picked.length > 0) return { text: picked.join(' ') };
    }
    // Or a single translated string for the whole document.
    if (typeof translations === 'string') return { text: translations };
  }
  return { text: `[${tgt.toUpperCase()}] ${text}` };
}

const app = express();
app.use(express.json({ limit: '5mb' }));

// Simple request log, to see what the platform is calling.
app.use((req, _res, next) => {
  console.log(`[legal-mock] ${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// HEAD on POST paths for health checks.
app.head('/recognize', (_req, res) => res.sendStatus(200));
app.head('/segment', (_req, res) => res.sendStatus(200));
app.head('/classify', (_req, res) => res.sendStatus(200));
app.head('/translate', (_req, res) => res.sendStatus(200));

app.post('/recognize', (req, res) => {
  const text = req.body?.text ?? '';
  res.json(buildNerResponse(text, findSample(text)));
});

app.post('/segment', (req, res) => {
  const text = req.body?.text ?? '';
  res.json(buildSegmentResponse(text, findSample(text)));
});

app.post('/classify', (req, res) => {
  const text = req.body?.text ?? '';
  res.json(buildClassifyResponse(text, findSample(text)));
});

app.post('/translate', (req, res) => {
  const text = req.body?.text ?? '';
  const tgt = req.body?.tgt_lang ?? 'en';
  res.json(buildTranslateResponse(text, tgt, findSample(text)));
});

app.get('/supported_languages', (_req, res) => {
  res.json({ languages: ['en', 'de', 'fr', 'es', 'sk', 'cs', 'pl', 'nl', 'it', 'ru'] });
});

app.listen(PORT, () => {
  console.log(`[legal-mock] listening on http://localhost:${PORT}`);
});
