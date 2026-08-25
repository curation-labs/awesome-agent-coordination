// ABOUTME: Checks canonical and artifact URLs while distinguishing breakage from transient access failures.
// ABOUTME: Default mode fails on permanent links; --strict also fails on warnings for manual audits.

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readCatalog } from './ingest.mjs'
import { collectCatalogUrls, checkUrls } from './maintenance.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const strict = process.argv.includes('--strict')
const catalog = await readCatalog(join(root, 'data', 'catalog.json'))
const urls = collectCatalogUrls(catalog)
console.log(`Checking ${urls.length} unique catalog URLs…`)
const results = await checkUrls(urls)

const warnings = results.filter((result) => result.classification === 'warning')
const broken = results.filter((result) => result.classification === 'broken')
for (const result of [...broken, ...warnings]) {
  const detail = result.error ? ` (${result.error})` : ` (HTTP ${result.status})`
  console.error(`${result.classification.toUpperCase()}: ${result.url}${detail}`)
}
console.log(`Links: ${results.length - warnings.length - broken.length} ok, ${warnings.length} warnings, ${broken.length} broken.`)
if (broken.length > 0 || (strict && warnings.length > 0)) process.exit(1)
