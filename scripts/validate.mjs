// ABOUTME: Validates the real catalog and prints a compact coverage summary for CI.
// ABOUTME: Uses the dependency-free executable contract rather than trusting prompt output or JSON shape.

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readCatalog } from './ingest.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalog = await readCatalog(join(root, 'data', 'catalog.json'))
const types = new Set(catalog.map((entry) => entry.type))
const themes = new Set(catalog.map((entry) => entry.primaryTheme))
console.log(`Catalog valid: ${catalog.length} entries, ${types.size} resource types, ${themes.size} themes.`)
