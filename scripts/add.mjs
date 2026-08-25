// ABOUTME: Safely captures a YouTube transcript, curates a catalog entry, and regenerates README.
// ABOUTME: Disables external indexing, resolves duplicate captures, and propagates subprocess failures.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { assertCommandAvailable, buildBgngArgs, findTranscriptFolder } from './ingest.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const scripts = join(root, 'scripts')

const args = process.argv.slice(2)
const url = args.find((arg) => !arg.startsWith('--') && !/^\d{4}-\d{2}-\d{2}$/.test(arg))
const publishedAtIndex = args.indexOf('--published-at')
const publishedAt = publishedAtIndex === -1 ? undefined : args[publishedAtIndex + 1]
if (!url) {
  console.error('Usage: scripts/add <youtube-url> --published-at YYYY-MM-DD')
  process.exit(1)
}

const run = (cmd, args, opts = {}) => {
  const res = spawnSync(cmd, args, { encoding: 'utf8', cwd: root, ...opts })
  if (res.error) throw res.error
  return res
}

try {
  assertCommandAvailable('bgng')
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

console.log('Fetching transcript…')
const fetched = run('bgng', buildBgngArgs(url))
process.stdout.write(fetched.stdout || '')
process.stderr.write(fetched.stderr || '')
if (fetched.status !== 0) {
  process.exit(fetched.status || 1)
}

let folder
try {
  folder = await findTranscriptFolder(root, url, fetched.stdout)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

console.log('Curating entry…')
const enrichArgs = [join(scripts, 'enrich.mjs'), folder]
if (publishedAt) enrichArgs.push('--published-at', publishedAt)
const enriched = run('node', enrichArgs)
process.stdout.write(enriched.stdout || '')
process.stderr.write(enriched.stderr || '')
if (enriched.status !== 0) {
  process.exit(enriched.status || 1)
}

const regen = run('node', [join(scripts, 'regenerate-readme.mjs')])
process.stdout.write(regen.stdout || '')
process.stderr.write(regen.stderr || '')
process.exit(Number.isInteger(regen.status) ? regen.status : 1)
