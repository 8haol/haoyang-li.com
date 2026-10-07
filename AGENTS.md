<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Working in this repo

This repository is public and doubles as a portfolio. Keep the history clean and professional.

## Flow for every change

1. Start from an up-to-date `main`: `git switch main && git pull`.
2. Branch: `<type>/<short-kebab-description>`, e.g. `feat/retell-voice`, `fix/hero-mobile-layout`.
3. Commit in small, single-purpose steps (format below).
4. Before pushing, run `npm run lint && npm run typecheck && npm test && npm run build`. Do not push red.
5. Push the branch and open a PR with `gh pr create`, filling in the template.
6. Merge only after CI passes, with "Squash and merge"; the branch is deleted automatically.

`main` is protected: no direct pushes, no force pushes, and the `check` CI job must pass. Never try to bypass it.

## Commits and PR titles

[Conventional Commits](https://www.conventionalcommits.org/), in English, imperative mood, ≤ 72 characters:

```
feat(agent): add Retell voice call
fix(hero): stop the name overflowing on small phones
refactor(stage): extract card deformation into stageMath
docs: add screenshots to README
chore(deps): bump next to 16.4
```

Types: `feat`, `fix`, `refactor`, `perf`, `style`, `test`, `docs`, `chore`, `ci`. One logical change per commit; if the message needs "and", split it. Add a body only to explain *why*.

## Identity

Commits are authored as `Haoyang Li <188928838+8haol@users.noreply.github.com>` (set in this clone's git config; set it again after a fresh clone). Do not add `Co-Authored-By` trailers or "Generated with" lines to commits or PRs.

## Never commit

- Secrets or `.env*` files.
- Client names, internal URLs or employer data. `tests/bannedTerms.ts` guards client names by hash; never write the names in plain text, even in tests or docs.
- Debug leftovers: `console.log`, commented-out blocks, scratch files.
- Generated output (`.next/`, `*.tsbuildinfo`, `next-env.d.ts`) or large binaries beyond the images the site needs.
