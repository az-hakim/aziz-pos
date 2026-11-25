import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma skips .env loading once a config file exists; Vercel injects env vars directly.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
