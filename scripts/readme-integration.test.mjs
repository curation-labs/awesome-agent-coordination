// ABOUTME: Verifies README is an exact, single managed projection of the real catalog.
// ABOUTME: Prevents legacy transcript markers, duplicate entries, and generated-content drift.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { START, END, renderCatalogBlock, replaceManagedBlock } from './lib.mjs'

const root = new URL('../', import.meta.url)
const catalog = JSON.parse(await readFile(new URL('data/catalog.json', root), 'utf8'))
const readme = await readFile(new URL('README.md', root), 'utf8')

test('README contains one catalog block and no legacy transcript block', () => {
  assert.equal(readme.split(START).length - 1, 1)
  assert.equal(readme.split(END).length - 1, 1)
  assert.ok(!readme.includes('<!-- TRANSCRIPTS:START -->'))
  assert.ok(!readme.includes('<!-- TRANSCRIPTS:END -->'))
})

test('README generated catalog block is current', () => {
  const expected = replaceManagedBlock(readme, renderCatalogBlock(catalog))
  assert.equal(readme, expected)
})

test('README renders every canonical resource exactly once', () => {
  // Only the managed block is the catalog projection; prose outside it may cite a resource again.
  const block = readme.slice(readme.indexOf(START), readme.indexOf(END))
  for (const entry of catalog) {
    assert.equal(
      block.split(`](${entry.url})`).length - 1,
      1,
      `${entry.id} should appear once`,
    )
  }
})

