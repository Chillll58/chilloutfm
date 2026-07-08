import { db } from "@/db";
import { liveStreams } from "@/db/schema";
import { sql, eq, gt, desc, or, like } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function ensureTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS live_streams (
        id serial PRIMARY KEY,
        client_id text NOT NULL,
        name text NOT NULL DEFAULT '',
        photo text NOT NULL DEFAULT '',
        title text NOT NULL DEFAULT '',
        is_live integer NOT NULL DEFAULT 0,
        viewers integer NOT NULL DEFAULT 0,
        likes integer NOT NULL DEFAULT 0,
        heartbeat_at timestamptz NOT NULL DEFAULT now(),
        started_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS live_streams_client_idx ON live_streams (client_id);`
    );
  } catch {
    /* ignore */
  }
}

// стрим считается онлайн, если heartbeat был < 20 сек назад
const ONLINE_WINDOW = "20 seconds";

export async function GET() {
  try {
    await ensureTable();
    const cutoff = new Date(Date.now() - 20 * 1000);
    const rows = await db
      .select()
      .from(liveStreams)
      .where(
        // реальные (свежий heartbeat) ИЛИ демо-стримы (fake_)
        or(gt(liveStreams.heartbeatAt, cutoff), like(liveStreams.clientId, "fake_%"))
      )
      .orderBy(desc(liveStreams.viewers), desc(liveStreams.startedAt))
      .limit(100);
    return Response.json({ streams: rows.map((r) => ({ ...r, isLive: 1 })) });
  } catch {
    return Response.json({ streams: [] }, { status: 500 });
  }
}

// POST { action: start|heartbeat|stop|view, clientId, name, photo, title }
export async function POST(request: Request) {
  try {
    await ensureTable();
    void ONLINE_WINDOW;
    const b = (await request.json()) as Record<string, unknown>;
    const clientId = String(b.clientId ?? "").trim();
    const action = String(b.action ?? "");
    if (!clientId) return Response.json({ error: "no client" }, { status: 400 });

    const existing = await db
      .select()
      .from(liveStreams)
      .where(eq(liveStreams.clientId, clientId))
      .limit(1);

    if (action === "start") {
      const values = {
        clientId,
        name: String(b.name ?? "").slice(0, 40),
        photo: String(b.photo ?? "").startsWith("data:")
          ? String(b.photo)
          : "",
        title: String(b.title ?? "").slice(0, 120),
        isLive: 1,
        viewers: 0,
        likes: 0,
        heartbeatAt: new Date(),
        startedAt: new Date(),
      };
      let row;
      if (existing.length > 0) {
        [row] = await db
          .update(liveStreams)
          .set(values)
          .where(eq(liveStreams.clientId, clientId))
          .returning();
      } else {
        [row] = await db.insert(liveStreams).values(values).returning();
      }
      return Response.json({ stream: row });
    }

    if (action === "heartbeat") {
      const [row] = await db
        .update(liveStreams)
        .set({ heartbeatAt: new Date() })
        .where(eq(liveStreams.clientId, clientId))
        .returning();
      return Response.json({ stream: row });
    }

    if (action === "stop") {
      await db
        .update(liveStreams)
        .set({ isLive: 0, heartbeatAt: new Date(Date.now() - 60000) })
        .where(eq(liveStreams.clientId, clientId));
      return Response.json({ ok: true });
    }

    return Response.json({ error: "bad action" }, { status: 400 });
  } catch {
    return Response.json({ error: "live failed" }, { status: 500 });
  }
}
