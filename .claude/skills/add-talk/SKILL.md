---
name: add-talk
description: Add a YouTube talk or video to the validated awesome-agent-coordination catalog. Fetches a local transcript without indexing it elsewhere, writes evidence-aware catalog metadata, and updates the generated README.
---

# Add a talk to awesome-agent-coordination

This skill curates a YouTube talk into the generalized catalog. The deterministic
engine lives in `scripts/add`; this skill drives it and reviews the result against
`EDITORIAL_CHARTER.md`.

**Architecture (read before extending to other downstreams):**
`.ai/knowledges/transcript-workflows.md` — the source→transform→sink pattern and
artifact contract this skill is one instance of.

## When to use

The user gives a YouTube URL (or a batch of them) to add to the list, or asks
to curate a talk/video into `awesome-agent-coordination`.

## Steps

1. Identify the YouTube URL(s) from the user's message.

2. Determine the source publication date. From the `awesome-agent-coordination`
   repo root (the directory containing `scripts/add` and `data/catalog.json`),
   run the pipeline for each URL:

   ```
   ./scripts/add "<youtube-url>" --published-at YYYY-MM-DD
   ```

   It fetches the transcript with `bgng url --no-index`, generates exact editorial
   JSON via `claude -p`, validates and atomically merges the record into
   `data/catalog.json`, and regenerates the managed block in `README.md`.

3. Run `npm run check`. Report the title, primary theme, summary, notability
   rationale, and limitation. If a judgment is wrong, edit that record in
   `data/catalog.json` and run `npm run generate` — do not hand-edit the README
   between the `<!-- CATALOG:START/END -->` markers.

## Gotchas

- Transcripts land in `transcripts/` (gitignored). The catalog source of truth is
  `data/catalog.json`.
- Themes and techniques are controlled vocabularies in `scripts/catalog.mjs`.
- Re-running matches by stable ID, URL, or video ID and preserves human-curated
  identity and the original addition date.
- Capture time is not publication time; supply the actual source date.
- The pipeline fails closed on malformed model output or catalog data.
- For unattended/batch use, `scripts/add` runs standalone without this skill.
