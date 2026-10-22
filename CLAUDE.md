# CLAUDE.md

Read `CONTEXT.md` first — it holds the challenge brief, TideCloak knowledge, the CamGuard idea, workflows, design, timeline and current environment status.

Rules:
- App lives in `app/` (Next.js 16 + `@tidecloak/nextjs`). TideCloak dev server: `http://localhost:8080`, realm `nextjs-test`.
- Use the `tide-pack` MCP server (see `.mcp.json`) for any TideCloak API/E2EE/IGA question before guessing.
- Never fake quorum approval in React state — approvals must be real TideCloak change-requests.
- Windows: use `npm.cmd`; run `init/tcinit.sh` inside WSL.
- Never commit `tc-data/`, `.env.local`, secrets or Tide credentials.
- After finishing a step, update §8 and §9 of `CONTEXT.md`.
