import { PGlite, type Transaction } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

/** In-process Postgres with the real migrations + dev seed applied. */
export async function freshDb() {
  const db = new PGlite();
  await db.exec(read("tests/db/supabase-shim.sql"));
  for (const f of readdirSync(path.join(root, "supabase/migrations")).sort()) {
    await db.exec(read(`supabase/migrations/${f}`));
  }
  await db.exec(read("supabase/seed.sql"));
  return db;
}

/** Runs fn as an API caller (anon when uid is null), like PostgREST does. Commits at the end,
 *  so deferred constraint triggers (capacity) fire exactly as in production. */
export async function as<T>(db: PGlite, uid: string | null, fn: (tx: Transaction) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${uid ? "authenticated" : "anon"}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [uid ?? ""]);
    return fn(tx);
  });
}

type Role = "customer" | "professional" | "editor" | "manager" | "admin";
type Status = "pending" | "approved" | "rejected" | "suspended";

/** Signs a user up through the real auth trigger, then sets role/status as the SQL editor would. */
export async function user(db: PGlite, email: string, role: Role = "customer", status: Status = "approved") {
  const { rows } = await db.query<{ id: string }>(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [email, JSON.stringify({ full_name: email.split("@")[0], account_type: role === "professional" ? "professional" : "customer" })],
  );
  const id = rows[0].id;
  await db.query("update public.profiles set role = $2, status = $3 where id = $1", [id, role, status]);
  return id;
}

export async function productId(db: PGlite, slug: string) {
  const { rows } = await db.query<{ id: string }>("select id from public.products where slug = $1", [slug]);
  return rows[0].id;
}

export function isoDate(daysFromToday: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

/** Submits a request through the public RPC and returns its id + reference. */
export async function submit(
  db: PGlite,
  uid: string | null,
  lines: { product_id: string; quantity: number | string; start_date: string; end_date: string }[],
  extra: Record<string, unknown> = {},
  country: "FR" | "TN" = "FR",
) {
  const key = crypto.randomUUID();
  const payload = {
    country,
    customer_name: "Test Client",
    customer_email: `client-${key.slice(0, 8)}@example.com`,
    customer_phone: "+33 6 00 00 00 00",
    lines,
    ...extra,
  };
  const ref = await as(db, uid, async (tx) =>
    (await tx.query<{ ref: string }>("select public.submit_request($1, $2) as ref", [JSON.stringify(payload), key])).rows[0].ref,
  );
  const { rows } = await db.query<{ id: string }>("select id from public.rental_requests where reference = $1", [ref]);
  return { id: rows[0].id, reference: ref, key };
}

export async function issueQuote(db: PGlite, staff: string, requestId: string, currency: "EUR" | "TND" = "EUR") {
  return as(db, staff, async (tx) =>
    (await tx.query<{ id: string }>("select public.issue_quote($1, $2) as id", [requestId, currency])).rows[0].id,
  );
}
