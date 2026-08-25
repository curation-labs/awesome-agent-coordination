// ABOUTME: Converts a fetched transcript into a validated generalized catalog record.
// ABOUTME: Requires exact model JSON, preserves existing catalog data, and writes atomically.

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { THEMES, TECHNIQUES } from './catalog.mjs'
import {
  parseCuratedTalkOutput,
  buildTalkEntry,
  mergeCatalogEntry,
  readCatalog,
  writeCatalogAtomic,
  assertCommandAvailable,
} from './ingest.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalogPath = join(root, 'data', 'catalog.json')

const args = process.argv.slice(2)
const folder = args[0]
const publishedAtIndex = args.indexOf('--published-at')
const publishedAt = publishedAtIndex === -1 ? undefined : args[publishedAtIndex + 1]
if (!folder) {
  console.error('Usage: node scripts/enrich.mjs <transcript-folder> --published-at YYYY-MM-DD')
  process.exit(1)
}

const meta = JSON.parse(await readFile(join(folder, 'meta.json'), 'utf8'))
const transcript = await readFile(join(folder, 'transcript.txt'), 'utf8')
if (transcript.trim() === '') {
  console.error(`Transcript is empty: ${join(folder, 'transcript.txt')}`)
  process.exit(1)
}

const requiredKeys = [
  'summary',
  'whyNotable',
  'primaryTheme',
  'themes',
  'techniques',
  'limitations',
]
const prompt = [
  'Curate this talk for an evidence-backed repository about AI-agent coordination.',
  'Return one JSON object only: no markdown fence, commentary, or extra keys.',
  `Use exactly these keys: ${requiredKeys.join(', ')}.`,
  'summary: neutral, 20-240 characters, describing the coordination content.',
  'whyNotable: 20-320 characters, stating its distinctive contribution.',
  `primaryTheme: exactly one of ${Object.keys(THEMES).join(', ')}.`,
  'themes: nonempty array from that same theme vocabulary and including primaryTheme.',
  `techniques: nonempty array chosen from ${TECHNIQUES.join(', ')}.`,
  'limitations: at least 20 characters and explicit about evidence or scope.',
].join('\n')

try {
  assertCommandAvailable('claude')
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

const result = spawnSync('claude', ['-p', prompt], {
  input: transcript,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})
if (result.status !== 0) {
  console.error(result.stderr || 'claude -p failed')
  process.exit(result.status || 1)
}

let curated
try {
  curated = parseCuratedTalkOutput(result.stdout)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

const addedAt = new Date().toISOString().slice(0, 10)
let entry
try {
  entry = buildTalkEntry(meta, curated, { publishedAt, addedAt })
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

const catalog = await readCatalog(catalogPath)
const next = mergeCatalogEntry(catalog, entry)
await writeCatalogAtomic(catalogPath, next)
console.log(`Curated: ${entry.title} → ${THEMES[entry.primaryTheme]}`)
