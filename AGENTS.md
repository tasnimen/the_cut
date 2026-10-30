<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## The Cut project rules

- Use JavaScript and JSX only. Do not add `.ts` or `.tsx` files or TypeScript configuration.
- Treat the current source as authoritative; preserve user work and implement only the precise next task recorded in `NEXT_TASK.md`.
- Better Auth is the only approved authentication system. Keep future server operations inside Next.js Server Actions and Route Handlers; do not add a separate Express server or implement auth during unrelated tasks.
- Before changing Next.js code, read the relevant installed guide under `node_modules/next/dist/docs/`; installed version and feature details may differ from general knowledge.
- Keep Next.js server entry points authoritative for business operations and authorization once introduced. Never expose database, SMTP, Cloudinary or ImgBB secrets to browser code.
- Treat supplied images as visual references, not as reusable web assets. Record unknowns rather than claiming unsupported details.
- Update `docs/PROGRESS.md`, `NEXT_TASK.md` and the technical docs a change touches (SECURITY, ROLE_PERMISSIONS, DATABASE, TESTING, DECISIONS) after each implementation task, document every new permission, route restriction and security rule, and report which docs changed (see CLAUDE.md, "Documentation"). Report only commands actually run; never call a feature complete or verified unless it is.
- See `docs/DECISIONS.md` for unresolved choices and `docs/REQUIREMENTS.md` for status labels.
