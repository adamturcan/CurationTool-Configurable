// Mock medical NLP service with response shapes that on purpose do not match SDU
// Used together with the MockMedical* adapters in server/src/adapters/ to demo plugging in a service with a different shape.

import express from 'express';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '5002', 10);

// Group declared entities by type and resolve their character offsets via indexOf, so the JSON files only need the entity text.
function buildEntitiesByType(text, declared) {
  const buckets = { DISEASE: [], MEDICATION: [], ANATOMY: [], PROCEDURE: [] };
  for (const e of declared) {
    const idx = text.indexOf(e.text);
    if (idx < 0) continue;
    const entity = {
      span: [idx, idx + e.text.length],
      text: e.text,
      confidence: e.confidence ?? 0.95,
    };
    if (e.codes) entity.codes = e.codes;
    if (e.attributes) entity.attributes = e.attributes;
    const bucket = buckets[e.type] ?? (buckets[e.type] = []);
    bucket.push(entity);
  }
  return buckets;
}

// Same idea for sections, just with the char_range shape.
function buildSections(text, declared) {
  const result = [];
  for (const s of declared) {
    const idx = text.indexOf(s.text);
    if (idx < 0) continue;
    result.push({ name: s.name, char_range: { from: idx, to: idx + s.text.length }, text: s.text, subsections: [] });
  }
  return result;
}

// Load all sample JSONs from samples/ at startup.
const samplesDir = join(__dirname, 'samples');
const samples = readdirSync(samplesDir)
  .filter(f => f.endsWith('.json'))
  .map(f => {
    const raw = JSON.parse(readFileSync(join(samplesDir, f), 'utf-8'));
    return {
      id: raw.id,
      text: raw.text,
      rawEntities: raw.entities ?? [],
      rawSections: raw.sections ?? [],
      categories: raw.categories ?? [],
      expansion: raw.expansion ?? null,
    };
  });

console.log(`[medical-mock] loaded ${samples.length} sample document(s)`);

// Find a sample whose text contains the input or is contained by it.
function findSample(text) {
  if (!text || typeof text !== 'string') return null;
  const norm = text.trim();
  if (!norm) return null;
  return samples.find(s => s.text.includes(norm) || norm.includes(s.text)) ?? null;
}

function buildClinicalEntitiesResponse(text, sample) {
  const meta = { model: 'mock-biobert-v1', version: '2026.04', processing_time_ms: 42 };
  if (sample) return { metadata: meta, entities: buildEntitiesByType(text, sample.rawEntities) };
  return {
    metadata: meta,
    entities: { DISEASE: [], MEDICATION: [], ANATOMY: [], PROCEDURE: [] },
  };
}

function buildSectionizeResponse(text, sample) {
  const meta = { model: 'mock-section-v1' };
  if (sample) {
    const sections = buildSections(text, sample.rawSections);
    if (sections.length > 0) return { metadata: meta, sections };
  }
  return {
    metadata: meta,
    sections: [
      {
        name: 'subjective',
        char_range: { from: 0, to: text.length },
        text,
        subsections: [],
      },
    ],
  };
}

function buildCategoriseResponse(_text, sample) {
  const meta = { model: 'mock-icd-v1' };
  if (sample && sample.categories.length > 0) {
    return { metadata: meta, categories: sample.categories };
  }
  return {
    metadata: meta,
    categories: [
      {
        icd10_chapter: 'XXII',
        name: 'Codes for special purposes',
        code_range: 'U00-U85',
        score: 0.5,
        subcategories: [],
      },
    ],
  };
}

function buildTranslateResponse(input, sample) {
  const meta = { model: 'mock-medex-v1' };
  if (sample?.expansion) {
    // Only expand abbreviations whose source token actually appears in the input.
    let expandedText = input;
    const usedExpansions = [];
    for (const exp of sample.expansion.expansions ?? []) {
      const idx = expandedText.indexOf(exp.abbreviation);
      if (idx < 0) continue;
      expandedText = expandedText.slice(0, idx) + exp.expansion + expandedText.slice(idx + exp.abbreviation.length);
      usedExpansions.push({ abbreviation: exp.abbreviation, expansion: exp.expansion, position: idx });
    }
    return {
      metadata: meta,
      output: { expanded_text: expandedText, language: sample.expansion.language ?? 'en', expansions: usedExpansions },
    };
  }
  return {
    metadata: meta,
    output: { expanded_text: input, language: 'en', expansions: [] },
  };
}

const app = express();
app.use(express.json({ limit: '5mb' }));

// Simple request log, to see what the platform is calling.
app.use((req, _res, next) => {
  console.log(`[medical-mock] ${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// HEAD on POST paths for health checks.
app.head('/v2/clinical-entities', (_req, res) => res.sendStatus(200));
app.head('/v2/sectionize', (_req, res) => res.sendStatus(200));
app.head('/v2/categorise', (_req, res) => res.sendStatus(200));
app.head('/v2/translate-en-medical', (_req, res) => res.sendStatus(200));

app.post('/v2/clinical-entities', (req, res) => {
  const text = req.body?.text ?? '';
  res.json(buildClinicalEntitiesResponse(text, findSample(text)));
});

app.post('/v2/sectionize', (req, res) => {
  const text = req.body?.text ?? '';
  res.json(buildSectionizeResponse(text, findSample(text)));
});

app.post('/v2/categorise', (req, res) => {
  const text = req.body?.text ?? '';
  res.json(buildCategoriseResponse(text, findSample(text)));
});

app.post('/v2/translate-en-medical', (req, res) => {
  const input = req.body?.input ?? '';
  res.json(buildTranslateResponse(input, findSample(input)));
});

app.get('/v2/languages', (_req, res) => {
  res.json({
    metadata: { service: 'medex' },
    supported: [{ code: 'en', name: 'English' }],
  });
});

app.listen(PORT, () => {
  console.log(`[medical-mock] listening on http://localhost:${PORT}`);
});
