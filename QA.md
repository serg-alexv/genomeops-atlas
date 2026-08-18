# GenomeOps Atlas v0.2 verification

Checked on 2026-08-18.

## Automated gate

- `npm run lint` — passed.
- `npm run test` — 4 files and 11 tests passed.
- `npm run build` — passed with TypeScript compilation and a Vite production build.

## Everyday workflow verification

Tested in the Codex in-app browser against the production build:

- desktop layout at 1536 × 1000;
- mobile layout at 390 × 844 with no horizontal document overflow;
- English and Russian switch the complete routine, including the active A/B result and timer state;
- ordinary comparison text routes to the comparison workflow without prompt syntax;
- A and B can be selected independently and B starts as the explained recommendation;
- the 10-minute timer starts, pauses, resumes, records checklist progress, and completes;
- a completed route appears in **My aims** and can be reopened from local browser storage;
- the advanced workspace opens behind an explicit boundary and returns to the guide;
- advanced source records are accurately identified as English-only;
- no browser console warnings or errors were reported.

## Advanced workspace regression

- evidence-node selection still updates the decision brief;
- deterministic prompt and task-routing tests still pass;
- genome-analysis routing still excludes Codex-Spark from the scientific chain;
- the AI Workforce registry, tool advisor, prompt recipes, and local research-memory views remain available.

## Visual contract comparison

The rendered implementation was checked against new ImageGen desktop and mobile concepts.

- Copy and navigation: one plain-language question, **My aims**, and EN/RU are the primary controls.
- Layout: the single-column composer leads into one compact response and A/B test; expert modules no longer compete above the fold.
- Typography and palette: high-contrast navy type, white space, soft gray response panels, and one lime action color follow the concept.
- Spacing and containers: the composer, quick starts, response grid, and centered test action use the concept's bounded rhythm.
- Responsive behavior: quick starts become two columns and answer/A-B sections stack on mobile without overflow.
- Motion: transitions are short and functional; reduced-motion preferences disable non-essential animation.

Material visual mismatches found during QA—an early heading wrap, oversized composer spacing, delayed response placement, and test-action alignment—were corrected before this gate.

## Production boundary

The stable release target is `https://genomeops-atlas.vercel.app/`. Each publication is checked for a ready deployment, HTTP 200 at the stable URL, expected security headers, a clean runtime-error check, and one live bilingual interaction path.

The pilot verifies its deterministic UI, local persistence, responsive layout, advanced-workspace boundary, and repository checks. It does not verify biological claims, external tool results, private-data isolation in third-party models, or future GitHub-backed synchronization.
