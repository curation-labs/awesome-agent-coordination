// ABOUTME: Implements review-freshness policy and resilient catalog link checking.
// ABOUTME: Separates permanent breakage from transient, rate-limited, or access-blocked responses.

export const REVIEW_WINDOWS_DAYS = Object.freeze({
  essential: 180,
  strong: 270,
  watch: 120,
})

const DAY_MS = 24 * 60 * 60 * 1000

export const findStaleEntries = (catalog, asOf = new Date()) =>
  catalog
    .map((entry) => {
      const reviewed = new Date(`${entry.curation.lastReviewedAt}T00:00:00Z`)
      const daysSinceReview = Math.floor((asOf.getTime() - reviewed.getTime()) / DAY_MS)
      const reviewWindowDays = REVIEW_WINDOWS_DAYS[entry.curation.tier]
      return { id: entry.id, daysSinceReview, reviewWindowDays }
    })
    .filter((entry) => entry.daysSinceReview > entry.reviewWindowDays)

export const collectCatalogUrls = (catalog) => {
  const urls = new Set()
  for (const entry of catalog) {
    urls.add(entry.url)
    for (const artifact of entry.artifacts) urls.add(artifact.url)
  }
  return [...urls]
}

export const classifyLinkStatus = (status) => {
  if (status >= 200 && status < 400) return 'ok'
  if ([401, 403, 408, 425, 429].includes(status) || status >= 500 || status === 0) {
    return 'warning'
  }
  if (status >= 400 && status < 500) return 'broken'
  return 'warning'
}

export const checkUrls = async (
  urls,
  { fetchImpl = fetch, concurrency = 8, timeoutMs = 15_000 } = {},
) => {
  const results = new Array(urls.length)
  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < urls.length) {
      const index = nextIndex
      nextIndex += 1
      const url = urls[index]
      try {
        const response = await fetchImpl(url, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(timeoutMs),
          headers: { 'user-agent': 'awesome-agent-coordination-link-check/1.0' },
        })
        results[index] = {
          url,
          status: response.status,
          classification: classifyLinkStatus(response.status),
        }
      } catch (error) {
        results[index] = {
          url,
          status: 0,
          classification: 'warning',
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), urls.length || 1)
  await Promise.all(Array.from({ length: workerCount }, worker))
  return results
}

