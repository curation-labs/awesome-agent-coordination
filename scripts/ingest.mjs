// ABOUTME: Provides safe transcript discovery, curation parsing, catalog merging, and atomic storage.
// ABOUTME: Keeps external indexing disabled and fails closed on malformed model or catalog data.

import { readFile, writeFile, rename, rm, readdir, realpath, stat } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import { THEMES, TECHNIQUES, assertValidCatalog } from './catalog.mjs'

const CURATED_KEYS = Object.freeze([
  'limitations',
  'primaryTheme',
  'summary',
  'techniques',
  'themes',
  'whyNotable',
])

export const buildBgngArgs = (url) => [
  'url',
  url,
  '--into',
  './transcripts',
  '--lang',
  'en',
  '--no-index',
]

export const assertCommandAvailable = (
  command,
  runner = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8' }),
) => {
  const result = runner(command, ['--help'])
  if (result.error?.code === 'ENOENT') {
    throw new Error(`Required command "${command}" was not found on PATH`)
  }
  if (result.error) {
    throw new Error(`Required command "${command}" could not run: ${result.error.message}`)
  }
  if (result.status !== 0) {
    const lines = String(result.stderr || result.stdout || `exit ${result.status}`)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const detail = (lines.find((line) => line.startsWith('Error:')) || lines[0] || `exit ${result.status}`)
      .replace(/^Error:\s*/, '')
      .slice(0, 240)
    throw new Error(`Required command "${command}" is unavailable or broken: ${detail}`)
  }
}

const stripAnsi = (value) => String(value).replace(/\x1b\[[0-9;]*m/g, '')

const isInside = (parent, candidate) => {
  const path = relative(parent, candidate)
  return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path)
}

const videoIdFromUrl = (url) => {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1)
    return parsed.searchParams.get('v')
  } catch {
    return undefined
  }
}

const findMetaFiles = async (folder) => {
  const files = []
  const walk = async (current) => {
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch (error) {
      if (error?.code === 'ENOENT') return
      throw error
    }
    for (const entry of entries) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) await walk(path)
      else if (entry.name === 'meta.json') files.push(path)
    }
  }
  await walk(folder)
  return files
}

export const findTranscriptFolder = async (root, url, output = '') => {
  const transcriptRoot = resolve(root, 'transcripts')
  const match = stripAnsi(output).match(/Saved to\s+(.+?)(?:\r?\n|$)/)
  if (match) {
    const candidate = resolve(root, match[1].trim())
    if (!isInside(transcriptRoot, candidate)) {
      throw new Error(`bgng returned a transcript path outside transcripts/: ${candidate}`)
    }
    const [realTranscriptRoot, realCandidate] = await Promise.all([
      realpath(transcriptRoot),
      realpath(candidate),
    ])
    if (!isInside(realTranscriptRoot, realCandidate)) {
      throw new Error(`bgng returned a transcript path outside transcripts/: ${realCandidate}`)
    }
    const info = await stat(realCandidate)
    if (!info.isDirectory()) throw new Error(`Transcript path is not a directory: ${candidate}`)
    return candidate
  }

  const expectedVideoId = videoIdFromUrl(url)
  const metadataFiles = await findMetaFiles(transcriptRoot)
  for (const metadataPath of metadataFiles) {
    try {
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
      if (metadata.url === url || (expectedVideoId && metadata.videoId === expectedVideoId)) {
        return dirname(metadataPath)
      }
    } catch (error) {
      if (error instanceof SyntaxError) continue
      throw error
    }
  }
  throw new Error(`Could not locate a transcript folder for ${url}`)
}

export const parseCuratedTalkOutput = (output) => {
  const trimmed = String(output).trim()
  let value
  try {
    value = JSON.parse(trimmed)
  } catch {
    throw new Error('Model must return a JSON object only, with no fence or trailing text')
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Model must return a JSON object only')
  }
  const keys = Object.keys(value).sort()
  if (JSON.stringify(keys) !== JSON.stringify(CURATED_KEYS)) {
    throw new Error(`Model output must contain exactly these keys: ${CURATED_KEYS.join(', ')}`)
  }
  if (typeof value.summary !== 'string' || value.summary.length < 20 || value.summary.length > 240) {
    throw new Error('summary must be between 20 and 240 characters')
  }
  if (
    typeof value.whyNotable !== 'string' ||
    value.whyNotable.length < 20 ||
    value.whyNotable.length > 320
  ) {
    throw new Error('whyNotable must be between 20 and 320 characters')
  }
  if (typeof value.limitations !== 'string' || value.limitations.length < 20) {
    throw new Error('limitations must contain at least 20 characters')
  }
  if (!Object.hasOwn(THEMES, value.primaryTheme)) {
    throw new Error(`primaryTheme must be one of: ${Object.keys(THEMES).join(', ')}`)
  }
  if (
    !Array.isArray(value.themes) ||
    value.themes.length === 0 ||
    !value.themes.includes(value.primaryTheme) ||
    value.themes.some((theme) => !Object.hasOwn(THEMES, theme))
  ) {
    throw new Error('themes must contain primaryTheme and use the catalog vocabulary')
  }
  if (
    !Array.isArray(value.techniques) ||
    value.techniques.length === 0 ||
    value.techniques.some((technique) => !TECHNIQUES.includes(technique))
  ) {
    throw new Error('techniques must use the catalog vocabulary')
  }
  return value
}

export const buildTalkEntry = (meta, curated, { publishedAt, addedAt } = {}) => {
  const sourcePublishedAt = publishedAt || meta.publishedAt || meta.uploadDate
  if (!sourcePublishedAt) {
    throw new Error('A source publication date is required; pass --published-at YYYY-MM-DD')
  }
  if (!addedAt) throw new Error('An addition date is required')

  const entry = {
    id: `talk:youtube:${String(meta.videoId).toLowerCase()}`,
    type: 'talk',
    title: meta.title,
    url: meta.url,
    authors: [],
    organizations: [meta.channel],
    publishedAt: sourcePublishedAt,
    summary: curated.summary,
    whyNotable: curated.whyNotable,
    primaryTheme: curated.primaryTheme,
    themes: curated.themes,
    techniques: curated.techniques,
    evidence: {
      status: 'primary-source-talk',
      maturity: 'conceptual',
      limitations: curated.limitations,
    },
    artifacts: [{ kind: 'video', url: meta.url }],
    lifecycle: { status: 'active' },
    curation: {
      tier: 'watch',
      addedAt,
      lastReviewedAt: addedAt,
    },
    media: {
      channel: meta.channel,
      durationSeconds: meta.duration,
      videoId: meta.videoId,
    },
  }
  assertValidCatalog([entry])
  return entry
}

export const mergeCatalogEntry = (catalog, entry) => {
  assertValidCatalog(catalog)
  assertValidCatalog([entry])
  const matches = catalog
    .map((existing, index) => ({ existing, index }))
    .filter(({ existing }) =>
      existing.id === entry.id ||
      existing.url === entry.url ||
      (
        existing.type === 'talk' &&
        entry.type === 'talk' &&
        existing.media.videoId === entry.media.videoId
      ),
    )
  if (matches.length > 1) {
    throw new Error(`Catalog identity conflict: ${entry.id} matches multiple existing entries`)
  }

  const next = [...catalog]
  if (matches.length === 1) {
    const { existing, index } = matches[0]
    next[index] = {
      ...entry,
      id: existing.id,
      curation: {
        ...entry.curation,
        addedAt: existing.curation.addedAt,
      },
    }
  } else {
    next.push(entry)
  }
  assertValidCatalog(next)
  return next
}

export const readCatalog = async (path) => {
  let catalog
  try {
    catalog = JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Could not parse catalog at ${path}: ${error.message}`)
    }
    throw error
  }
  assertValidCatalog(catalog)
  return catalog
}

export const writeCatalogAtomic = async (path, catalog) => {
  assertValidCatalog(catalog)
  const tempPath = join(
    dirname(path),
    `.${basename(path)}.${process.pid}.${Date.now()}.tmp`,
  )
  try {
    await writeFile(tempPath, `${JSON.stringify(catalog, null, 2)}\n`, { flag: 'wx' })
    await rename(tempPath, path)
  } catch (error) {
    await rm(tempPath, { force: true })
    throw error
  }
}
