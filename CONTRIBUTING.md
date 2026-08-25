# Contributing

Contributions should improve the repository’s ability to explain or implement agent
coordination. Read [the editorial charter](EDITORIAL_CHARTER.md) before proposing a
resource.

## Before submitting

Confirm that the resource:

- links to a primary artifact;
- makes a distinct coordination contribution;
- is not already represented by another version or successor;
- has a concrete notability rationale and an explicit limitation;
- is placed by coordination problem rather than by vendor or framework family.

When you are affiliated with the resource, disclose that in the pull request.

## Catalog record

Add or update a record in `data/catalog.json`. Use the contract in
`data/catalog.schema.json` and existing entries as examples. Required information
includes:

- stable `id`, canonical `url`, `type`, and title;
- authors and/or organizations;
- publication date and, when useful, latest significant revision date;
- primary theme, additional themes, and technique tags;
- neutral summary, why the resource is notable, and its limitations;
- evidence status, maturity, lifecycle, curation tier, and review dates;
- official code, data, documentation, or specification links when available.

Do not hand-edit generated content between the catalog markers in `README.md`.

## Local checks

Catalog editing and validation require Node.js 24 or newer and have no third-party
package dependencies.

Run:

```sh
npm test
npm run validate
npm run check:generated
npm run check:freshness
npm run check:links
```

`check:links` treats definite permanent failures as errors and reports transient or
access-blocked responses as warnings. Maintainers may use strict mode while auditing:

```sh
node scripts/check-links.mjs --strict
```

## Talk-ingestion prerequisites

The optional YouTube adapter also requires:

- `bgng` 0.1.x or newer with `url`, `--into`, `--lang`, and `--no-index` support;
- Claude Code 2.x or newer with non-interactive `claude -p` support.

Install Node.js from [nodejs.org](https://nodejs.org/), Claude Code from its
[official setup guide](https://code.claude.com/docs/en/setup), and `bgng` from the
BeginningDB CLI distribution used by your environment. Verify the installed commands
before ingestion:

```sh
node --version
bgng --help
claude --help
```

`scripts/add` performs the same preflight and stops with a concise error when either
external command is missing or broken. These tools are not needed for catalog
validation, README generation, freshness checks, or CI.

## Talks and videos

YouTube resources can be acquired with `scripts/add <youtube-url>`. The pipeline
fetches the transcript into ignored local working data, creates a validated catalog
record, and regenerates the README. Review the generated summary, dates, placement,
evidence label, and limitation before submitting it.

Talks should normally add material not already represented by a stronger paper,
specification, or engineering report.

## Pull request description

Explain:

- the coordination contribution;
- why the resource meets the charter;
- the strongest baseline or evidence supporting it;
- its main limitation;
- whether it supersedes or is superseded by another catalog entry;
- testing and CI evidence.
