import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, freshDb, migrateFrom, user } from "./harness";

let db: PGlite;
let client: string, pro: string, editor: string, manager: string, manager2: string, admin: string;

beforeAll(async () => {
  db = await freshDb();
  client = await user(db, "c@example.com");
  pro = await user(db, "p@example.com", "professional");
  editor = await user(db, "e@example.com", "editor");
  manager = await user(db, "m@example.com", "manager");
  manager2 = await user(db, "m2@example.com", "manager");
  admin = await user(db, "a@example.com", "admin");
});

const create = (uid: string, label: string) => as(db, uid, async (tx) =>
  (await tx.query<{ id: string }>("insert into public.client_tags (label_fr) values ($1) returning id", [label])).rows[0].id);
const link = (uid: string, profile: string, tag: string) => as(db, uid, (tx) => tx.query("insert into public.client_tag_links (profile_id, tag_id) values ($1, $2)", [profile, tag]));
const count = (uid: string | null, sql: string) => as(db, uid, async (tx) => (await tx.query(sql)).rows.length);

describe("system tags", () => {
  it("seeds the six former flags with their labels", async () => {
    const { rows } = await db.query<{ slug: string; label_fr: string }>("select slug, label_fr from public.client_tags where is_system order by slug");
    expect(rows.map((r) => r.slug)).toEqual(["big_account", "dispute_resolved", "new_partner", "reliable_payer", "vip", "watch"]);
    expect(rows.find((r) => r.slug === "big_account")?.label_fr).toBe("Grand compte");
  });
});

describe("row level security", () => {
  it("lets managers and admins read, create and link; nobody else even sees them", async () => {
    const tag = await create(manager, "Gala 2027");
    await link(manager, client, tag);
    await link(admin, pro, tag);
    for (const uid of [manager, admin]) {
      expect(await count(uid, "select * from public.client_tags")).toBeGreaterThan(6);
      expect(await count(uid, "select * from public.client_tag_links")).toBe(2);
    }
    for (const uid of [client, pro, editor]) {
      expect(await count(uid, "select * from public.client_tags")).toBe(0);
      expect(await count(uid, "select * from public.client_tag_links")).toBe(0);
    }
  });

  it("refuses clients, editors and visitors writing tags or links", async () => {
    const vip = (await db.query<{ id: string }>("select id from public.client_tags where slug = 'vip'")).rows[0].id;
    for (const uid of [client, editor]) {
      await expect(create(uid, "Nope")).rejects.toThrow(/row-level security/);
      await expect(link(uid, client, vip)).rejects.toThrow(/row-level security/);
    }
    await expect(as(db, null, (tx) => tx.query("select * from public.client_tags"))).rejects.toThrow(/permission denied/);
  });

  it("lets staff remove a link, and nobody delete a tag", async () => {
    const tag = await create(manager, "Temporaire");
    await link(manager, client, tag);
    await as(db, manager, (tx) => tx.query("delete from public.client_tag_links where tag_id = $1", [tag]));
    expect((await db.query("select 1 from public.client_tag_links where tag_id = $1", [tag])).rows).toHaveLength(0);
    await expect(as(db, admin, (tx) => tx.query("delete from public.client_tags where id = $1", [tag]))).rejects.toThrow(/permission denied/);
  });
});

describe("names", () => {
  it("are unique whatever the case, accents or spaces", async () => {
    await create(manager, "Très Fidèle");
    for (const dup of ["tres fidele", "TRÈS FIDÈLE", "  très   fidèle "]) await expect(create(manager, dup)).rejects.toThrow(/client_tags_(label|slug)_key/);
    await expect(create(manager, "grand compte")).rejects.toThrow(/client_tags_(label|slug)_key/); // a system tag
  });

  it("take 1 to 40 characters", async () => {
    await expect(create(manager, "   ")).rejects.toThrow(/check constraint/);
    await expect(create(manager, "x".repeat(41))).rejects.toThrow(/check constraint/);
  });

  it("cannot forge the slug, the system flag or the author", async () => {
    const { rows } = await as(db, manager, (tx) => tx.query<{ slug: string; is_system: boolean; created_by: string }>(
      "insert into public.client_tags (label_fr, slug, is_system, created_by) values ('Forgé', 'vip2', true, $1) returning slug, is_system, created_by", [admin]));
    expect(rows[0]).toEqual({ slug: "forge", is_system: false, created_by: manager });
  });
});

describe("renaming and archiving", () => {
  const rename = (uid: string, id: string, label: string) => count(uid, `update public.client_tags set label_fr = '${label}' where id = '${id}' returning 1`);

  it("lets the creator or an admin rename, not another manager", async () => {
    const tag = await create(manager, "Hôtels");
    expect(await rename(manager2, tag, "Pirate")).toBe(0);
    expect(await rename(manager, tag, "Hôtels et riads")).toBe(1);
    expect(await rename(admin, tag, "Hôtellerie")).toBe(1);
    const vip = (await db.query<{ id: string }>("select id from public.client_tags where slug = 'vip'")).rows[0].id;
    expect(await rename(manager, vip, "Pirate")).toBe(0);
  });

  it("lets only admins archive, and keeps the tag on existing clients", async () => {
    const tag = await create(manager, "Ancien");
    await link(manager, client, tag);
    await expect(as(db, manager, (tx) => tx.query("update public.client_tags set archived_at = now() where id = $1", [tag]))).rejects.toThrow(/only an admin/);
    await as(db, admin, (tx) => tx.query("update public.client_tags set archived_at = now() where id = $1", [tag]));
    expect((await db.query("select 1 from public.client_tag_links where tag_id = $1", [tag])).rows).toHaveLength(1);
  });
});

describe("migration of old flags", () => {
  it("turns flags into links, keeps unknown text as a tag and leaves the column in place", async () => {
    const old = await freshDb({ before: "20261101120000" });
    const make = async (email: string) => (await old.query<{ id: string }>("insert into auth.users (email, raw_user_meta_data) values ($1, '{}') returning id", [email])).rows[0].id;
    const a = await make("a@example.com"), b = await make("b@example.com");
    await old.query("insert into public.client_notes (profile_id, flags) values ($1, '{vip,watch}'), ($2, '{vip,Ambassadeur}')", [a, b]);
    await migrateFrom(old, "20261101120000");
    const tags = async (id: string) => (await old.query<{ slug: string }>("select t.slug from public.client_tag_links l join public.client_tags t on t.id = l.tag_id where l.profile_id = $1 order by 1", [id])).rows.map((r) => r.slug);
    expect(await tags(a)).toEqual(["vip", "watch"]);
    expect(await tags(b)).toEqual(["ambassadeur", "vip"]);
    expect((await old.query("select flags from public.client_notes where profile_id = $1", [a])).rows[0]).toEqual({ flags: ["vip", "watch"] });
  });
});
