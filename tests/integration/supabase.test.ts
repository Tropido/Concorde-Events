/**
 * Runs against the hosted TEST project only (npm run test:integration).
 * Covers what the in-process suite cannot: Data API grants, the real Auth trigger,
 * Storage policies and true concurrency across separate connections.
 * Test data is tagged (emails @it.concorde.test, slugs it-*) and users are deleted at the end;
 * quotes are immutable by design, so their request rows remain in the test project.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

try {
  process.loadEnvFile(".env.test.local");
} catch {
  // Missing file: suite is skipped below.
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secret = process.env.SUPABASE_SECRET_KEY ?? "";
const testRef = process.env.TEST_PROJECT_REF ?? "";
const configured = Boolean(url && publishable && secret && testRef);
// Refuse to touch any project that is not explicitly declared as the test project.
const safe = configured && new URL(url).hostname.startsWith(`${testRef}.`);

if (!safe) {
  console.warn("SKIPPED integration suite: set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY and a matching TEST_PROJECT_REF in .env.test.local");
}

const run = Date.now().toString(36);
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const service = safe ? createClient(url, secret, opts) : (null as unknown as SupabaseClient);
const anon = safe ? createClient(url, publishable, opts) : (null as unknown as SupabaseClient);
const createdUsers: string[] = [];

async function signedIn(email: string, role?: "manager" | "admin", meta: Record<string, string> = {}) {
  const password = `It-${crypto.randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
  if (error) throw error;
  createdUsers.push(data.user.id);
  if (role) {
    const { error: e } = await service.from("profiles").update({ role, status: "approved" }).eq("id", data.user.id);
    if (e) throw e;
  }
  const client = createClient(url, publishable, opts);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

const day = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

describe.skipIf(!safe)("hosted test project", () => {
  let customerA: Awaited<ReturnType<typeof signedIn>>;
  let customerB: Awaited<ReturnType<typeof signedIn>>;
  let manager: Awaited<ReturnType<typeof signedIn>>;
  let productId: string;

  beforeAll(async () => {
    customerA = await signedIn(`a-${run}@it.concorde.test`);
    customerB = await signedIn(`b-${run}@it.concorde.test`);
    manager = await signedIn(`m-${run}@it.concorde.test`, "manager");

    const { data, error } = await service.from("products")
      .insert({ slug: `it-${run}`, title_fr: `Integration ${run}` }).select("id").single();
    if (error) throw error;
    productId = data.id;
    const stock = await service.from("product_stock").insert({ product_id: productId, country: "FR", quantity_owned: 1 });
    const prices = await service.from("product_prices").insert([
      { product_id: productId, country: "FR", tier: "retail", amount: 100 },
      { product_id: productId, country: "FR", tier: "pro", amount: 80 },
    ]);
    if (stock.error || prices.error) throw stock.error ?? prices.error;
  });

  afterAll(async () => {
    if (productId) await service.from("products").update({ status: "retired" }).eq("id", productId);
    for (const id of createdUsers) await service.auth.admin.deleteUser(id);
  });

  const submit = async (client: SupabaseClient, email: string, start: number, end: number) => {
    const { data, error } = await client.rpc("submit_request", {
      payload: {
        country: "FR", customer_name: "IT", customer_email: email, customer_phone: "+33600000000",
        lines: [{ product_id: productId, quantity: 1, start_date: day(start), end_date: day(end) }],
      },
      idem_key: crypto.randomUUID(),
    });
    if (error) throw error;
    const { data: row } = await service.from("rental_requests").select("id").eq("reference", data).single();
    return row!.id as string;
  };

  it("creates unprivileged profiles even with forged signup metadata", async () => {
    const forged = await signedIn(`f-${run}@it.concorde.test`, undefined, { role: "admin", account_type: "admin" });
    const { data } = await forged.client.from("profiles").select("role, status").eq("id", forged.id).single();
    expect(data).toEqual({ role: "customer", status: "approved" });
    const { error } = await forged.client.from("profiles").update({ role: "admin" }).eq("id", forged.id);
    expect(error?.message).toMatch(/only an admin/);
  });

  it("exposes only intended data to the anonymous key", async () => {
    const pro = await anon.from("product_prices").select("*").eq("tier", "pro");
    expect(pro.error).toBeNull();
    expect(pro.data).toEqual([]);
    const proView = await anon.from("catalogue_prices").select("*").eq("tier", "pro");
    expect(proView.data).toEqual([]);
    for (const table of ["rental_requests", "request_lines", "quotes", "profiles", "client_notes", "messages"]) {
      const { error } = await anon.from(table).select("*").limit(1);
      expect(error?.code, table).toBe("42501");
    }
    const insert = await anon.from("rental_requests").insert({ customer_name: "x" });
    expect(insert.error?.code).toBe("42501");
  });

  it("isolates customers through the Data API", async () => {
    const id = await submit(customerA.client, `a-${run}@it.concorde.test`, 30, 31);
    expect((await customerA.client.from("rental_requests").select("id").eq("id", id)).data).toHaveLength(1);
    expect((await customerB.client.from("rental_requests").select("id").eq("id", id)).data).toEqual([]);
    const cancelOther = await customerB.client.from("rental_requests").update({ status: "cancelled" }).eq("id", id).select();
    expect(cancelOther.data).toEqual([]);
  });

  it("lets exactly one of two simultaneous quotes take the last unit", async () => {
    const first = await submit(customerA.client, `a-${run}@it.concorde.test`, 40, 43);
    const second = await submit(customerB.client, `b-${run}@it.concorde.test`, 41, 44);
    const results = await Promise.all([first, second].map((id) =>
      manager.client.rpc("issue_quote", { p_request: id, p_currency: "EUR" })));
    const ok = results.filter((r) => !r.error);
    const failed = results.filter((r) => r.error);
    expect(ok).toHaveLength(1);
    expect(failed[0].error?.message).toMatch(/capacity_exceeded/);
  });

  it("restricts product image uploads to staff", async () => {
    const file = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" });
    const denied = await customerA.client.storage.from("product-images").upload(`it/${run}-c.jpg`, file);
    expect(denied.error).not.toBeNull();
    const allowed = await manager.client.storage.from("product-images").upload(`it/${run}-m.jpg`, file);
    expect(allowed.error).toBeNull();
    const svg = await manager.client.storage.from("product-images")
      .upload(`it/${run}.svg`, new Blob(["<svg/>"], { type: "image/svg+xml" }));
    expect(svg.error).not.toBeNull();
    await manager.client.storage.from("product-images").remove([`it/${run}-m.jpg`]);
  });
});
