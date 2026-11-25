# Implementation Checklist

- [x] **Step 1:** Initialize Next.js + TypeScript + Tailwind + shadcn/ui + Prisma/Drizzle schema.
- [x] **Step 2:** Create database seed script with 1 Super Admin, 2 Branches (`Main Branch`, `Dhanmondi Branch`), sample Categories, Brands, Units, and 15 retail products[cite: 1].
- [x] **Step 3:** Build split-screen `/login` page with role-based session handling[cite: 1].
- [x] **Step 4:** Build persistent shell layout (Dark Navy Sidebar + Top Header with Branch Selector)[cite: 1].
- [x] **Step 5:** Implement Catalog CRUD (`/categories`, `/brands`, `/units`, `/products`) + Barcode Print Modal[cite: 1].
- [ ] **Step 6:** Implement Inventory views (`/inventory`, `/inventory/check-in`, `/inventory/check-out`) with atomic `StockMovement` logging[cite: 1].
- [ ] **Step 7:** Build `/pos` terminal with barcode scan handler, cart controls, discount/tax calculator, and 80mm thermal receipt print modal[cite: 1].
- [ ] **Step 8:** Build `/dashboard` analytics (KPI cards, charts, low-stock table, recent sales)[cite: 1].
- [ ] **Step 9:** Build printable `/reports/sales-summary` and `/reports/stock-movement` pages[cite: 1].