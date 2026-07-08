import { db } from "@/db";
import { liveChat, liveStreams } from "@/db/schema";
import { sql, eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function ensureTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS live_chat (
        id serial PRIMARY KEY,
        stream_id integer NOT NULL,
        name text NOT NULL DEFAULT 'Гость',
        text text NOT NULL DEFAULT '',
        kind text NOT NULL DEFAULT 'message',
        amount integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  } catch {
    /* ignore */
  }
}

// GET ?stream=..&after=id
export async function GET(request: Request) {
  try {
    await ensureTable();
    const { searchParams } = new URL(request.url);
    const streamId = Number(searchParams.get("stream"));
    if (!Number.isFinite(streamId)) return Response.json({ messages: [] });
    const rows = await db
      .select()
      .from(liveChat)
      .where(eq(liveChat.streamId, streamId))
      .orderBy(asc(liveChat.createdAt))
      .limit(200);
    return Response.json({ messages: rows.slice(-80) });
  } catch {
    return Response.json({ messages: [] }, { status: 500 });
  }
}

// POST { streamId, name, text, kind, amount }
export async function POST(request: Request) {
  try {
    await ensureTable();
    const b = (await request.json()) as {
      streamId?: number;
      name?: string;
      text?: string;
      kind?: string;
      amount?: number;
    };
    const streamId = Number(b.streamId);
    if (!Number.isFinite(streamId))
      return Response.json({ error: "bad" }, { status: 400 });

    const kind = ["message", "tip", "like"].includes(String(b.kind))
      ? String(b.kind)
      : "message";
    const name = String(b.name ?? "Гость").slice(0, 40);
    const text = String(b.text ?? "").slice(0, 500);
    const amount = Math.max(0, Number(b.amount) || 0);

    if (kind === "message" && !text)
      return Response.json({ error: "empty" }, { status: 400 });

    const [row] = await db
      .insert(liveChat)
      .values({ streamId, name, text, kind, amount })
      .returning();

    // счётчик лайков
    if (kind === "like") {
      await db
        .update(liveStreams)
        .set({ likes: sql`${liveStreams.likes} + 1` })
        .where(eq(liveStreams.id, streamId));
    }

    return Response.json({ message: row });
  } catch {
    return Response.json({ error: "send failed" }, { status: 500 });
  }
}
