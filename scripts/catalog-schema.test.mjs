// ABOUTME: Ensures the published JSON Schema stays aligned with executable catalog validation.
// ABOUTME: Protects resource, theme, technique, evidence, maturity, lifecycle, and tier vocabularies.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  RESOURCE_TYPES,
  THEMES,
  TECHNIQUES,
  EVIDENCE_STATUSES,
  MATURITY_LEVELS,
  LIFECYCLE_STATUSES,
  CURATION_TIERS,
  ARTIFACT_KINDS,
} from './catalog.mjs'

const schema = JSON.parse(
  await readFile(new URL('../data/catalog.schema.json', import.meta.url), 'utf8'),
)
const properties = schema.items.properties

test('JSON Schema publishes the executable controlled vocabularies', () => {
  assert.deepEqual(properties.type.enum, RESOURCE_TYPES)
  assert.deepEqual(properties.primaryTheme.enum, Object.keys(THEMES))
  assert.deepEqual(properties.themes.items.enum, Object.keys(THEMES))
  assert.deepEqual(properties.techniques.items.enum, TECHNIQUES)
  assert.deepEqual(properties.evidence.properties.status.enum, EVIDENCE_STATUSES)
  assert.deepEqual(properties.evidence.properties.maturity.enum, MATURITY_LEVELS)
  assert.deepEqual(properties.lifecycle.properties.status.enum, LIFECYCLE_STATUSES)
  assert.deepEqual(properties.curation.properties.tier.enum, CURATION_TIERS)
  assert.deepEqual(properties.artifacts.items.properties.kind.enum, ARTIFACT_KINDS)
})

test('JSON Schema requires the fields needed for an evidence-backed entry', () => {
  assert.deepEqual(schema.required, undefined)
  for (const field of [
    'id',
    'type',
    'title',
    'url',
    'authors',
    'organizations',
    'publishedAt',
    'summary',
    'whyNotable',
    'primaryTheme',
    'themes',
    'techniques',
    'evidence',
    'artifacts',
    'lifecycle',
    'curation',
  ]) {
    assert.ok(schema.items.required.includes(field), `schema should require ${field}`)
  }
})

test('JSON Schema conditionally requires media metadata for talks', () => {
  const talkRule = schema.items.allOf.find(
    (rule) => rule.if?.properties?.type?.const === 'talk',
  )
  assert.ok(talkRule)
  assert.ok(talkRule.then.required.includes('media'))
})
