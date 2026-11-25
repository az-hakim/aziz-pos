# Design System: Aziz POS

## 1. Visual Direction
Clean, high-contrast administrative dashboard paired with a distraction-free, keyboard-friendly POS terminal[cite: 1]. Prioritizes scannability, dense tabular clarity, and zero visual clutter during fast retail checkouts[cite: 1].

## 2. Color Palette
- **Sidebar Background:** Deep Navy (`#0F172A` / `slate-900`)
- **Sidebar Active Item:** Crisp Blue (`#2563EB` / `blue-600`) with white text
- **App Canvas Background:** Cool Light Gray (`#F8FAFC` / `slate-50`)
- **Card & Table Surfaces:** Pure White (`#FFFFFF`) with subtle `1px solid #E2E8F0` (`slate-200`) borders
- **Primary Action Button:** Royal Blue (`#2563EB`, hover `#1D4ED8`)
- **Destructive / Stock-Out Action:** Crimson Red (`#DC2626`, hover `#B91C1C`)
- **Typography:**
  - Primary Text: `#0F172A` (`slate-900`)
  - Muted Labels: `#64748B` (`slate-500`)
  - Status Badges: Emerald (`#10B981`) for In Stock, Amber (`#F59E0B`) for Low Stock, Rose (`#EF4444`) for Out of Stock.

## 3. Typography & Numbers
- **Font Family:** `Inter` or `Plus Jakarta Sans` for UI; `JetBrains Mono` for SKUs, barcodes, invoice numbers, and receipt previews.
- **Tabular Numerals:** Apply `tabular-nums` (`font-variant-numeric: tabular-nums`) to all currency columns, stock quantities, and KPI counters so vertical columns align cleanly.

## 4. Print Stylesheets (`@media print`)
1. **80mm Thermal Receipt:**
   - Page width: `80mm`, margin: `2mm`.
   - Hide all navigation, modals, and buttons.
   - Monospace alignment: Store Name (centered, bold), Branch Address, Invoice #, Date/Time, dashed separator, itemized list (`Item`, `Qty`, `Price`), Subtotal, Discount, Tax, Grand Total, and barcode/thank-you footer[cite: 1].
2. **Barcode Sticker (`38mm x 25mm`):**
   - Centered layout: Store Name (8pt), Product Name (9pt truncated), Code128 SVG Barcode, SKU + Price (10pt bold)[cite: 1].
3. **A4 Ledger Reports:**
   - Standard A4 portrait/landscape with repeating table headers (`thead { display: table-header-group; }`), bordered cells, and summary footer totals[cite: 1].