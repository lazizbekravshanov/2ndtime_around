// Picks the Prisma datasource provider based on DATABASE_URL.
// Prisma cannot read the provider from an env var, so we rewrite the one
// line in schema.prisma: postgres URL -> "postgresql", otherwise SQLite
// (local dev fallback, file:./dev.db).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(root, "prisma/schema.prisma");
const envPath = resolve(root, ".env");

// Load .env manually (this script runs before any deps are guaranteed).
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
}

const url = process.env.DATABASE_URL ?? "";
const wantsPostgres = url.startsWith("postgres");
const provider = wantsPostgres ? "postgresql" : "sqlite";

if (!wantsPostgres && !process.env.DATABASE_URL) {
  // No DATABASE_URL at all: point Prisma at the local SQLite file.
  process.env.DATABASE_URL = "file:./dev.db";
  const envBody = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  if (!/^DATABASE_URL=/m.test(envBody)) {
    writeFileSync(envPath, envBody + '\nDATABASE_URL="file:./dev.db"\n');
    console.log("[db:prepare] No DATABASE_URL found — defaulting to SQLite (file:./dev.db)");
  }
}

const schema = readFileSync(schemaPath, "utf8");
const updated = schema.replace(
  /provider\s*=\s*"(?:sqlite|postgresql)"/,
  `provider = "${provider}"`
);
if (updated !== schema) {
  writeFileSync(schemaPath, updated);
  console.log(`[db:prepare] Prisma provider set to "${provider}"`);
}
