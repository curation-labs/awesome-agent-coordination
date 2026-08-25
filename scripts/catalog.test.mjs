// ABOUTME: Tests the generalized resource catalog contract and validation behavior.
// ABOUTME: Covers supported resource types, controlled vocabularies, uniqueness, and attribution.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  RESOURCE_TYPES,
  THEMES,
  TECHNIQUES,
  validateCatalog,
  assertValidCatalog,
} from './catalog.mjs'

const validEntry = (overrides = {}) => ({
  id: 'paper:example-coordination',
  type: 'paper',
  title: 'An Example Coordination Paper',
  url: 'https://example.org/papers/coordination',
  authors: ['Ada Researcher'],
  organizations: [],
  publishedAt: '2025-03-17',
  summary: 'Introduces a concrete mechanism for coordinating specialized agents.',
  whyNotable: 'Provides a controlled comparison against a matched single-agent baseline.',
  primaryTheme: 'architectures',
  themes: ['architectures', 'evaluation'],
  techniques: ['supervisor-worker', 'matched-compute-evaluation'],
  evidence: {
    status: 'peer-reviewed',
    maturity: 'evaluated',
    limitations: 'Evaluation is limited to two synthetic reasoning environments.',
  },
  artifacts: [
    { kind: 'code', url: 'https://github.com/example/coordination' },
  ],
  lifecycle: { status: 'active' },
  curation: {
    tier: 'essential',
    addedAt: '2026-08-25',
    lastReviewedAt: '2026-08-25',
  },
  ...overrides,
})

test('accepts a valid generalized catalog entry', () => {
  assert.deepEqual(validateCatalog([validEntry()]), [])
  assert.doesNotThrow(() => assertValidCatalog([validEntry()]))
})

test('supports literature, implementation, protocol, benchmark, workspace, and talk resource types', () => {
  const expected = [
    'paper',
    'survey',
    'specification',
    'benchmark',
    'framework',
    'tool',
    'repository',
    'engineering-report',
    'experimental-workspace',
    'talk',
  ]
  assert.deepEqual(RESOURCE_TYPES, expected)
})

test('defines problem-oriented themes and coordination technique tags', () => {
  assert.deepEqual(Object.keys(THEMES), [
    'foundations',
    'architectures',
    'allocation',
    'communication',
    'state',
    'verification',
    'governance',
    'evaluation',
  ])
  assert.ok(TECHNIQUES.includes('contract-net'))
  assert.ok(TECHNIQUES.includes('supervisor-worker'))
  assert.ok(TECHNIQUES.includes('durable-execution'))
  assert.ok(TECHNIQUES.includes('matched-compute-evaluation'))
})

test('rejects duplicate stable identifiers and canonical URLs', () => {
  const errors = validateCatalog([
    validEntry(),
    validEntry({ title: 'Duplicate', authors: ['Second Author'] }),
  ])
  assert.ok(errors.some((error) => error.includes('duplicate id')))
  assert.ok(errors.some((error) => error.includes('duplicate url')))
})

test('rejects unknown controlled vocabulary values', () => {
  const errors = validateCatalog([
    validEntry({
      type: 'product',
      primaryTheme: 'swarming',
      themes: ['swarming'],
      techniques: ['magic-collaboration'],
      evidence: {
        status: 'viral',
        maturity: 'perfect',
        limitations: 'None claimed, which is itself not an acceptable limitation.',
      },
      lifecycle: { status: 'trending' },
      curation: {
        tier: 'popular',
        addedAt: '2026-08-25',
        lastReviewedAt: '2026-08-25',
      },
    }),
  ])
  for (const field of [
    'type',
    'primaryTheme',
    'themes[0]',
    'techniques[0]',
    'evidence.status',
    'evidence.maturity',
    'lifecycle.status',
    'curation.tier',
  ]) {
    assert.ok(errors.some((error) => error.includes(field)), `missing error for ${field}`)
  }
})

test('requires creator attribution and primary theme membership', () => {
  const errors = validateCatalog([
    validEntry({
      authors: [],
      organizations: [],
      primaryTheme: 'architectures',
      themes: ['evaluation'],
    }),
  ])
  assert.ok(errors.some((error) => error.includes('authors or organizations')))
  assert.ok(errors.some((error) => error.includes('primaryTheme must appear in themes')))
})

test('rejects invalid identifiers, URLs, dates, and empty explanatory fields', () => {
  const errors = validateCatalog([
    validEntry({
      id: 'Bad ID',
      url: 'not a URL',
      publishedAt: '2025-02-31',
      summary: '',
      whyNotable: 'short',
      evidence: {
        status: 'peer-reviewed',
        maturity: 'evaluated',
        limitations: '',
      },
    }),
  ])
  for (const field of ['id', 'url', 'publishedAt', 'summary', 'whyNotable', 'evidence.limitations']) {
    assert.ok(errors.some((error) => error.includes(field)), `missing error for ${field}`)
  }
})

test('requires media metadata for talks', () => {
  const errors = validateCatalog([
    validEntry({
      id: 'talk:example',
      type: 'talk',
      url: 'https://www.youtube.com/watch?v=example',
    }),
  ])
  assert.ok(errors.some((error) => error.includes('media')))

  const validTalk = validEntry({
    id: 'talk:example',
    type: 'talk',
    url: 'https://www.youtube.com/watch?v=example',
    media: { channel: 'Example Channel', durationSeconds: 600, videoId: 'example' },
  })
  assert.deepEqual(validateCatalog([validTalk]), [])
})

test('rejects malformed catalogs with a readable aggregate error', () => {
  assert.throws(
    () => assertValidCatalog({ entries: [] }),
    /Catalog validation failed.*catalog must be an array/s,
  )
})

test('rejects unexpected top-level and nested properties', () => {
  const errors = validateCatalog([
    validEntry({
      popularity: 100,
      evidence: {
        status: 'peer-reviewed',
        maturity: 'evaluated',
        limitations: 'Evaluation is limited to two synthetic reasoning environments.',
        marketingClaim: 'best',
      },
    }),
  ])
  assert.ok(errors.some((error) => error.includes('popularity is not allowed')))
  assert.ok(errors.some((error) => error.includes('evidence.marketingClaim is not allowed')))
})

test('requires superseded entries to name a successor that exists in the catalog', () => {
  const errors = validateCatalog([
    validEntry({ lifecycle: { status: 'superseded' } }),
  ])
  assert.ok(errors.some((error) => error.includes('superseded entries require successorId')))

  const missing = validateCatalog([
    validEntry({ lifecycle: { status: 'maintenance', successorId: 'framework:missing' } }),
  ])
  assert.ok(errors.length > 0)
  assert.ok(missing.some((error) => error.includes('successorId does not reference a catalog entry')))
})

test('matches JSON Schema behavior for duplicate artifacts and supplied media', () => {
  const artifact = { kind: 'code', url: 'https://github.com/example/coordination' }
  const duplicateArtifacts = validateCatalog([
    validEntry({ artifacts: [artifact, { url: artifact.url, kind: artifact.kind }] }),
  ])
  assert.ok(duplicateArtifacts.some((error) => error.includes('artifacts must not contain duplicates')))

  const malformedMedia = validateCatalog([
    validEntry({ media: 'not an object' }),
  ])
  assert.ok(malformedMedia.some((error) => error.includes('media must be an object')))
})

test('deduplicates canonical URL equivalents', () => {
  const pairs = [
    ['https://example.org/resource', 'https://example.org/resource/'],
    ['https://example.org/resource', 'https://EXAMPLE.org/resource#section'],
    ['https://www.youtube.com/watch?v=abc123', 'https://youtu.be/abc123'],
  ]
  for (const [first, second] of pairs) {
    const errors = validateCatalog([
      validEntry({ id: 'paper:first', url: first }),
      validEntry({ id: 'paper:second', url: second }),
    ])
    assert.ok(
      errors.some((error) => error.includes('duplicate canonical url')),
      `expected canonical duplicate for ${first} and ${second}`,
    )
  }
})
