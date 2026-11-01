import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, freshDb, isoDate, productId, submit, user } from "./harness";

let db: PGlite;
let sofa: string;
const language = async (table: string, id: string) =>
  (await db.query<{ language: string }>(`select language from public.${table} where id = $1`, [id])).rows[0].language;
const signUp = async (email: string, meta: Record<string, unknown>) =>
  (await db.query<{ id: string }>("insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id", [email, JSON.stringify(meta)])).rows[0].id;

beforeAll(async () => {
  db = await freshDb();
  sofa = await productId(db, "kasaya-curved-sofa");
});

describe("client language", () => {
  const line = () => ({ product_id: sofa, quantity: 1, start_date: isoDate(10), end_date: isoDate(11) });

  it("comes from the cookie at signup, and anything else is French", async () => {
    expect(await language("profiles", await signUp("en@example.com", { language: "en" }))).toBe("en");
    expect(await language("profiles", await signUp("de@example.com", { language: "de" }))).toBe("fr");
  });

  it("is stored on guest requests, and a signed-in client falls back to their profile", async () => {
    expect(await language("rental_requests", (await submit(db, null, [line()], { language: "ar" })).id)).toBe("ar");
    expect(await language("rental_requests", (await submit(db, null, [line()], { language: "xx" })).id)).toBe("fr");
    const client = await signUp("c-en@example.com", { language: "en" });
    expect(await language("rental_requests", (await submit(db, client, [line()])).id)).toBe("en");
  });

  it("is editable by its owner", async () => {
    const client = await user(db, "self@example.com");
    await as(db, client, (tx) => tx.query("update public.profiles set language = 'en' where id = $1", [client]));
    expect(await language("profiles", client)).toBe("en");
    await expect(as(db, client, (tx) => tx.query("update public.profiles set language = 'de' where id = $1", [client]))).rejects.toThrow(/check constraint/);
  });
});

describe("content", () => {
  it("accepts English CMS content", async () => {
    const editor = await user(db, "ed@example.com", "editor");
    await as(db, editor, (tx) => tx.query("insert into public.cms_content (locale, content) values ('en', '{}')"));
    await expect(as(db, editor, (tx) => tx.query("insert into public.cms_content (locale, content) values ('de', '{}')"))).rejects.toThrow(/check constraint/);
  });

  it("names the programme tiers in English", async () => {
    const { rows } = await db.query<{ name_en: string; benefits_en: string[] }>("select name_en, benefits_en from public.pro_tiers where code = 'or'");
    expect(rows[0].name_en).toBe("Gold");
    expect(rows[0].benefits_en).toHaveLength(3);
  });
});
