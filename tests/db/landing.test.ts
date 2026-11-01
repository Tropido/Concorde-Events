import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, freshDb, user } from "./harness";
import { CATEGORY_ICON_NAMES } from "@/lib/category-icons";

let db: PGlite;
let customer: string, editor: string, manager: string;

beforeAll(async () => {
  db = await freshDb();
  customer = await user(db, "c@example.com");
  editor = await user(db, "e@example.com", "editor");
  manager = await user(db, "m@example.com", "manager");
});

describe("categories", () => {
  it("seeds an icon and tone for the existing categories", async () => {
    const { rows } = await db.query<{ icon: string; tone: string }>("select icon, tone from public.categories where slug = 'lighting'");
    expect(rows[0]).toEqual({ icon: "LampCeiling", tone: "copper" });
  });

  it("accepts exactly the icons the code can draw", async () => {
    const check = (await db.query<{ def: string }>("select pg_get_constraintdef(oid) as def from pg_constraint where conname = 'categories_icon_check'")).rows[0].def;
    expect([...check.matchAll(/'(\w+)'/g)].map((m) => m[1]).sort()).toEqual([...CATEGORY_ICON_NAMES].sort());
    await expect(as(db, manager, (tx) => tx.query("update public.categories set icon = 'Skull' where slug = 'lighting'"))).rejects.toThrow(/check constraint/);
  });

  it("lets staff manage them and nobody else", async () => {
    const ins = "insert into public.categories (slug, name_fr, icon, tone) values ($1, 'Test', 'Gem', 'stone')";
    await as(db, manager, (tx) => tx.query(ins, ["new-one"]));
    await expect(as(db, customer, (tx) => tx.query(ins, ["nope"]))).rejects.toThrow(/row-level security/);
    await expect(as(db, editor, (tx) => tx.query(ins, ["nope"]))).rejects.toThrow(/row-level security/);
  });
});

describe("site-images bucket", () => {
  const ins = "insert into storage.objects (bucket_id, name) values ('site-images', $1)";

  it("takes CMS uploads from editors and above only", async () => {
    await as(db, editor, (tx) => tx.query(ins, ["hero/a.webp"]));
    await as(db, manager, (tx) => tx.query(ins, ["hero/b.webp"]));
    await expect(as(db, customer, (tx) => tx.query(ins, ["hero/c.webp"]))).rejects.toThrow(/row-level security/);
    await expect(as(db, null, (tx) => tx.query(ins, ["hero/d.webp"]))).rejects.toThrow(/row-level security/);
  });

  it("is public, limited to 5 MB of JPEG or WebP", async () => {
    const { rows } = await db.query("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'site-images'");
    expect(rows[0]).toEqual({ public: true, file_size_limit: "5242880", allowed_mime_types: ["image/jpeg", "image/webp"] });
  });
});
