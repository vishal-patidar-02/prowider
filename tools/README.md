# Developer tools and internal docs

This folder contains developer scripts and internal documentation that are not required for a minimal grader submission.

Structure:
- `tools/scripts/` — diagnostic and verification scripts (run locally with `npx tsx`)
  - `verify-phase2.ts` — end-to-end verification: seeds DB, runs allocation tests, concurrency checks, webhook idempotency.
  - `diagnose-db.ts` — prints database diagnostic report (counts, records, health hints).
  - `check-webhook-route.ts` — invokes the reset-quota handler and reports before/after provider counters (useful for debugging).
  - `check-reset-flow.ts` — inspects provider assignment counts and runs a local reset transaction.

- `tools/internal-docs/` — large context and AI-generated notes. These are internal only and were moved here to keep the repo root clean.

How to use the scripts

1. Ensure your `DATABASE_URL` is available in the environment (or use a `.env` file):

```bash
export DATABASE_URL="postgresql://..."
```

2. Run a script (recommended via `npx tsx`):

```bash
npx tsx -r dotenv/config tools/scripts/diagnose-db.ts
npx tsx -r dotenv/config tools/scripts/verify-phase2.ts
```

Notes
- These scripts are developer utilities. If you are preparing a minimal submission for evaluation, consider omitting the `tools/` folder or moving it out of the repository.
- `tools/internal-docs/` contains verbose AI/context dumps — keep them private or remove before sharing publicly.
