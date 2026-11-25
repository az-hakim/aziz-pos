import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient();

const DEMO_PASSWORD = "admin123";

const branches = [
  { name: "Main Branch", code: "MAIN", address: "121 Dhanmondi, Dhaka", phone: "+880 2 0000 0001" },
  { name: "Dhanmondi Branch", code: "DHAN", address: "32 Dhanmondi, Dhaka", phone: "+880 2 0000 0002" },
];

const categories = [
  { name: "Beverages", slug: "beverages" },
  { name: "Snacks", slug: "snacks" },
  { name: "Staples", slug: "staples" },
  { name: "Personal Care", slug: "personal-care" },
  { name: "Household", slug: "household" },
];

const brands = ["Coca-Cola", "Kinley", "Red Bull", "Lay's", "Cadbury", "Dove", "AZ Store"];

const units = [
  { name: "Piece", shortName: "pc" },
  { name: "Kg", shortName: "kg" },
  { name: "Box", shortName: "bx" },
  { name: "Pack", shortName: "pk" },
];

const products = [
  { name: "Coca-Cola 330ml", sku: "AZ-0001", barcode: "8801000000001", category: "beverages", brand: "Coca-Cola", unit: "Pack", costPrice: "28.00", sellingPrice: "40.00", lowStockAlert: 12 },
  { name: "Sprite 330ml", sku: "AZ-0002", barcode: "8801000000002", category: "beverages", brand: "Coca-Cola", unit: "Pack", costPrice: "28.00", sellingPrice: "40.00", lowStockAlert: 12 },
  { name: "Fanta 330ml", sku: "AZ-0003", barcode: "8801000000003", category: "beverages", brand: "Coca-Cola", unit: "Pack", costPrice: "28.00", sellingPrice: "40.00", lowStockAlert: 12 },
  { name: "Kinley Water 1L", sku: "AZ-0004", barcode: "8801000000004", category: "beverages", brand: "Kinley", unit: "Piece", costPrice: "12.00", sellingPrice: "20.00", lowStockAlert: 20 },
  { name: "Red Bull 250ml", sku: "AZ-0005", barcode: "8801000000005", category: "beverages", brand: "Red Bull", unit: "Pack", costPrice: "95.00", sellingPrice: "130.00", lowStockAlert: 8 },
  { name: "Lay's Classic 90g", sku: "AZ-0006", barcode: "8801000000006", category: "snacks", brand: "Lay's", unit: "Pack", costPrice: "55.00", sellingPrice: "75.00", lowStockAlert: 10 },
  { name: "Lay's BBQ 90g", sku: "AZ-0007", barcode: "8801000000007", category: "snacks", brand: "Lay's", unit: "Pack", costPrice: "55.00", sellingPrice: "75.00", lowStockAlert: 10 },
  { name: "Cadbury Dairy Milk", sku: "AZ-0008", barcode: "8801000000008", category: "snacks", brand: "Cadbury", unit: "Piece", costPrice: "45.00", sellingPrice: "60.00", lowStockAlert: 10 },
  { name: "AZ Salted Biscuit", sku: "AZ-0009", barcode: "8801000000009", category: "snacks", brand: "AZ Store", unit: "Pack", costPrice: "18.00", sellingPrice: "25.00", lowStockAlert: 15 },
  { name: "Rice", sku: "AZ-0010", barcode: "8801000000010", category: "staples", brand: "AZ Store", unit: "Kg", costPrice: "95.00", sellingPrice: "120.00", lowStockAlert: 20 },
  { name: "Atta", sku: "AZ-0011", barcode: "8801000000011", category: "staples", brand: "AZ Store", unit: "Kg", costPrice: "48.00", sellingPrice: "60.00", lowStockAlert: 20 },
  { name: "Mustard Oil 1L", sku: "AZ-0012", barcode: "8801000000012", category: "staples", brand: "AZ Store", unit: "Piece", costPrice: "180.00", sellingPrice: "220.00", lowStockAlert: 10 },
  { name: "Dove Shampoo 200ml", sku: "AZ-0013", barcode: "8801000000013", category: "personal-care", brand: "Dove", unit: "Piece", costPrice: "160.00", sellingPrice: "200.00", lowStockAlert: 8 },
  { name: "Dove Bath Soap", sku: "AZ-0014", barcode: "8801000000014", category: "personal-care", brand: "Dove", unit: "Piece", costPrice: "45.00", sellingPrice: "60.00", lowStockAlert: 12 },
  { name: "Facial Tissue Box", sku: "AZ-0015", barcode: "8801000000015", category: "household", brand: "AZ Store", unit: "Box", costPrice: "70.00", sellingPrice: "95.00", lowStockAlert: 8 },
];

async function main() {
  const passwordHash = hashPassword(DEMO_PASSWORD);

  for (const branch of branches) {
    await db.branch.upsert({ where: { code: branch.code }, update: branch, create: branch });
  }

  const mainBranch = await db.branch.findUniqueOrThrow({ where: { code: "MAIN" } });
  const dhanmondiBranch = await db.branch.findUniqueOrThrow({ where: { code: "DHAN" } });

  const users = [
    { name: "Super Admin", email: "admin@azizpos.local", role: Role.SUPER_ADMIN, branchId: null },
    { name: "Main Branch Manager", email: "manager@azizpos.local", role: Role.BRANCH_MANAGER, branchId: mainBranch.id },
    { name: "Dhanmondi Cashier", email: "cashier@azizpos.local", role: Role.CASHIER, branchId: dhanmondiBranch.id },
  ];

  for (const user of users) {
    await db.user.upsert({
      where: { email: user.email },
      update: { ...user, passwordHash },
      create: { ...user, passwordHash },
    });
  }

  for (const category of categories) {
    await db.category.upsert({ where: { slug: category.slug }, update: category, create: category });
  }

  // Brands and units have no natural unique key in the schema; match by name.
  for (const name of brands) {
    if (!(await db.brand.findFirst({ where: { name } }))) await db.brand.create({ data: { name } });
  }
  for (const unit of units) {
    if (!(await db.unit.findFirst({ where: { name: unit.name } }))) await db.unit.create({ data: unit });
  }

  for (const product of products) {
    const { category, brand, unit, ...data } = product;
    const relations = {
      categoryId: (await db.category.findUniqueOrThrow({ where: { slug: category } })).id,
      brandId: (await db.brand.findFirstOrThrow({ where: { name: brand } })).id,
      unitId: (await db.unit.findFirstOrThrow({ where: { name: unit } })).id,
    };
    await db.product.upsert({
      where: { sku: data.sku },
      update: { ...data, ...relations },
      create: { ...data, ...relations },
    });
  }

  await db.storeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  console.log(`Seeded ${branches.length} branches, ${users.length} users, ${categories.length} categories, ${brands.length} brands, ${units.length} units, ${products.length} products and store settings.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
