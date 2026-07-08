import { db } from "@/db";
import { datingPosts } from "@/db/schema";
import { sql, eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function ensureTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dating_posts (
        id serial PRIMARY KEY,
        client_id text NOT NULL,
        text text NOT NULL DEFAULT '',
        image text NOT NULL DEFAULT '',
        likes integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  } catch {
    /* ignore */
  }
}

// GET ?client=..  → посты пользователя
export async function GET(request: Request) {
  try {
    await ensureTable();
    const { searchParams } = new URL(request.url);
    const client = (searchParams.get("client") ?? "").trim();
    const q = db.select().from(datingPosts).orderBy(desc(datingPosts.createdAt)).limit(100);
    const rows = client
      ? await db
          .select()
          .from(datingPosts)
          .where(eq(datingPosts.clientId, client))
          .orderBy(desc(datingPosts.createdAt))
          .limit(100)
      : await q;
    return Response.json({ posts: rows });
  } catch {
    return Response.json({ posts: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureTable();
    const b = (await request.json()) as {
      clientId?: string;
      text?: string;
      image?: string;
    };
    const clientId = (b.clientId ?? "").trim();
    const text = (b.text ?? "").trim().slice(0, 1000);
    let image = (b.image ?? "").trim();
    if (image && !image.startsWith("data:")) image = "";
    if (image.length > 8_000_000) image = "";
    if (!clientId || (!text && !image)) {
      return Response.json({ error: "empty" }, { status: 400 });
    }
    const [row] = await db
      .insert(datingPosts)
      .values({ clientId, text, image })
      .returning();
    return Response.json({ post: row });
  } catch {
    return Response.json({ error: "save failed" }, { status: 500 });
  }
}

// PATCH { id } → лайк поста
export async function PATCH(request: Request) {
  try {
    await ensureTable();
    const b = (await request.json()) as { id?: number };
    const id = Number(b.id);
    if (!Number.isFinite(id)) return Response.json({ error: "bad" }, { status: 400 });
    const [row] = await db
      .update(datingPosts)
      .set({ likes: sql`${datingPosts.likes} + 1` })
      .where(eq(datingPosts.id, id))
      .returning();
    return Response.json({ post: row });
  } catch {
    return Response.json({ error: "like failed" }, { status: 500 });
  }
}

// DELETE ?id=..&client=..
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    const client = (searchParams.get("client") ?? "").trim();
    if (!Number.isFinite(id) || !client)
      return Response.json({ error: "bad" }, { status: 400 });
    await db
      .delete(datingPosts)
      .where(and(eq(datingPosts.id, id), eq(datingPosts.clientId, client)));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "del failed" }, { status: 500 });
  }
}
