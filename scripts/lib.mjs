// ABOUTME: Renders the validated catalog as problem-oriented README sections.
// ABOUTME: Adds technique syntheses, evidence metadata, stable ordering, and managed-block replacement.

import { THEMES, assertValidCatalog } from './catalog.mjs'

export const START = '<!-- CATALOG:START -->'
export const END = '<!-- CATALOG:END -->'

export const THEME_GUIDES = Object.freeze({
  foundations: {
    synthesis: 'Coordination starts with explicit models of shared goals, partial information, task allocation, communication, and joint decision-making.',
    caveat: 'Classical formalisms provide precise vocabulary, but their structured assumptions rarely transfer unchanged to open-ended language agents.',
  },
  architectures: {
    synthesis: 'Useful control patterns include independent ensembles, supervisor-worker teams, peer handoffs, hierarchies, graph workflows, and hybrid organizations.',
    caveat: 'No topology is universally best: architecture must match task decomposability, verification needs, tool pressure, and agent capability.',
  },
  allocation: {
    synthesis: 'Decomposition and delegation turn a goal into owned work through plans, routing, capability matching, bidding, or dynamic team formation.',
    caveat: 'Delegation adds value only when subtasks are sufficiently independent and the orchestrator preserves dependencies, context, and responsibility.',
  },
  communication: {
    synthesis: 'Agents coordinate through messages, shared artifacts, capability discovery, communication graphs, and protocols such as FIPA ACL, A2A, and MCP.',
    caveat: 'More communication can increase cost, consensus pressure, and error propagation without improving distributed reasoning or interoperability semantics.',
  },
  state: {
    synthesis: 'Reliable teams externalize progress into typed artifacts, shared state, checkpoints, provenance, and durable workflow history instead of relying on conversational recall.',
    caveat: 'Shared memory introduces ordinary distributed-systems problems: consistency, ownership, idempotency, conflict resolution, privacy, and recovery.',
  },
  verification: {
    synthesis: 'Verification loops, explicit stop conditions, replanning, approvals, and independent reviewers contain compounding errors and support recovery.',
    caveat: 'A verifier powered by the same correlated model family can reproduce the team’s mistakes, so process metrics and external checks remain necessary.',
  },
  governance: {
    synthesis: 'Coordination changes incentives and authority: systems need identity, least privilege, negotiation rules, audit trails, anti-collusion measures, and commit-time controls.',
    caveat: 'Individually aligned agents can still miscoordinate, conflict, collude, or amplify attacks when deployed as an interacting population.',
  },
  evaluation: {
    synthesis: 'Credible evaluation measures outcome, coordination process, token and message cost, latency, variance, failure attribution, and matched-compute single-agent baselines.',
    caveat: 'Agent count is test-time compute, not free capability; recent evidence shows large gains on decomposable work and severe losses on sequential tasks.',
  },
})

const IMPLEMENTATION_TYPES = new Set([
  'framework',
  'tool',
  'repository',
  'experimental-workspace',
])

const TIER_ORDER = Object.freeze({ essential: 0, strong: 1, watch: 2 })

const LABELS = Object.freeze({
  'peer-reviewed': 'Peer reviewed',
  preprint: 'Preprint',
  'official-specification': 'Official specification',
  'official-engineering': 'Official engineering',
  'primary-source-talk': 'Primary source talk',
  'historical-standard': 'Historical standard',
  documentation: 'Documentation',
})

const ARTIFACT_LABELS = Object.freeze({
  code: 'Code',
  data: 'Data',
  documentation: 'Docs',
  specification: 'Spec',
  'project-page': 'Project',
  video: 'Video',
})

const titleCase = (value) =>
  String(value)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const escapeMarkdown = (value) =>
  String(value).replace(/([\\`*_[\]<>])/g, '\\$1')

const creators = (entry) => {
  const values = entry.authors.length > 0 ? entry.authors : entry.organizations
  if (values.length <= 3) return values.join(', ')
  return `${values.slice(0, 3).join(', ')}, et al.`
}

const compareEntries = (left, right) => {
  const tier = TIER_ORDER[left.curation.tier] - TIER_ORDER[right.curation.tier]
  if (tier !== 0) return tier
  const date = right.publishedAt.localeCompare(left.publishedAt)
  if (date !== 0) return date
  return left.title.localeCompare(right.title)
}

const renderEntry = (entry) => {
  const type = titleCase(entry.type)
  const tier = titleCase(entry.curation.tier)
  const evidence = LABELS[entry.evidence.status] || titleCase(entry.evidence.status)
  const maturity = titleCase(entry.evidence.maturity)
  const creator = escapeMarkdown(creators(entry))
  const year = entry.publishedAt.slice(0, 4)
  const meta = [creator, year, evidence, maturity].filter(Boolean).join(' · ')
  const secondaryThemes = entry.themes.filter((theme) => theme !== entry.primaryTheme)
  const tags = [...entry.techniques, ...secondaryThemes.map((theme) => `theme:${theme}`)]
    .map((tag) => `\`${escapeMarkdown(tag)}\``)
    .join(' ')
  const artifactLinks = [...new Map(
    entry.artifacts
      .filter((artifact) => artifact.url !== entry.url)
      .map((artifact) => [artifact.url, artifact]),
  ).values()]
    .map((artifact) => `[${ARTIFACT_LABELS[artifact.kind]}](${artifact.url})`)
    .join(' · ')

  return [
    `- \`${type}\` \`${tier}\` **[${escapeMarkdown(entry.title)}](${entry.url})** — ${meta}`,
    `  ${escapeMarkdown(entry.summary)} **Why it matters:** ${escapeMarkdown(entry.whyNotable)}`,
    `  _Limitation: ${escapeMarkdown(entry.evidence.limitations)}_ ${tags}`,
    artifactLinks ? `  ${artifactLinks}` : null,
  ].join('\n')
}

const renderGroup = (title, entries) => {
  if (entries.length === 0) return null
  return `### ${title}\n\n${entries.sort(compareEntries).map(renderEntry).join('\n\n')}`
}

const renderTheme = (theme, entries) => {
  const guide = THEME_GUIDES[theme]
  const evidence = entries.filter((entry) => !IMPLEMENTATION_TYPES.has(entry.type))
  const implementations = entries.filter((entry) => IMPLEMENTATION_TYPES.has(entry.type))
  const groups = [
    renderGroup('Literature, standards, and evidence', evidence),
    renderGroup('Tools, frameworks, and workspaces', implementations),
  ].filter(Boolean)

  return [
    `## ${THEMES[theme]}`,
    '',
    `**Technique lens:** ${guide.synthesis}`,
    '',
    `**Current caveat:** ${guide.caveat}`,
    '',
    groups.join('\n\n'),
  ].join('\n')
}

export const renderCatalogBlock = (catalog) => {
  assertValidCatalog(catalog)
  const sections = Object.keys(THEMES)
    .map((theme) => {
      const entries = catalog.filter((entry) => entry.primaryTheme === theme)
      return entries.length > 0 ? renderTheme(theme, entries) : null
    })
    .filter(Boolean)
  const body = sections.length > 0 ? sections.join('\n\n') : '_No resources curated yet._'
  return `${START}\n\n${body}\n\n${END}`
}

export const replaceManagedBlock = (readme, block) => {
  const start = readme.indexOf(START)
  const end = readme.indexOf(END)
  if (start !== -1 && end !== -1 && end > start) {
    const before = readme.slice(0, start)
    const after = readme.slice(end + END.length)
    return `${before}${block}${after}`
  }
  const separator = readme.endsWith('\n') ? '\n' : '\n\n'
  return `${readme}${separator}${block}\n`
}
