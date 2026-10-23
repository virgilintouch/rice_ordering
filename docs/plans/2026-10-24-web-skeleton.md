# Web Skeleton Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Next.js local admin skeleton on port 3721 with DB-backed read-only filtered lists for orders, customers, prices, and users.

**Architecture:** App Router pages query PostgreSQL via `pg` pool in `lib/db.ts`. Shared nav layout. Health route checks DB.

**Tech Stack:** Next.js (App Router), TypeScript, `pg`, plain CSS

**Spec:** `docs/specs/2026-10-24-web-skeleton.md`

## Global Constraints

- Port `3721` via `APP_PORT` / `next dev -p`
- Never expose `password_hash`
- Parameterized SQL only
- List limit 200
- No auth, no writes, no reports this phase

---

### Task 1: Scaffold Next.js + DB client + health

**Files:** `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `lib/db.ts`, `app/api/health/route.ts`, `.env.example`, `.gitignore` (Node already present)

- [ ] Add Next.js deps and scripts (`dev` on 3721)
- [ ] Implement `lib/db.ts` pool from env
- [ ] Implement `GET /api/health`
- [ ] Verify `npm install` and health against local DB

### Task 2: Layout + four list pages

**Files:** `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/orders/page.tsx`, `app/customers/page.tsx`, `app/prices/page.tsx`, `app/users/page.tsx`, optional `lib/queries/*.ts`

- [ ] Nav shell
- [ ] Each page: searchParams filters + table
- [ ] Home redirects or links to sections

### Task 3: Docs + smoke check

**Files:** `README.md`, `docs/PROGRESS.md`

- [ ] Document how to run
- [ ] `npm run build` or `npm run dev` smoke
