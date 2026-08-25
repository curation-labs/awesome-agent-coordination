# Editorial charter

Awesome Agent Coordination is a practitioner-first, evidence-backed map of how AI
agents coordinate. It connects reusable coordination techniques to the literature,
protocols, benchmarks, tools, frameworks, repositories, and experimental workspaces
that explain or implement them.

The repository is curated, not comprehensive. Inclusion means that a resource makes
a distinctive, useful contribution to understanding or implementing coordination.

## Scope

Coordination means that two or more autonomous or semi-autonomous actors must align
their information, decisions, work, or authority to reach an outcome. The actors may
be language-model agents, learned policies, software services acting as agents, or
humans working with agents.

The catalog covers eight problem areas:

1. **Foundations and formal models** — distributed problem solving, joint plans,
   commitments, decision processes, and foundational organizational mechanisms.
2. **Architectures and control topology** — supervisors, peers, hierarchies, graphs,
   markets, blackboards, and hybrid organizations.
3. **Task decomposition, allocation, and delegation** — planning, routing, ownership,
   bidding, specialization, scheduling, and dynamic team formation.
4. **Communication and interoperability** — messages, shared state, topology,
   discovery, capability description, and cross-framework protocols.
5. **State, memory, and durable execution** — context isolation, shared artifacts,
   provenance, checkpoints, persistence, retries, and conflict resolution.
6. **Verification, recovery, and human oversight** — evaluation loops, termination,
   error containment, replanning, escalation, approvals, and takeover.
7. **Incentives, safety, and governance** — negotiation, mechanism design, collusion,
   permissions, trust, security boundaries, policy, and auditability.
8. **Evaluation, scaling, and economics** — coordination-specific benchmarks,
   matched-compute baselines, cost, latency, communication, variance, and failure
   attribution.

Single-agent work is included only when it establishes a mechanism or evaluation
principle directly necessary for multi-agent coordination.

## Audience and navigation

The primary reader is a practitioner deciding whether and how to coordinate agents.
Entries are therefore organized by the coordination problem they illuminate, not by
publication medium or framework popularity.

Each resource has one primary theme for stable placement and may have additional
themes and technique tags. Visible resource-type labels let readers distinguish a
paper from an implementation, specification, benchmark, or experimental workspace.

## Eligible resource types

- **Paper** — original research or a durable scholarly treatment.
- **Survey** — a synthesis with a distinctive, useful taxonomy or research map.
- **Specification** — a normative or widely used interoperability contract.
- **Benchmark** — an evaluation that isolates a meaningful coordination capability
  or failure mode.
- **Framework** — a maintained implementation surface supporting multiple
  coordination patterns or production concerns.
- **Tool** — a narrower implementation useful for constructing, observing, testing,
  or governing coordination.
- **Repository** — a reference implementation whose code is the primary artifact.
- **Engineering report** — first-party implementation evidence with enough detail to
  transfer the technique, clearly labeled when results are internal.
- **Experimental workspace** — a runnable environment, simulation, or long-running
  experiment that exposes coordination mechanics and artifacts.
- **Talk** — an authoritative explanation that adds material not available in a
  stronger primary written source.

## Inclusion rubric

A resource must satisfy every required criterion and at least one significance
criterion.

### Required

1. **Primary artifact:** Link to the paper, official specification, official
   repository, or first-party engineering report rather than an aggregator.
2. **Coordination contribution:** State exactly which coordination problem,
   technique, empirical result, or implementation primitive it contributes.
3. **Traceable metadata:** Record the canonical title, authors or organization,
   publication date, resource type, and review date.
4. **Proportional claims:** Separate demonstrated results from hypotheses, vendor
   claims, and extrapolation.
5. **Limitations:** Record at least one material boundary, failure mode, evidence
   caveat, or open question.
6. **Stable placement:** Assign one primary theme and relevant technique tags.
7. **Accessible value:** A reader can inspect the primary artifact without joining a
   private program or relying only on promotional material.

### Significance — at least one

- Introduced a technique or formal model that remains conceptually important.
- Supplied strong empirical evidence about when a coordination design helps or hurts.
- Defined an interoperability or safety boundary used across implementations.
- Released a reproducible benchmark, dataset, reference system, or experimental
  workspace that materially advances evaluation.
- Demonstrated a production technique with transferable implementation detail.
- Corrected a widely repeated assumption with credible negative or null evidence.

## Exclusion rubric

Exclude or defer resources whose primary value is any of the following:

- announcing that several agents were placed in a loop without a distinct mechanism,
  baseline, or evaluation;
- popularity, stars, downloads, funding, or vendor adoption without technical value;
- a thin wrapper over an already represented framework;
- an SEO list, derivative explainer, unverified benchmark summary, or promotional
  landing page when the primary artifact is available;
- benchmark gains without an adequate single-agent or matched-compute baseline;
- a framework demo whose claims cannot be separated from model capability;
- duplicate surveys that do not add a materially different taxonomy;
- abandoned or inaccessible code with no enduring conceptual or historical value;
- unsafe instructions whose inclusion would add operational risk without commensurate
  research value.

Resources with plausible importance but insufficient evidence belong in the
**Watch** tier, not in the stronger tiers.

## Evidence and maturity labels

Evidence status describes what kind of artifact supports the entry:

- **Peer reviewed** — accepted archival scholarly work.
- **Preprint** — public research not yet supported by archival peer review.
- **Official specification** — normative specification controlled by its project.
- **Official engineering** — first-party technical report or implementation account.
- **Primary source talk** — an authoritative talk or interview, without implying
  engineering or peer-reviewed evidence.
- **Historical standard** — superseded or older material retained for foundations.
- **Documentation** — official implementation documentation without a research claim.

Maturity describes what has actually been demonstrated:

- **Conceptual** — formalization, taxonomy, position, or proposed technique.
- **Implemented** — public runnable code or specification implementation exists.
- **Evaluated** — reported evaluation with stated baselines and metrics exists.
- **Reproduced** — important findings have independent reproduction evidence.
- **Deployed** — credible evidence of sustained real-world operation exists.
- **Experimental** — useful early workspace or result whose generality remains open.

Neither label is a quality score. A foundational conceptual paper can be essential;
a deployed framework can still have weak comparative evidence.

## Curation tiers

- **Essential** — required to understand the field or make a major design decision.
  Review at least every 180 days.
- **Strong** — distinctive and useful supporting work. Review at least every 270 days.
- **Watch** — promising, emerging, disputed, or lightly evaluated. Review at least
  every 120 days.

Tier placement reflects editorial judgment about durable value and evidence, never a
numeric popularity score.

## Entry style

Descriptions are neutral and answer three questions:

1. What coordination mechanism or result does this contribute?
2. Why is it notable relative to simpler or earlier alternatives?
3. What is the main limitation or condition on the claim?

Avoid “best,” “production-ready,” “state of the art,” “scalable,” or “robust” unless
the entry names the supporting comparison and its scope.

## Lifecycle and supersession

Entries have an active, maintenance, historical, superseded, or archived lifecycle.
Do not silently remove influential resources when projects merge or frameworks are
replaced. Mark the lifecycle, link the successor, and preserve the historical reason
for inclusion.

Examples include research frameworks that enter maintenance mode, protocols absorbed
into another standard, and educational repositories replaced by supported SDKs.

## Maintenance

- Validate the catalog and generated README on every change.
- Check links and review-date freshness in CI and on a schedule.
- Review Watch entries every four months, Essential entries every six months, and
  Strong entries every nine months.
- Run a quarterly deduplication and supersession pass.
- Prefer updating an existing record over adding a second record for a new revision.
- Record both source publication date and catalog addition/review dates.
- Promote claims only when evidence improves; demote or annotate entries when later
  work exposes leakage, overfitting, non-reproduction, or important trade-offs.

## Conflicts of interest

Contributors should disclose when they authored, maintain, fund, or work for the
organization behind a submitted resource. Affiliation does not disqualify a resource,
but its inclusion rationale must remain independently inspectable.
