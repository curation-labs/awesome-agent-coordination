// ABOUTME: Validates the real seed catalog as a balanced, problem-oriented anchor corpus.
// ABOUTME: Guards catalog size, theme coverage, and representation of evidence and implementations.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { RESOURCE_TYPES, THEMES, assertValidCatalog } from './catalog.mjs'

const catalog = JSON.parse(
  await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'),
)

test('real catalog satisfies the executable contract', () => {
  assert.doesNotThrow(() => assertValidCatalog(catalog))
})

test('seed corpus stays within the intended anchor range', () => {
  assert.ok(catalog.length >= 20, `expected at least 20 entries, got ${catalog.length}`)
  assert.ok(catalog.length <= 30, `expected at most 30 entries, got ${catalog.length}`)
})

test('seed corpus represents every coordination problem', () => {
  const represented = new Set(catalog.map((entry) => entry.primaryTheme))
  assert.deepEqual([...represented].sort(), Object.keys(THEMES).sort())
})

test('seed corpus connects evidence to implementations and workspaces', () => {
  const represented = new Set(catalog.map((entry) => entry.type))
  for (const type of [
    'paper',
    'specification',
    'benchmark',
    'framework',
    'engineering-report',
    'experimental-workspace',
    'talk',
  ]) {
    assert.ok(represented.has(type), `seed catalog should include ${type}`)
  }
  assert.ok(RESOURCE_TYPES.every((type) => typeof type === 'string'))
})

