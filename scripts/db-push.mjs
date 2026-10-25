// Applies supabase/migrations to the database in SUPABASE_DB_URL (from .env.test.local by default).
// Extra args pass through, e.g. `npm run db:push -- --include-seed` (dev/test project only).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

process.loadEnvFile(process.env.ENV_FILE ?? ".env.test.local");
const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) throw new Error("SUPABASE_DB_URL is not set");

const cli = fileURLToPath(new URL("../node_modules/supabase/dist/supabase.js", import.meta.url));
const { status } = spawnSync(process.execPath, [cli, "db", "push", "--db-url", dbUrl, ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exit(status ?? 1);
