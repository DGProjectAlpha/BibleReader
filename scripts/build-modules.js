#!/usr/bin/env node
/**
 * build-modules.js
 * Reads KJV, ASV, and RST Strong source JSON files and emits
 * properly formatted .brbmod files into the /modules directory.
 *
 * Usage: node scripts/build-modules.js
 *
 * Source files expected at:
 *   src/data/kjv.json        — KJV tagged bible
 *   src/data/asv.json        — ASV tagged bible
 *   ../../rst_strong.json    — RST Strong (Russian Synodal with Strong's tags)
 *     OR set RST_SOURCE env var to an absolute path
 *
 * Output: modules/KJV.brbmod, modules/ASV.brbmod, modules/RstStrong.brbmod
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Paths ────────────────────────────────────────────────────────────────────
const ROOT       = path.resolve(__dirname, '..');
const DATA_DIR   = path.join(ROOT, 'src', 'data');
const MODULES_DIR = path.join(ROOT, 'modules');

const RST_SOURCE = process.env.RST_SOURCE
  || path.resolve(__dirname, '..', '..', '..', 'workspace', 'rst_strong.json')
  || '/workspace/rst_strong.json';

// Resolve RST path — try workspace-relative first, then absolute fallback
function resolveRstPath() {
  const candidates = [
    process.env.RST_SOURCE,
    path.join('/workspace', 'rst_strong.json'),
    path.resolve(ROOT, '..', 'rst_strong.json'),
    path.resolve(ROOT, '..', '..', 'rst_strong.json'),
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ── Module definitions ────────────────────────────────────────────────────────
// Each entry describes how to build one .brbmod file.
const MODULE_DEFS = [
  {
    outFile: 'KJV.brbmod',
    sourcePath: path.join(DATA_DIR, 'kjv.json'),
    meta: {
      name:         'King James Version',
      abbreviation: 'KJV',
      language:     'en',
      format:       'tagged',
      version:      1,
      copyright:    'Public domain',
      notes:        'KJV with per-word Strong\'s concordance numbers tagged.',
    },
  },
  {
    outFile: 'ASV.brbmod',
    sourcePath: path.join(DATA_DIR, 'asv.json'),
    meta: {
      name:         'American Standard Version',
      abbreviation: 'ASV',
      language:     'en',
      format:       'tagged',
      version:      1,
      copyright:    'Public domain',
      notes:        'ASV with per-word Strong\'s concordance numbers tagged.',
    },
  },
  {
    outFile:    'RstStrong.brbmod',
    sourcePath: null, // resolved at runtime
    meta: {
      name:         'Russian Synodal Translation (Strong\'s)',
      abbreviation: 'RST',
      language:     'ru',
      format:       'tagged',
      version:      1,
      copyright:    'Public domain',
      notes:        'Russian Synodal Translation with per-word Hebrew/Greek Strong\'s numbers.',
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Validates that bible data is an array of book objects with the expected shape.
 * Returns { valid: boolean, error?: string, bookCount: number }.
 */
function validateBibleData(data, label) {
  if (!Array.isArray(data)) {
    return { valid: false, error: `${label}: root must be an array of books` };
  }
  for (let bi = 0; bi < data.length; bi++) {
    const book = data[bi];
    if (typeof book.name !== 'string') {
      return { valid: false, error: `${label}: book[${bi}] missing "name"` };
    }
    if (!Array.isArray(book.chapters)) {
      return { valid: false, error: `${label}: book[${bi}] missing "chapters" array` };
    }
  }
  return { valid: true, bookCount: data.length };
}

/**
 * Strips any extra top-level fields from each book object,
 * keeping only "name" and "chapters" (the app only needs these).
 * For RST data the source also has "englishName" — we move it to
 * a "nameEn" field so the importer can optionally display it.
 */
function normalizeBooks(data) {
  return data.map(book => {
    const out = {
      name:     book.name,
      chapters: book.chapters,
    };
    // Preserve English name if present (RST source uses "englishName")
    if (typeof book.englishName === 'string') {
      out.nameEn = book.englishName;
    }
    return out;
  });
}

/**
 * Builds a complete .brbmod object from meta + bible data array.
 */
function buildModule(meta, bibleData) {
  return {
    meta,
    data: normalizeBooks(bibleData),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  console.log('BibleReader module builder');
  console.log('Output directory:', MODULES_DIR);
  console.log('');

  // Ensure modules output directory exists
  if (!fs.existsSync(MODULES_DIR)) {
    fs.mkdirSync(MODULES_DIR, { recursive: true });
    console.log('Created modules/ directory');
  }

  // Resolve RST source path
  const rstPath = resolveRstPath();
  if (!rstPath) {
    console.warn('WARNING: Could not find rst_strong.json — RstStrong.brbmod will be skipped.');
    console.warn('  Set RST_SOURCE=/path/to/rst_strong.json to override.');
  }

  let anyError = false;

  for (const def of MODULE_DEFS) {
    const sourcePath = def.sourcePath || rstPath;
    const outPath    = path.join(MODULES_DIR, def.outFile);

    console.log(`Building ${def.outFile}...`);

    // Skip if source unavailable
    if (!sourcePath) {
      console.log(`  SKIP — no source file found`);
      console.log('');
      continue;
    }

    if (!fs.existsSync(sourcePath)) {
      console.error(`  ERROR — source not found: ${sourcePath}`);
      anyError = true;
      console.log('');
      continue;
    }

    // Read + parse source
    console.log(`  Reading: ${sourcePath}`);
    let rawData;
    try {
      const fileContent = fs.readFileSync(sourcePath, 'utf8');
      rawData = JSON.parse(fileContent);
    } catch (err) {
      console.error(`  ERROR — failed to read/parse: ${err.message}`);
      anyError = true;
      console.log('');
      continue;
    }

    // Validate structure
    const validation = validateBibleData(rawData, def.outFile);
    if (!validation.valid) {
      console.error(`  ERROR — validation failed: ${validation.error}`);
      anyError = true;
      console.log('');
      continue;
    }
    console.log(`  Validated: ${validation.bookCount} books`);

    // Build module object
    const moduleObj = buildModule(def.meta, rawData);

    // Serialize — use 2-space indent for readability; for production
    // you could omit the indent for a smaller file.
    const serialized = JSON.stringify(moduleObj, null, 2);
    const sizeKB = (Buffer.byteLength(serialized, 'utf8') / 1024).toFixed(1);

    // Write output
    try {
      fs.writeFileSync(outPath, serialized, 'utf8');
    } catch (err) {
      console.error(`  ERROR — failed to write: ${err.message}`);
      anyError = true;
      console.log('');
      continue;
    }

    console.log(`  Written: ${outPath} (${sizeKB} KB)`);
    console.log('');
  }

  if (anyError) {
    console.error('Build completed with errors.');
    process.exit(1);
  } else {
    console.log('All modules built successfully.');
  }
}

main();
