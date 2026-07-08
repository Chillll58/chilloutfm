import { db } from "@/db";
import { datingMessages } from "@/db/schema";
import { sql, or, and, eq, asc, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function ensureSchema() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dating_messages (
        id serial PRIMARY KEY,
        from_client_id text NOT NULL,
        to_client_id text NOT NULL,
        text text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  } catch {
    /* ignore */
  }
}

// GET ?me=..&with=..  → переписка двух пользователей
// GET ?me=..          → список диалогов (последние сообщения)
export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const me = (searchParams.get("me") ?? "").trim();
    const withUser = (searchParams.get("with") ?? "").trim();
    if (!me) return Response.json({ messages: [] });

    if (withUser) {
      const rows = await db
        .select()
        .from(datingMessages)
        .where(
          or(
            and(
              eq(datingMessages.fromClientId, me),
              eq(datingMessages.toClientId, withUser)
            ),
            and(
              eq(datingMessages.fromClientId, withUser),
              eq(datingMessages.toClientId, me)
            )
          )
        )
        .orderBy(asc(datingMessages.createdAt))
        .limit(200);
      return Response.json({ messages: rows });
    }

    // dialog list: all messages involving me, newest first
    const rows = await db
      .select()
      .from(datingMessages)
      .where(
        or(
          eq(datingMessages.fromClientId, me),
          eq(datingMessages.toClientId, me)
        )
      )
      .orderBy(desc(datingMessages.createdAt))
      .limit(200);

    // group by the other participant
    const seen = new Set<string>();
    const dialogs: { withClientId: string; lastText: string; at: string }[] =
      [];
    for (const m of rows) {
      const other = m.fromClientId === me ? m.toClientId : m.fromClientId;
      if (seen.has(other)) continue;
      seen.add(other);
      dialogs.push({
        withClientId: other,
        lastText: m.text,
        at: String(m.createdAt),
      });
    }
    return Response.json({ dialogs });
  } catch {
    return Response.json({ messages: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const b = (await request.json()) as {
      from?: string;
      to?: string;
      text?: string;
    };
    const from = (b.from ?? "").trim();
    const to = (b.to ?? "").trim();
    const text = (b.text ?? "").trim().slice(0, 1000);
    if (!from || !to || !text) {
      return Response.json({ error: "bad request" }, { status: 400 });
    }
    const [row] = await db
      .insert(datingMessages)
      .values({ fromClientId: from, toClientId: to, text })
      .returning();
    return Response.json({ message: row });
  } catch {
    return Response.json({ error: "send failed" }, { status: 500 });
  }
}
