# Engineering & Business Rules: Aziz POS

## 1. Data Integrity & Transactions
- **Atomic Stock Mutations:** Never update `BranchInventory.quantity` directly without creating a corresponding `StockMovement` record inside the exact same database transaction (`db.$transaction`).
- **Negative Stock Prevention:** Block any `SALE` or `Stock Check-Out` if `requestedQuantity > BranchInventory.quantity` unless an explicit `allowNegativeStock` flag is enabled in branch settings.
- **Historical Price Immutability:** `SaleItem.unitPrice` must store a snapshot of the price at the moment of sale. Updating `Product.sellingPrice` later must never alter past invoices.

## 2. Multi-Branch Isolation
- **Strict Tenant Scoping:** Every query for inventory, sales, and stock movements must filter by `branchId`.
- **Role Enforcement:**
  - `SUPER_ADMIN`: Can view/edit all branches and switch active branch context globally[cite: 1].
  - `BRANCH_MANAGER`: Restricted to their assigned `branchId` for inventory, reports, and POS.
  - `CASHIER`: Restricted to the `POS` screen and their own daily shift sales summary.

## 3. POS Terminal Ergonomics
- **Scanner-First Input:** The barcode search bar on `/pos` must capture hardware barcode scanner input automatically without requiring the cashier to click the input box repeatedly.
- **Duplicate Item Handling:** Scanning or selecting a product already in the active cart must increment its `quantity` by `1` rather than adding a duplicate row[cite: 1].
- **Currency Formatting:** Format all currency values consistently using the configured store currency symbol (e.g., `৳` / `BDT`) with 2 decimal places (`1,250.00`)[cite: 1].

## 4. Code Quality Standards
- Validate all server actions and API payloads with `Zod`.
- Handle loading states with skeleton loaders on dashboard KPIs and data tables[cite: 1].
- Prevent double-submission on the `Pay Order` button by disabling it immediately upon click until the transaction resolves[cite: 1].