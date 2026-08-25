---
description: Add a YouTube talk to the validated agent-coordination catalog
argument-hint: <youtube-url> --published-at YYYY-MM-DD
allowed-tools: Bash(./scripts/add:*), Bash(scripts/add:*), Bash(node:*)
---

Run the curation pipeline for the talk at: $ARGUMENTS

Steps:

1. Read `EDITORIAL_CHARTER.md`, then from the `awesome-agent-coordination` repo
   root (the directory containing `scripts/add` and `data/catalog.json`), run:

   ```
   ./scripts/add $ARGUMENTS
   ```

   This fetches the transcript locally with `bgng url --no-index`, generates
   exact bounded editorial JSON via `claude -p`, validates and atomically merges
   the record into `data/catalog.json`, and regenerates the managed block in
   `README.md`.

2. Run `npm run check`, then report the talk title, primary theme, summary,
   notability rationale, and limitation. If editorial judgment needs correction,
   edit `data/catalog.json` and run `npm run generate`.

Do not hand-edit the README between the `<!-- CATALOG:START/END -->`
markers — that block is regenerated.
