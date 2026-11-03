/**
 * Every `.from("table").select("...")` in the app, sent to the hosted Data API with limit=0.
 * PostgREST resolves embeds before any permission check, so a missing relationship (PGRST200) or
 * an ambiguous one (PGRST201, e.g. after a second foreign key between two tables) fails here
 * instead of on a live page. The in-process suite can't see these: it has no PostgREST.
 */
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Local networks without IPv6: same workaround as the e2e dev server.
net.setDefaultAutoSelectFamilyAttemptTimeout(1500);
for (const file of [".env.test.local", ".env.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Missing file: the suite is skipped below.
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const ref = process.env.TEST_PROJECT_REF ?? "";
const safe = Boolean(url && key && ref) && new URL(url).hostname.startsWith(`${ref}.`);

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? sourceFiles(p) : /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

const queries = ["app", "lib", "components"].flatMap(sourceFiles).flatMap((file) => {
  const src = fs.readFileSync(file, "utf8");
  return [...src.matchAll(/\.from\(\s*"([a-z_]+)"\s*\)\s*\.select\(\s*"([^"]*)"/g)].map((m) => ({
    where: `${file}:${src.slice(0, m.index).split("\n").length}`, table: m[1], select: m[2].replace(/\s+/g, ""),
  }));
});

describe.skipIf(!safe)("app queries against the hosted schema", () => {
  it("finds the app's queries", () => expect(queries.length).toBeGreaterThan(40));

  it("every embed resolves to exactly one relationship", async () => {
    const broken: string[] = [];
    for (const q of queries) {
      const res = await fetch(`${url}/rest/v1/${q.table}?select=${encodeURIComponent(q.select)}&limit=0`, { headers: { apikey: key } });
      if (res.ok) continue;
      const body = await res.json();
      if (String(body.code).startsWith("PGRST") || body.code === "42703") broken.push(`${q.where} ${body.code} ${body.message}`);
    }
    expect(broken).toEqual([]);
  });
});
