# GenomeOps Atlas pilot verification

Checked on 2026-08-18.

## Automated gate

- `npm run lint` — passed.
- `npm run test` — 3 files and 9 tests passed.
- `npm run build` — passed with TypeScript compilation and a Vite production build.

## Browser verification

Tested in the Codex in-app browser against the production build:

- desktop viewport: 1536 × 1024;
- mobile viewport: 390 × 844;
- mobile document width remained within the viewport;
- no browser console warnings or errors;
- evidence-node selection updates the decision brief;
- prompt inputs update the generated evidence contract;
- tool-stage and local-capability filters update recommendations;
- free text infers a task route;
- explicit task selection overrides stale text;
- genome-analysis routing excludes Codex-Spark from the recommended scientific chain;
- research-memory form, filters, and export affordance render correctly.

## Production verification

- Stable URL: `https://genomeops-atlas.vercel.app/`.
- Vercel deployment reached `READY` and the stable URL returned HTTP 200.
- Expected content-security-adjacent headers were present: `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- Vercel reported no runtime error clusters after the first production retrieval.
- A fresh browser load selected the `nox` evidence node and routed an explicit genome-analysis task with Spark absent from the scientific chain.
- The live browser reported no console warnings or errors.

## Visual contract comparison

The rendered implementation was checked against the written visual contract because the optional image-concept service was unavailable at generation time.

- Copy and navigation: evidence-first language and six-module information architecture are present above the fold.
- Layout: dark application shell, light working canvas, project rail, relationship map, and decision pane match the intended atlas/workbench structure.
- Typography and palette: disciplined sans/mono hierarchy, near-black shell, warm paper, lime action accent, cyan source links, and amber validation state are consistent.
- Asset treatment: restrained line icons and evidence connectors are used instead of decorative stock imagery.
- Spacing and containers: bounded panels, thin rules, and grid rhythm remain consistent across modules.
- Responsive behavior: the top navigation collapses to a section selector, project cards become a horizontal rail, and the evidence view stacks without page overflow.
- Motion: transitions are short and functional; reduced-motion preferences disable non-essential animation.

## Remaining boundary

The pilot verifies the local and deployed web interfaces, deterministic routing/prompt behavior, and GitHub verification workflow. It does not verify biological claims, external tool results, private-data isolation in third-party models, or future GitHub-backed research-memory synchronization. Automatic Git-to-Vercel deployment remains behind Vercel's one-time account email-verification gate; the current production deployment was completed and verified explicitly.
