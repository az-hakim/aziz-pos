# Aziz POS — agent notes

## Read first, then implement
- Source of truth: `agent.md` (schema + 5 phases), `design.md` (visual/print rules), `rules.md` (binding constraints), `tasks.md` (build checklist). Steps 1–5 of `tasks.md` are done: scaffold, schema/seed, `/login` + sessions, app shell, catalog CRUD + barcode. Steps 6–9 (inventory, POS, dashboard, reports) are not started.
- Read all four before writing code. Implement `tasks.md` steps in order (1 → 9) and check them off as you go. Strip `[cite: 1]` markers; they are source-document artifacts, not product text.

## Constraints that are easy to violate
- Every stock change must update `BranchInventory` and insert a `StockMovement` in the same `db.$transaction`. Block sales/check-out above available stock unless branch `allowNegativeStock` is set.
- `SaleItem.unitPrice` is a sale-time snapshot; later product price edits must not alter old invoices.
- Filter every inventory, sale, and movement query by `branchId`. Roles: `SUPER_ADMIN` all branches, `BRANCH_MANAGER` own branch, `CASHIER` POS + own shift only.
- Zod-validate all server actions and API payloads; disable `Pay Order` until its transaction resolves.

## Stack when you initialize (tasks.md Step 1)
- Next.js App Router + TypeScript, Tailwind + shadcn/ui, PostgreSQL via Prisma 6, Auth.js v5 beta (`next-auth@beta`) credentials + JWT sessions carrying `role` and `branchId`. Prisma 8 RC was rejected: its contract API does not match the `db.$transaction` rule. Use the exact model and enum names in `agent.md` §3.
- Barcode `react-barcode`, printing `react-to-print`. Currency `৳` with 2 decimals and `tabular-nums`; print targets are the 80mm receipt, 38×25mm sticker, and A4 ledger in `design.md`.

## Deployed
- Live app: `https://aziz-pos.vercel.app` (Vercel project `aziz-pos`, team `tlessnoobs-projects`). GitHub: `az-hakim/aziz-pos` on `master`.
- Database: Neon branch `aziz-pos` (`br-soft-credit-au6r3xxv`) in project `young-thunder-17742241`; the branch was reset once because it inherited another app's schema from its parent. `DATABASE_URL` and `AUTH_SECRET` are Vercel secrets, not in git.

## Verify
- Run `npm run build` before `npm run typecheck`: Next 16 generates the `LayoutProps` route types during build, so a fresh clone fails `tsc` alone.
- `npm run lint`; `npx prisma validate`; `npm run db:generate` after schema edits. `npm run db:migrate` and `npm run db:seed` need a live `DATABASE_URL` (copy `.env.example` to `.env`). Seed is idempotent and resets all three demo accounts to password `admin123` on every run.
- `prisma.config.ts` calls `process.loadEnvFile('.env')` because Prisma stops auto-loading `.env` when a config file exists; keep that line when editing the config.
- Demo logins: `admin@azizpos.local` (SUPER_ADMIN), `manager@azizpos.local` (BRANCH_MANAGER), `cashier@azizpos.local` (CASHIER), all password `admin123`. Passwords use scrypt via `src/lib/password.ts`; `src/auth.ts` reuses `verifyPassword`. `AUTH_SECRET` is required in `.env`.
- `next.config.ts` sets `agentRules: false` so Next 16 does not overwrite this curated AGENTS.md with its generated one. Cache Components was disabled: `auth()` reads cookies and cannot prerender under `cacheComponents: true` without Suspense boundaries.
- Authenticated pages live in the `src/app/(app)/` route group; its layout calls `auth()`, loads branches only for `SUPER_ADMIN`, and renders `AppShell`. `/login` stays outside the group.
- Branch selection is client state in `src/components/branch-context.tsx`, mirrored to a `branchId` cookie for future server components. Non-super-admins get no selector and are shown their assigned branch.
- Sidebar items are filtered by role in `src/components/app-shell.tsx`; this is navigation UX only. Server-side role checks live in `src/lib/authz.ts` (`requireRole`) — catalog pages call it; each new page in Steps 6–9 must do the same. Links use `prefetch={false}` because Steps 6–9 routes do not exist yet and prefetching them logs 404s; re-enable once those pages land.
- Catalog: one shared client `src/components/catalog-manager.tsx` drives all four pages; server actions in `src/app/(app)/catalog/actions.ts` Zod-validate and revalidate the route. Prisma `Decimal` must be converted with `.toNumber()` before passing rows to the client component. `react-barcode` is a default import; sticker print size comes from `useReactToPrint`'s `pageStyle` plus the `.print-sticker` rule in `globals.css`.
