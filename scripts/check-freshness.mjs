// ABOUTME: Fails when catalog entries exceed their curation-tier review windows.
// ABOUTME: Supports an optional --as-of date for reproducible maintenance audits.

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readCatalog } from './ingest.mjs'
import { findStaleEntries } from './maintenance.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const asOfIndex = process.argv.indexOf('--as-of')
const asOfValue = asOfIndex === -1 ? undefined : process.argv[asOfIndex + 1]
const asOf = asOfValue ? new Date(`${asOfValue}T00:00:00Z`) : new Date()
if (Number.isNaN(asOf.getTime())) {
  console.error('Usage: node scripts/check-freshness.mjs [--as-of YYYY-MM-DD]')
  process.exit(1)
}

const catalog = await readCatalog(join(root, 'data', 'catalog.json'))
const stale = findStaleEntries(catalog, asOf)
if (stale.length > 0) {
  console.error('Catalog entries need editorial review:')
  for (const entry of stale) {
    console.error(`- ${entry.id}: ${entry.daysSinceReview} days since review; limit ${entry.reviewWindowDays}`)
  }
  process.exit(1)
}
console.log(`Freshness check passed for ${catalog.length} entries as of ${asOf.toISOString().slice(0, 10)}.`)
