# Project: Aziz POS (Multi-Branch Retail POS & Inventory System)

## 1. System Overview
Aziz POS is a multi-branch retail Point of Sale (POS) and inventory management web application. It supports centralized super-admin oversight, branch-isolated stock tracking, barcode sticker printing, thermal receipt printing, and auditable stock movement logs[cite: 1].

## 2. Recommended Tech Stack
- **Framework:** Next.js (App Router) with TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** PostgreSQL (Neon or Supabase)
- **ORM:** Prisma or Drizzle ORM
- **Auth:** NextAuth.js / Auth.js (Credentials provider with Role-Based Access Control)
- **Charts:** Recharts or Tremor
- **Barcodes & Printing:** `react-barcode` (Code128) + `react-to-print` (CSS `@media print` thermal formatting)

## 3. Core Database Schema
Implement the following relational models:
- **Branch:** `id`, `name`, `code`, `address`, `phone`, `isActive`, `createdAt`
- **User:** `id`, `name`, `email`, `passwordHash`, `role` (`SUPER_ADMIN`, `BRANCH_MANAGER`, `CASHIER`), `branchId` (nullable for Super Admin)
- **Category:** `id`, `name`, `slug`
- **Brand:** `id`, `name`
- **Unit:** `id`, `name` (e.g., Piece, Kg, Box), `shortName` (e.g., pc, kg, bx)
- **Product:** `id`, `name`, `sku` (unique), `barcode` (unique), `categoryId`, `brandId`, `unitId`, `costPrice`, `sellingPrice`, `lowStockAlert` (integer threshold), `isActive`
- **BranchInventory:** `id`, `branchId`, `productId`, `quantity` (Decimal/Int). *Unique constraint on `[branchId, productId]`.*
- **StockMovement:** `id`, `branchId`, `productId`, `userId`, `type` (`IN` | `OUT`), `reason` (`OPENING_STOCK`, `PURCHASE`, `TRANSFER_IN`, `SALE_RETURN`, `SALE`, `PURCHASE_RETURN`, `DAMAGE`, `EXPIRED`, `TRANSFER_OUT`), `quantityChange`, `previousQty`, `newQty`, `referenceNote`, `createdAt`
- **Sale:** `id`, `invoiceNumber` (unique), `branchId`, `cashierId`, `subtotal`, `discountAmount`, `taxAmount`, `grandTotal`, `paymentMethod` (`CASH`, `CARD`, `MOBILE_BANKING`), `amountPaid`, `changeReturned`, `createdAt`
- **SaleItem:** `id`, `saleId`, `productId`, `quantity`, `unitPrice`, `totalPrice`

## 4. Module Specifications & Execution Order

### Phase 1: Auth, Layout & Branch Context
1. **Split-Screen Login:** Left panel with brand tagline ("Run every branch from one counter") and receipt graphic[cite: 1]; right panel with login form and optional quick-fill demo credential buttons for testing roles[cite: 1].
2. **Global Branch Switcher:** Super Admins see a top-bar dropdown to filter data by "All Branches" or a specific branch[cite: 1]. Branch Managers and Cashiers are locked to their assigned `branchId`.
3. **Sidebar Navigation:** Collapsible dark-navy sidebar containing: `Dashboard`, `POS`, `Catalog` (Categories, Brands, Units, Products), `Inventory` (Current Stock, Stock In, Stock Out), `Branches`, `Users`, and `Reports` (Sales Summary, Stock Movement)[cite: 1].

### Phase 2: Product Catalog & Barcode Generation
1. CRUD tables for **Categories**, **Brands**, and **Units**[cite: 1].
2. **Products Table:** Searchable by name/SKU/barcode[cite: 1]. Row actions include:
   - **Print Barcode:** Opens a modal displaying product name, price, and a scannable Code128 barcode with a "Print Sticker" trigger (`38mm x 25mm` label layout)[cite: 1].
   - **Set Selling Price:** Quick inline modal to update retail pricing[cite: 1].

### Phase 3: Inventory & Auditable Stock Movements
1. **Inventory Overview:** Displays current stock per branch[cite: 1]. Highlights rows in red/amber where `quantity <= lowStockAlert`[cite: 1].
2. **Stock Check-In Form:** Select Branch, Product, Reason (`Opening Stock`, `Purchase`, `Transfer In`, `Sale Return`), Quantity, and Note[cite: 1]. Atomically increments `BranchInventory` and inserts a `StockMovement` record[cite: 1].
3. **Stock Check-Out Form:** Select Branch, Product, Reason (`Purchase Return`, `Damage`, `Expired`, `Transfer Out`), Quantity, and Note[cite: 1]. Validates `currentQty >= outQty`, decrements `BranchInventory`, and logs `StockMovement`[cite: 1].

### Phase 4: Point of Sale (POS) Terminal & Receipt Printing
1. **Two-Column Layout:**
   - **Left (65%):** Branch indicator, instant barcode scanner input (auto-focus on page load + Enter key listener), product search dropdown, and active cart table (`Product`, `Qty +/-`, `Unit Price`, `Subtotal`, `Remove`)[cite: 1].
   - **Right (35%):** Order summary card showing `Subtotal`, editable `Discount` (flat or %), `Tax` (%), bold `Grand Total`, and a prominent `Pay Order` button[cite: 1].
2. **Checkout & Receipt Modal:** Clicking `Pay Order` opens payment confirmation (Cash tendered, change calculation)[cite: 1]. Confirming runs a database transaction to create the `Sale`, deduct `BranchInventory`, log `StockMovement` (`SALE`), and open an 80mm thermal receipt preview with auto-print support[cite: 1].

### Phase 5: Analytics Dashboard & Printable Reports
1. **Dashboard:**
   - 6 KPI Cards: `Today's Sales`, `This Month's Sales`, `Low Stock Items`, `Total Products`, `Active Branches`, `Total Orders`[cite: 1].
   - Charts: `Sales Trend` (line/area chart), `Payment Methods` (donut chart), `Top Products` (horizontal bar chart), `Branch Performance` (bar comparison)[cite: 1].
   - Tables: `Low Stock Alerts` and `Recent Sales`[cite: 1].
2. **Reports Engine:** Filterable by Date Range, Branch, and Movement Type[cite: 1]. Includes a clean `Print / Export PDF` view matching formal business ledger headers (`AZIZ POS`, Branch Name, Date Range, Totals)[cite: 1].