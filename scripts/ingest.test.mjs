// ABOUTME: Tests hardened transcript acquisition, model-output parsing, and catalog storage.
// ABOUTME: Covers no-index capture, duplicate discovery, validation, merge safety, and atomic writes.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  buildBgngArgs,
  findTranscriptFolder,
  parseCuratedTalkOutput,
  buildTalkEntry,
  mergeCatalogEntry,
  readCatalog,
  writeCatalogAtomic,
  assertCommandAvailable,
} from './ingest.mjs'

const meta = {
  videoId: 'abc123',
  url: 'https://www.youtube.com/watch?v=abc123',
  title: 'Agents Working Together',
  channel: 'Example Lab',
  duration: 600,
  processedAt: '2026-08-25T12:00:00Z',
}

const curated = {
  summary: 'Explains how specialized agents delegate and verify bounded pieces of work.',
  whyNotable: 'Provides a concrete case study with explicit state, ownership, and recovery artifacts.',
  primaryTheme: 'allocation',
  themes: ['allocation', 'verification'],
  techniques: ['task-decomposition', 'verification-loop'],
  limitations: 'The discussion is an expert talk rather than a controlled empirical comparison.',
}

test('bgng capture disables external indexing and keeps transcript output local', () => {
  assert.deepEqual(buildBgngArgs(meta.url), [
    'url',
    meta.url,
    '--into',
    './transcripts',
    '--lang',
    'en',
    '--no-index',
  ])
})

test('finds a newly saved transcript folder from bgng output', async () => {
  const root = await mkdtemp(join(tmpdir(), 'coord-ingest-'))
  const folder = join(root, 'transcripts', '2026-08-25', 'agents-abc123')
  await mkdir(folder, { recursive: true })
  const found = await findTranscriptFolder(
    root,
    meta.url,
    'Saved to transcripts/2026-08-25/agents-abc123\n',
  )
  assert.equal(found, folder)
})

test('finds an already captured transcript by canonical URL when bgng does not print a path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'coord-ingest-'))
  const folder = join(root, 'transcripts', '2026-08-20', 'agents-abc123')
  await mkdir(folder, { recursive: true })
  await writeFile(join(folder, 'meta.json'), JSON.stringify(meta))
  const found = await findTranscriptFolder(root, meta.url, 'Already in library; skipping.\n')
  assert.equal(found, folder)
})

test('rejects a saved transcript symlink that escapes the transcript root', async () => {
  const root = await mkdtemp(join(tmpdir(), 'coord-ingest-'))
  const transcripts = join(root, 'transcripts')
  const outside = await mkdtemp(join(tmpdir(), 'coord-outside-'))
  await mkdir(transcripts, { recursive: true })
  await symlink(outside, join(transcripts, 'escape'))
  await assert.rejects(
    () => findTranscriptFolder(root, meta.url, 'Saved to transcripts/escape\n'),
    /outside transcripts/,
  )
})

test('parses exact JSON-only curation output', () => {
  assert.deepEqual(parseCuratedTalkOutput(JSON.stringify(curated)), curated)
})

test('rejects fenced, trailing, missing, extra, or excessive curation output', () => {
  assert.throws(() => parseCuratedTalkOutput(`\`\`\`json\n${JSON.stringify(curated)}\n\`\`\``), /JSON object only/)
  assert.throws(() => parseCuratedTalkOutput(`${JSON.stringify(curated)}\nThanks`), /JSON object only/)
  assert.throws(() => parseCuratedTalkOutput(JSON.stringify({ ...curated, surprise: true })), /exactly these keys/)
  const { limitations, ...missing } = curated
  assert.throws(() => parseCuratedTalkOutput(JSON.stringify(missing)), /exactly these keys/)
  assert.throws(
    () => parseCuratedTalkOutput(JSON.stringify({ ...curated, summary: 'x'.repeat(241) })),
    /summary must be between 20 and 240 characters/,
  )
})

test('builds a fully validated talk record with distinct publication and addition dates', () => {
  const talk = buildTalkEntry(meta, curated, {
    publishedAt: '2026-08-20',
    addedAt: '2026-08-25',
  })
  assert.equal(talk.id, 'talk:youtube:abc123')
  assert.equal(talk.publishedAt, '2026-08-20')
  assert.equal(talk.curation.addedAt, '2026-08-25')
  assert.equal(talk.media.videoId, 'abc123')
  assert.equal(talk.evidence.status, 'primary-source-talk')
})

test('requires an explicit or source-provided publication date', () => {
  assert.throws(
    () => buildTalkEntry(meta, curated, { addedAt: '2026-08-25' }),
    /publication date is required/,
  )
  const sourceDated = buildTalkEntry(
    { ...meta, publishedAt: '2026-08-20' },
    curated,
    { addedAt: '2026-08-25' },
  )
  assert.equal(sourceDated.publishedAt, '2026-08-20')
})

test('updates an existing talk by URL or video ID while preserving stable identity and added date', () => {
  const existing = buildTalkEntry(meta, curated, {
    publishedAt: '2026-08-20',
    addedAt: '2026-08-21',
  })
  existing.id = 'talk:human-curated-id'
  const updated = buildTalkEntry(meta, { ...curated, summary: 'Updated summary with enough detail to remain valid for the public catalog.' }, {
    publishedAt: '2026-08-20',
    addedAt: '2026-08-25',
  })
  const merged = mergeCatalogEntry([existing], updated)
  assert.equal(merged.length, 1)
  assert.equal(merged[0].id, 'talk:human-curated-id')
  assert.equal(merged[0].curation.addedAt, '2026-08-21')
  assert.match(merged[0].summary, /Updated summary/)
})

test('malformed existing catalog fails closed instead of becoming an empty store', async () => {
  const root = await mkdtemp(join(tmpdir(), 'coord-ingest-'))
  const path = join(root, 'catalog.json')
  await writeFile(path, '{not json')
  await assert.rejects(() => readCatalog(path), /Could not parse catalog/)
  assert.equal(await readFile(path, 'utf8'), '{not json')
})

test('writes validated catalog JSON atomically', async () => {
  const root = await mkdtemp(join(tmpdir(), 'coord-ingest-'))
  const path = join(root, 'catalog.json')
  const talk = buildTalkEntry(meta, curated, {
    publishedAt: '2026-08-20',
    addedAt: '2026-08-25',
  })
  await writeCatalogAtomic(path, [talk])
  const stored = JSON.parse(await readFile(path, 'utf8'))
  assert.deepEqual(stored, [talk])
  await assert.rejects(() => writeCatalogAtomic(path, [{ broken: true }]), /Catalog validation failed/)
  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), [talk])
})

test('preflights required external commands with concise failures', () => {
  assert.doesNotThrow(() => assertCommandAvailable('bgng', () => ({ status: 0, stdout: '', stderr: '' })))
  assert.throws(
    () => assertCommandAvailable('bgng', () => ({ status: 1, stdout: '', stderr: 'missing module' })),
    /Required command "bgng" is unavailable or broken: missing module/,
  )
  assert.throws(
    () => assertCommandAvailable('bgng', () => ({ status: 1, stdout: '', stderr: 'missing module\nlong internal stack\nmore stack' })),
    /Required command "bgng" is unavailable or broken: missing module$/,
  )
  const missing = new Error('spawn bgng ENOENT')
  missing.code = 'ENOENT'
  assert.throws(
    () => assertCommandAvailable('bgng', () => ({ error: missing, status: null, stdout: '', stderr: '' })),
    /Required command "bgng" was not found on PATH/,
  )
})
