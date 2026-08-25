// ABOUTME: Defines the catalog vocabulary and dependency-free validation contract.
// ABOUTME: Fails closed on malformed, duplicate, unattributed, or uncontrolled resource records.

export const RESOURCE_TYPES = Object.freeze([
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
])

export const THEMES = Object.freeze({
  foundations: 'Foundations and formal models',
  architectures: 'Architectures and control topology',
  allocation: 'Task decomposition, allocation, and delegation',
  communication: 'Communication and interoperability',
  state: 'State, memory, and durable execution',
  verification: 'Verification, recovery, and human oversight',
  governance: 'Incentives, safety, and governance',
  evaluation: 'Evaluation, scaling, and economics',
})

export const TECHNIQUES = Object.freeze([
  'contract-net',
  'blackboard',
  'joint-intentions',
  'dec-pomdp',
  'centralized-training-decentralized-execution',
  'learned-communication',
  'role-specialization',
  'supervisor-worker',
  'peer-to-peer',
  'hierarchical-control',
  'graph-workflow',
  'dynamic-routing',
  'task-decomposition',
  'capability-delegation',
  'debate',
  'voting',
  'sparse-communication',
  'shared-artifacts',
  'shared-memory',
  'durable-execution',
  'verification-loop',
  'replanning',
  'human-in-the-loop',
  'negotiation',
  'mechanism-design',
  'identity-and-trust',
  'least-privilege',
  'failure-analysis',
  'matched-compute-evaluation',
  'coordination-benchmarking',
  'interoperability',
])

export const EVIDENCE_STATUSES = Object.freeze([
  'peer-reviewed',
  'preprint',
  'official-specification',
  'official-engineering',
  'primary-source-talk',
  'historical-standard',
  'documentation',
])

export const MATURITY_LEVELS = Object.freeze([
  'conceptual',
  'implemented',
  'evaluated',
  'reproduced',
  'deployed',
  'experimental',
])

export const LIFECYCLE_STATUSES = Object.freeze([
  'active',
  'maintenance',
  'historical',
  'superseded',
  'archived',
])

export const CURATION_TIERS = Object.freeze(['essential', 'strong', 'watch'])

export const ARTIFACT_KINDS = Object.freeze([
  'code',
  'data',
  'documentation',
  'specification',
  'project-page',
  'video',
])

const ID_PATTERN = /^[a-z0-9][a-z0-9:._-]*$/
const ENTRY_KEYS = Object.freeze([
  'id', 'type', 'title', 'url', 'authors', 'organizations', 'publishedAt',
  'updatedAt', 'summary', 'whyNotable', 'primaryTheme', 'themes', 'techniques',
  'evidence', 'artifacts', 'lifecycle', 'curation', 'media',
])

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isHttpUrl = (value) => {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

const canonicalUrl = (value) => {
  try {
    const url = new URL(value)
    url.hash = ''
    const host = url.hostname.toLowerCase()
    if (host === 'youtu.be' || host === 'youtube.com' || host === 'www.youtube.com') {
      const videoId = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v')
      if (videoId) return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
    }
    url.searchParams.sort()
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '')
    return url.toString()
  } catch {
    return value
  }
}

const isDate = (value) => {
  const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return false
  const [, year, month, day] = match.map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

const hasUniqueValues = (values) => new Set(values).size === values.length

const rejectUnexpected = (errors, path, value, allowed) => {
  if (!isObject(value)) return
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) errors.push(`${path}.${key} is not allowed`)
  }
}

const validateStringArray = (errors, path, value, { allowEmpty = false } = {}) => {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    errors.push(`${path} must be ${allowEmpty ? 'an' : 'a nonempty'} array`)
    return
  }
  value.forEach((item, index) => {
    if (typeof item !== 'string' || item.trim() === '') {
      errors.push(`${path}[${index}] must be a nonempty string`)
    }
  })
  if (!hasUniqueValues(value)) errors.push(`${path} must not contain duplicates`)
}

const validateEnum = (errors, path, value, allowed) => {
  if (!allowed.includes(value)) {
    errors.push(`${path} must be one of: ${allowed.join(', ')}`)
  }
}

const validateEntry = (entry, index) => {
  const errors = []
  const path = `entries[${index}]`
  if (!isObject(entry)) return [`${path} must be an object`]
  rejectUnexpected(errors, path, entry, ENTRY_KEYS)

  if (typeof entry.id !== 'string' || !ID_PATTERN.test(entry.id)) {
    errors.push(`${path}.id must be a stable lowercase identifier`)
  }
  validateEnum(errors, `${path}.type`, entry.type, RESOURCE_TYPES)
  if (typeof entry.title !== 'string' || entry.title.trim() === '') {
    errors.push(`${path}.title must be a nonempty string`)
  }
  if (!isHttpUrl(entry.url)) errors.push(`${path}.url must be an HTTP(S) URL`)

  validateStringArray(errors, `${path}.authors`, entry.authors, { allowEmpty: true })
  validateStringArray(errors, `${path}.organizations`, entry.organizations, { allowEmpty: true })
  if (
    Array.isArray(entry.authors) &&
    Array.isArray(entry.organizations) &&
    entry.authors.length === 0 &&
    entry.organizations.length === 0
  ) {
    errors.push(`${path} must provide authors or organizations`)
  }

  if (!isDate(entry.publishedAt)) errors.push(`${path}.publishedAt must be a real YYYY-MM-DD date`)
  if (entry.updatedAt !== undefined && !isDate(entry.updatedAt)) {
    errors.push(`${path}.updatedAt must be a real YYYY-MM-DD date`)
  }
  if (typeof entry.summary !== 'string' || entry.summary.trim().length < 20) {
    errors.push(`${path}.summary must contain at least 20 characters`)
  }
  if (typeof entry.whyNotable !== 'string' || entry.whyNotable.trim().length < 20) {
    errors.push(`${path}.whyNotable must contain at least 20 characters`)
  }

  validateEnum(errors, `${path}.primaryTheme`, entry.primaryTheme, Object.keys(THEMES))
  validateStringArray(errors, `${path}.themes`, entry.themes)
  if (Array.isArray(entry.themes)) {
    entry.themes.forEach((theme, themeIndex) =>
      validateEnum(errors, `${path}.themes[${themeIndex}]`, theme, Object.keys(THEMES)),
    )
    if (!entry.themes.includes(entry.primaryTheme)) {
      errors.push(`${path}.primaryTheme must appear in themes`)
    }
  }

  validateStringArray(errors, `${path}.techniques`, entry.techniques)
  if (Array.isArray(entry.techniques)) {
    entry.techniques.forEach((technique, techniqueIndex) =>
      validateEnum(errors, `${path}.techniques[${techniqueIndex}]`, technique, TECHNIQUES),
    )
  }

  if (!isObject(entry.evidence)) {
    errors.push(`${path}.evidence must be an object`)
  } else {
    rejectUnexpected(errors, `${path}.evidence`, entry.evidence, ['status', 'maturity', 'limitations'])
    validateEnum(errors, `${path}.evidence.status`, entry.evidence.status, EVIDENCE_STATUSES)
    validateEnum(errors, `${path}.evidence.maturity`, entry.evidence.maturity, MATURITY_LEVELS)
    if (
      typeof entry.evidence.limitations !== 'string' ||
      entry.evidence.limitations.trim().length < 20
    ) {
      errors.push(`${path}.evidence.limitations must contain at least 20 characters`)
    }
  }

  if (!Array.isArray(entry.artifacts)) {
    errors.push(`${path}.artifacts must be an array`)
  } else {
    const artifactKeys = entry.artifacts.map((artifact) =>
      JSON.stringify([artifact?.kind, artifact?.url]),
    )
    if (!hasUniqueValues(artifactKeys)) {
      errors.push(`${path}.artifacts must not contain duplicates`)
    }
    entry.artifacts.forEach((artifact, artifactIndex) => {
      const artifactPath = `${path}.artifacts[${artifactIndex}]`
      if (!isObject(artifact)) {
        errors.push(`${artifactPath} must be an object`)
        return
      }
      rejectUnexpected(errors, artifactPath, artifact, ['kind', 'url'])
      validateEnum(errors, `${artifactPath}.kind`, artifact.kind, ARTIFACT_KINDS)
      if (!isHttpUrl(artifact.url)) errors.push(`${artifactPath}.url must be an HTTP(S) URL`)
    })
  }

  if (!isObject(entry.lifecycle)) {
    errors.push(`${path}.lifecycle must be an object`)
  } else {
    rejectUnexpected(errors, `${path}.lifecycle`, entry.lifecycle, ['status', 'successorId'])
    validateEnum(errors, `${path}.lifecycle.status`, entry.lifecycle.status, LIFECYCLE_STATUSES)
    if (entry.lifecycle.successorId !== undefined && !ID_PATTERN.test(entry.lifecycle.successorId)) {
      errors.push(`${path}.lifecycle.successorId must be a stable lowercase identifier`)
    }
    if (entry.lifecycle.status === 'superseded' && entry.lifecycle.successorId === undefined) {
      errors.push(`${path}.lifecycle superseded entries require successorId`)
    }
  }

  if (!isObject(entry.curation)) {
    errors.push(`${path}.curation must be an object`)
  } else {
    rejectUnexpected(errors, `${path}.curation`, entry.curation, ['tier', 'addedAt', 'lastReviewedAt'])
    validateEnum(errors, `${path}.curation.tier`, entry.curation.tier, CURATION_TIERS)
    if (!isDate(entry.curation.addedAt)) {
      errors.push(`${path}.curation.addedAt must be a real YYYY-MM-DD date`)
    }
    if (!isDate(entry.curation.lastReviewedAt)) {
      errors.push(`${path}.curation.lastReviewedAt must be a real YYYY-MM-DD date`)
    }
  }

  if (entry.type === 'talk' && entry.media === undefined) {
    errors.push(`${path}.media is required for talks`)
  }
  if (entry.media !== undefined) {
    if (!isObject(entry.media)) {
      errors.push(`${path}.media must be an object`)
    } else {
      rejectUnexpected(errors, `${path}.media`, entry.media, ['channel', 'durationSeconds', 'videoId'])
      if (typeof entry.media.channel !== 'string' || entry.media.channel.trim() === '') {
        errors.push(`${path}.media.channel must be a nonempty string`)
      }
      if (!Number.isInteger(entry.media.durationSeconds) || entry.media.durationSeconds <= 0) {
        errors.push(`${path}.media.durationSeconds must be a positive integer`)
      }
      if (typeof entry.media.videoId !== 'string' || entry.media.videoId.trim() === '') {
        errors.push(`${path}.media.videoId must be a nonempty string`)
      }
    }
  }

  return errors
}

export const validateCatalog = (catalog) => {
  if (!Array.isArray(catalog)) return ['catalog must be an array']

  const errors = catalog.flatMap(validateEntry)
  const ids = new Map()
  const urls = new Map()
  catalog.forEach((entry, index) => {
    if (!isObject(entry)) return
    if (typeof entry.id === 'string') {
      if (ids.has(entry.id)) errors.push(`entries[${index}].id has duplicate id: ${entry.id}`)
      else ids.set(entry.id, index)
    }
    if (typeof entry.url === 'string') {
      const key = canonicalUrl(entry.url)
      if (urls.has(key)) {
        errors.push(`entries[${index}].url has duplicate url (duplicate canonical url): ${entry.url}`)
      } else {
        urls.set(key, index)
      }
    }
  })
  catalog.forEach((entry, index) => {
    const successorId = isObject(entry?.lifecycle) ? entry.lifecycle.successorId : undefined
    if (successorId !== undefined && !ids.has(successorId)) {
      errors.push(`entries[${index}].lifecycle.successorId does not reference a catalog entry: ${successorId}`)
    }
  })
  return errors
}

export const assertValidCatalog = (catalog) => {
  const errors = validateCatalog(catalog)
  if (errors.length > 0) {
    throw new Error(`Catalog validation failed:\n- ${errors.join('\n- ')}`)
  }
  return catalog
}
