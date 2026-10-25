// Applies supabase/migrations to the database in SUPABASE_DB_URL (from .env.test.local by default).
// Extra args pass through, e.g. `npm run db:push -- --include-seed` (dev/test project only).
// `--file <path>` runs one SQL data file instead (npm run db:catalogue); it refuses any database
// other than TEST_PROJECT_REF, because those files hold placeholder data.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

process.loadEnvFile(process.env.ENV_FILE ?? ".env.test.local");
const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) throw new Error("SUPABASE_DB_URL is not set");

const cli = fileURLToPath(new URL("../node_modules/supabase/dist/supabase.js", import.meta.url));
const args = process.argv.slice(2);
const at = args.indexOf("--file");
let command = ["db", "push", "--db-url", dbUrl, ...args];
if (at >= 0) {
  const file = args[at + 1];
  const ref = process.env.TEST_PROJECT_REF;
  const { username, hostname } = new URL(dbUrl);
  // Pooler URLs carry the ref in the user (postgres.<ref>), direct ones in the host (db.<ref>.supabase.co).
  const isTest = !!ref && (username === `postgres.${ref}` || hostname === `db.${ref}.supabase.co`);
  if (!file) throw new Error("--file needs a path");
  if (!isTest) throw new Error(`Refusing to run ${file}: SUPABASE_DB_URL is not the TEST project (${ref ?? "TEST_PROJECT_REF unset"}).`);
  command = ["db", "query", "--db-url", dbUrl, "--file", file];
}
const { status } = spawnSync(process.execPath, [cli, ...command], { stdio: "inherit" });
process.exit(status ?? 1);
