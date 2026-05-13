# AGENT.md

## Project Mission

Build and maintain a Vercel-deployed Snake mini game with persistent global rankings stored in Upstash Redis.

## Main Agent Responsibilities

- Own product decisions, integration, final verification, Git workflow, and release readiness.
- Preserve user changes and never revert unrelated work.
- Keep secrets out of Git. Commit only `.env.local.example`, never real `.env*` values.
- Before committing, run `git status --short` and verify the change set is intentional.

## Sub-Agent Workflow

- Use sub-agents only for independent work that can run in parallel.
- Prefer read-only explorer agents for review, risk analysis, and test gap discovery.
- Assign worker agents disjoint file ownership when they edit code.
- Tell workers they are not alone in the codebase and must not revert other edits.
- Review every sub-agent result before integrating it.

## Recommended Roles

- `Explorer`: Inspect structure, deployment constraints, Redis integration risk, and missing tests.
- `Game Logic Worker`: Own pure Snake logic and unit tests.
- `Frontend Worker`: Own game UI, canvas rendering, keyboard input, touch input, and responsive layout.
- `Backend Worker`: Own `/api/scores`, Redis persistence, input validation, and rate limiting.
- `QA Explorer`: Review diffs, run browser checks, and report regressions.
- `Release Explorer`: Verify GitHub remote, Vercel settings, environment variables, and deployment checklist.

## Required Checks

Run these before final handoff whenever dependencies are installed:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

For UI work, also verify the game in a browser on desktop and mobile viewport sizes.

## Implementation Rules

- Keep game rules in pure functions under `lib/` so they are easy to test.
- Keep API validation server-side and fail with explicit JSON errors.
- Use `snake:leaderboard` as the Redis sorted set key.
- Store each play as a separate ranking entry, even when nicknames repeat.
- Use `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for production persistence.
- If those environment variables are missing, local development may use the in-memory fallback only.

## Review Report Format

Sub-agent review reports should be concise and include:

- Risks
- Recommended fixes
- Verification performed
- Remaining unknowns
