<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## The Cut project rules

- Use JavaScript and JSX only. Do not add `.ts` or `.tsx` files or TypeScript configuration.
- Treat the current source as authoritative; preserve user work and implement only the precise next task recorded in `NEXT_TASK.md`.
- Better Auth is the only approved authentication system. Use one authoritative Express server and the supported Next.js client; do not implement auth during unrelated tasks.
- Before changing Next.js code, read the relevant installed guide under `node_modules/next/dist/docs/`; installed version and feature details may differ from general knowledge.
- Keep Express as the authority for business operations and authorization once introduced. Never expose database, SMTP, or ImgBB secrets to browser code.
- Treat supplied images as visual references, not as reusable web assets. Record unknowns rather than claiming unsupported details.
- Update `docs/PROGRESS.md` and `NEXT_TASK.md` after each implementation task. Report only commands actually run.
- See `docs/DECISIONS.md` for unresolved choices and `docs/REQUIREMENTS.md` for status labels.
