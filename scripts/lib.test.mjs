// ABOUTME: Tests the problem-oriented README catalog renderer and managed block replacement.
// ABOUTME: Verifies synthesis, grouping, placement, escaping, ordering, and idempotency.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  START,
  END,
  THEME_GUIDES,
  renderCatalogBlock,
  replaceManagedBlock,
} from './lib.mjs'

const entry = (overrides = {}) => ({
  id: 'paper:architecture',
  type: 'paper',
  title: 'Coordination Architecture',
  url: 'https://example.org/architecture',
  authors: ['Ada Researcher'],
  organizations: [],
  publishedAt: '2025-03-17',
  summary: 'Compares explicit coordination architectures under controlled conditions.',
  whyNotable: 'Shows when centralized verification contains errors better than peer discussion.',
  primaryTheme: 'architectures',
  themes: ['architectures', 'evaluation'],
  techniques: ['supervisor-worker', 'matched-compute-evaluation'],
  evidence: {
    status: 'peer-reviewed',
    maturity: 'evaluated',
    limitations: 'Results cover a bounded set of synthetic environments and models.',
  },
  artifacts: [],
  lifecycle: { status: 'active' },
  curation: {
    tier: 'essential',
    addedAt: '2026-08-25',
    lastReviewedAt: '2026-08-25',
  },
  ...overrides,
})

const entries = [
  entry(),
  entry({
    id: 'framework:graph',
    type: 'framework',
    title: 'Graph Framework',
    url: 'https://example.org/graph',
    authors: [],
    organizations: ['Example Project'],
    publishedAt: '2026-04-02',
    primaryTheme: 'architectures',
    themes: ['architectures', 'state'],
    techniques: ['graph-workflow', 'durable-execution'],
    summary: 'Implements explicit graph workflows, state transitions, and checkpoints.',
    whyNotable: 'Makes coordination control flow and persisted state directly inspectable.',
    evidence: {
      status: 'documentation',
      maturity: 'implemented',
      limitations: 'Framework primitives do not select the correct workflow for a task.',
    },
    curation: {
      tier: 'strong',
      addedAt: '2026-08-25',
      lastReviewedAt: '2026-08-25',
    },
  }),
]

test('renders a managed catalog block organized by coordination problem', () => {
  const block = renderCatalogBlock(entries)
  assert.ok(block.startsWith(START))
  assert.ok(block.trimEnd().endsWith(END))
  assert.ok(block.includes('## Architectures and control topology'))
  assert.ok(block.includes(THEME_GUIDES.architectures.synthesis))
  assert.ok(block.includes(THEME_GUIDES.architectures.caveat))
})

test('separates literature and evidence from tools, frameworks, and workspaces', () => {
  const block = renderCatalogBlock(entries)
  assert.ok(block.includes('### Literature, standards, and evidence'))
  assert.ok(block.includes('### Tools, frameworks, and workspaces'))
  assert.ok(block.indexOf('Coordination Architecture') < block.indexOf('Graph Framework'))
})

test('renders visible type, tier, evidence, maturity, and limitation metadata', () => {
  const block = renderCatalogBlock(entries)
  assert.ok(block.includes('`Paper` `Essential`'))
  assert.ok(block.includes('Peer reviewed · Evaluated'))
  assert.ok(block.includes('**Why it matters:** Shows when centralized verification'))
  assert.ok(block.includes('_Limitation: Results cover a bounded set'))
})

test('surfaces linked repositories and supporting artifacts without duplicating the canonical URL', () => {
  const block = renderCatalogBlock([
    entry({
      artifacts: [
        { kind: 'code', url: 'https://github.com/example/coordination' },
        { kind: 'data', url: 'https://example.org/coordination-data' },
        { kind: 'project-page', url: 'https://example.org/architecture' },
      ],
    }),
  ])
  assert.ok(block.includes('[Code](https://github.com/example/coordination)'))
  assert.ok(block.includes('[Data](https://example.org/coordination-data)'))
  assert.equal(block.split('https://example.org/architecture').length - 1, 1)
})

test('places each resource exactly once using its primary theme', () => {
  const block = renderCatalogBlock(entries)
  assert.equal(block.split('https://example.org/architecture').length - 1, 1)
  assert.equal(block.split('https://example.org/graph').length - 1, 1)
})

test('escapes Markdown metacharacters in catalog prose', () => {
  const block = renderCatalogBlock([
    entry({
      title: 'Talking [protocols] *safely*',
      summary: 'Coordinates agents with [typed] messages and *bounded* shared state.',
    }),
  ])
  assert.ok(block.includes('Talking \\[protocols\\] \\*safely\\*'))
  assert.ok(block.includes('with \\[typed\\] messages and \\*bounded\\*'))
})

test('sorts by curation tier, then publication date, then title', () => {
  const block = renderCatalogBlock([
    entry({ id: 'paper:watch', title: 'Watch New', url: 'https://example.org/watch', curation: { tier: 'watch', addedAt: '2026-08-25', lastReviewedAt: '2026-08-25' }, publishedAt: '2026-01-01' }),
    entry({ id: 'paper:strong', title: 'Strong New', url: 'https://example.org/strong', curation: { tier: 'strong', addedAt: '2026-08-25', lastReviewedAt: '2026-08-25' }, publishedAt: '2026-06-01' }),
    entry({ id: 'paper:essential-old', title: 'Essential Old', url: 'https://example.org/essential-old', publishedAt: '2020-01-01' }),
    entry({ id: 'paper:essential-new', title: 'Essential New', url: 'https://example.org/essential-new', publishedAt: '2026-01-01' }),
  ])
  assert.ok(block.indexOf('Essential New') < block.indexOf('Essential Old'))
  assert.ok(block.indexOf('Essential Old') < block.indexOf('Strong New'))
  assert.ok(block.indexOf('Strong New') < block.indexOf('Watch New'))
})

test('replaceManagedBlock appends markers when absent', () => {
  const readme = '# Title\n\nIntro text.\n'
  const out = replaceManagedBlock(readme, renderCatalogBlock(entries))
  assert.ok(out.includes(START))
  assert.ok(out.includes('Intro text.'))
})

test('replaceManagedBlock is idempotent and preserves outside content', () => {
  const readme = `# Title\n\nIntro.\n\n${START}\nstale\n${END}\n\n## Footer\n`
  const once = replaceManagedBlock(readme, renderCatalogBlock(entries))
  const twice = replaceManagedBlock(once, renderCatalogBlock(entries))
  assert.equal(once, twice)
  assert.ok(once.includes('Intro.'))
  assert.ok(once.includes('## Footer'))
  assert.ok(!once.includes('stale'))
  assert.equal(once.split(START).length - 1, 1)
})
