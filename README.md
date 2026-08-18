# GenomeOps Atlas

GenomeOps Atlas is a bilingual guide for people who already use AI chat but do not want to become prompt engineers. Start with a raw doubt, a choice, or an unfinished goal. Atlas turns it into one useful next move, a clear split between AI work and human judgment, and a small A/B test.

**Live pilot:** [genomeops-atlas.vercel.app](https://genomeops-atlas.vercel.app/)

## The everyday guide

- **English / Russian** — the full routine, saved aims, timer, and controls switch together.
- **Guide me** — accepts ordinary chat-style input with no required template.
- **Fast A/B** — compares two ways to use AI on the same task instead of trusting the first answer.
- **10-minute test** — adds a timer, a three-step checklist, pause/resume, and a completion marker.
- **My aims** — keeps useful routes in local browser storage so the next session does not begin from a blank chat.
- **Quick starts** — handles a doubt, a comparison, a plan, or a request for a better AI workflow.

The current pilot is deterministic and browser-only: it does not call an AI model, upload the user's text, or pretend that a generated route is scientific validation.

## Advanced Atlas workspace

The original expert tools remain available through **Open advanced Atlas tools**:

- Projects and evidence relationship maps;
- deterministic Prompt Studio and prompt recipes;
- task-based Tool Advisor;
- AI Workforce Registry and Task → Agent Router;
- local research memory and JSON export.

The advanced source records remain in English and are labeled as such at the mode boundary. Demo nodes stay visibly separated into confirmed, predicted, unknown, or needs-validation states.

## Codex-Spark position

GPT-5.3-Codex-Spark is represented as an ultra-fast engineering-loop accelerator: targeted implementation, UI iteration, refactoring, test scaffolding, and rapid feedback. It is intentionally excluded from the scientific-evidence route and is never presented as a genome-science authority.

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

YAML and Markdown records are the reviewable advanced corpus. The frontend imports them at build time; everyday aims and research-memory entries remain local to the browser until exported.

## Deployment workflow

- `.github/workflows/verify.yml` runs the locked install and full verification gate on pushes to `main` and on pull requests.
- `vercel.json` defines the Vite build, single-page-app fallback, and baseline security headers.
- Production is deployed from committed source after the verification gate passes.
- Automatic Git-to-Vercel deployments still require Vercel's one-time account email verification. Until then, GitHub Actions is the repository gate and production deployment is an explicit post-gate action.

## Evidence boundary

- The everyday guide offers a workflow hypothesis, not a guaranteed answer.
- The advanced workspace contains demo data, not imported account history or experimental records.
- AI output and agreement between models are advisory, not validation.
- The pilot does not verify biological claims, external tool results, or third-party private-data handling.

See [QA.md](QA.md) for the tested interfaces and remaining boundary.
