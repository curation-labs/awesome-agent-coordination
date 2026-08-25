// ABOUTME: Tests catalog freshness policy and link-check classification.
// ABOUTME: Keeps scheduled maintenance actionable without failing on transient access blocks.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  REVIEW_WINDOWS_DAYS,
  findStaleEntries,
  collectCatalogUrls,
  classifyLinkStatus,
  checkUrls,
} from './maintenance.mjs'

const catalogEntry = (overrides = {}) => ({
  id: 'paper:example',
  url: 'https://example.org/paper',
  artifacts: [
    { kind: 'code', url: 'https://github.com/example/project' },
    { kind: 'documentation', url: 'https://example.org/paper' },
  ],
  curation: {
    tier: 'essential',
    lastReviewedAt: '2026-01-01',
  },
  ...overrides,
})

test('uses shorter review windows for Watch and bounded windows for stronger tiers', () => {
  assert.deepEqual(REVIEW_WINDOWS_DAYS, {
    essential: 180,
    strong: 270,
    watch: 120,
  })
})

test('reports entries stale only after their tier review window', () => {
  const entries = [
    catalogEntry(),
    catalogEntry({
      id: 'paper:strong',
      url: 'https://example.org/strong',
      curation: { tier: 'strong', lastReviewedAt: '2025-12-01' },
    }),
    catalogEntry({
      id: 'paper:watch',
      url: 'https://example.org/watch',
      curation: { tier: 'watch', lastReviewedAt: '2026-04-20' },
    }),
  ]
  const stale = findStaleEntries(entries, new Date('2026-08-25T00:00:00Z'))
  assert.deepEqual(stale.map((entry) => entry.id), ['paper:example', 'paper:watch'])
  assert.equal(stale[0].daysSinceReview, 236)
  assert.equal(stale[0].reviewWindowDays, 180)
})

test('collects unique canonical and artifact URLs', () => {
  assert.deepEqual(collectCatalogUrls([catalogEntry()]), [
    'https://example.org/paper',
    'https://github.com/example/project',
  ])
})

test('classifies permanent failures separately from transient or blocked responses', () => {
  for (const status of [200, 204, 301, 308]) assert.equal(classifyLinkStatus(status), 'ok')
  for (const status of [400, 404, 410]) assert.equal(classifyLinkStatus(status), 'broken')
  for (const status of [401, 403, 429, 500, 503, 0]) assert.equal(classifyLinkStatus(status), 'warning')
})

test('checks URLs with injected fetch and preserves per-URL outcomes', async () => {
  const responses = new Map([
    ['https://example.org/ok', 200],
    ['https://example.org/missing', 404],
    ['https://example.org/blocked', 403],
  ])
  const fetchImpl = async (url) => ({ status: responses.get(url) })
  const results = await checkUrls([...responses.keys()], { fetchImpl, concurrency: 2 })
  assert.deepEqual(results, [
    { url: 'https://example.org/ok', status: 200, classification: 'ok' },
    { url: 'https://example.org/missing', status: 404, classification: 'broken' },
    { url: 'https://example.org/blocked', status: 403, classification: 'warning' },
  ])
})

test('turns fetch errors into warnings instead of hiding them', async () => {
  const results = await checkUrls(['https://example.org/offline'], {
    fetchImpl: async () => {
      throw new Error('network offline')
    },
  })
  assert.equal(results[0].classification, 'warning')
  assert.match(results[0].error, /network offline/)
})

