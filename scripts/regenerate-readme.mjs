// ABOUTME: Rewrites the managed thematic block in README.md from data/catalog.json.
// ABOUTME: Supports write and check modes while preserving content outside catalog markers.
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { renderCatalogBlock, replaceManagedBlock } from './lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalogPath = join(root, 'data', 'catalog.json')
const readmePath = join(root, 'README.md')

const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
const readme = await readFile(readmePath, 'utf8')
const next = replaceManagedBlock(readme, renderCatalogBlock(catalog))
const check = process.argv.includes('--check')

if (next !== readme) {
  if (check) {
    console.error('README catalog block is out of date. Run: npm run generate')
    process.exit(1)
  }
  await writeFile(readmePath, next)
  console.log(`Regenerated README from ${catalog.length} catalog entries.`)
} else {
  console.log('README already up to date.')
}
