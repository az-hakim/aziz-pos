# Aziz POS

Multi-branch retail POS and inventory system.

Live: https://aziz-pos.vercel.app — demo logins use password `admin123`.

- `agent.md` — system spec, database schema, and phases
- `design.md` — design system and print layouts
- `rules.md` — binding engineering and business rules
- `tasks.md` — implementation checklist (work in order)
- `AGENTS.md` — agent workflow and verify commands

Setup: copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm install`, `npm run db:migrate`, and `npm run db:seed` (demo password: `admin123`).
