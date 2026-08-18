# GenomeOps Atlas

GenomeOps Atlas is a public pilot for evidence-aware genome project work. It combines a project map, deterministic prompt builder, external tool advisor, AI workforce registry, task-to-agent router, and local research memory in one browser application.

The pilot is a control plane, not a biological authority. Demo nodes are visibly marked as predicted, unknown, or needing validation, and no model can promote a claim to confirmed.

**Live pilot:** [genomeops-atlas.vercel.app](https://genomeops-atlas.vercel.app/)

## Pilot modules

- **Projects** — three seeded project briefs for *Lactococcus lactis* oxygen metabolism, LAB restriction–modification systems, and a genome engineering knowledge base.
- **Evidence Map** — interactive source → claim → decision relationships with status filters and next-check guidance.
- **Prompt Studio** — deterministic, browser-only prompt generation plus reusable prompt recipes.
- **Tool Advisor** — task-based routing to current official tools, with provenance checks and local-capability filtering.
- **AI Workforce** — model registry and a Task → Agent Router for genome analysis, visualization, literature, grants, software, and project organization.
- **Research Memory** — local browser storage for bounded observations, hypotheses, unknowns, validation priorities, and decisions, with JSON export.

## Codex-Spark position

GPT-5.3-Codex-Spark is represented as an ultra-fast engineering-loop accelerator: targeted implementation, UI iteration, refactoring, test scaffolding, and rapid feedback. It is intentionally excluded from the scientific-evidence route and is never presented as a genome-science authority.

The registry distinguishes official vendor facts from GenomeOps Atlas routing policy. The Spark source links to the [official Codex speed documentation](https://learn.chatgpt.com/docs/agent-configuration/speed#codex-spark); the 128k context statement is explicitly labeled as an at-launch fact.

## Run locally

Requirements: Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Run the complete verification gate:

```bash
npm run check
```

That command runs lint, the unit/interface tests, TypeScript compilation, and a production build.

## Knowledge corpus

```text
knowledge/
├── models/
├── workflows/
├── prompts/
│   ├── analysis/
│   ├── biology/
│   ├── coding/
│   └── visualization/
└── decisions/
```

YAML and Markdown records are the reviewable source corpus. The frontend imports them at build time; research-memory entries remain local to the browser until exported.

## Deployment workflow

- `.github/workflows/verify.yml` runs the locked install and full verification gate on pushes to `main` and on pull requests.
- `vercel.json` defines the Vite build, single-page-app fallback, and baseline security headers.
- The production Vercel project is locally linked by immutable project and team IDs and was deployed from the committed source after the verification gate passed.
- Automatic Git-to-Vercel deployments require completing Vercel's one-time email verification in the project dashboard. Until then, GitHub Actions is the authoritative repository gate and production deployment is an explicit post-gate action.

## Evidence boundary

- The app contains demo data, not imported account history or experimental records.
- Tool recommendations link to primary documentation and state what provenance must be retained.
- AI output is advisory. Agreement between models is not validation.
- Research memory is local-only in this pilot; GitHub-backed synchronization is an upgrade path, not a simulated feature.

See [QA.md](QA.md) for the tested interfaces and remaining boundary.
