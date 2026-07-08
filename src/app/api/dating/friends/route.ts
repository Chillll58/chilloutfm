import { db } from "@/db";
import { datingFriends } from "@/db/schema";
import { sql, eq, and, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function ensureTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dating_friends (
        id serial PRIMARY KEY,
        from_client_id text NOT NULL,
        to_client_id text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS dating_friends_pair_idx ON dating_friends (from_client_id, to_client_id);`
    );
  } catch {
    /* ignore */
  }
}

// GET ?me=..  → списки друзей и заявок
export async function GET(request: Request) {
  try {
    await ensureTable();
    const { searchParams } = new URL(request.url);
    const me = (searchParams.get("me") ?? "").trim();
    if (!me) return Response.json({ friends: [], incoming: [], outgoing: [] });

    const rows = await db
      .select()
      .from(datingFriends)
      .where(
        or(
          eq(datingFriends.fromClientId, me),
          eq(datingFriends.toClientId, me)
        )
      );

    const friends: string[] = [];
    const incoming: string[] = [];
    const outgoing: string[] = [];
    for (const r of rows) {
      if (r.status === "accepted") {
        friends.push(r.fromClientId === me ? r.toClientId : r.fromClientId);
      } else if (r.status === "pending") {
        if (r.toClientId === me) incoming.push(r.fromClientId);
        else outgoing.push(r.toClientId);
      }
    }
    return Response.json({ friends, incoming, outgoing });
  } catch {
    return Response.json({ friends: [], incoming: [], outgoing: [] }, { status: 500 });
  }
}

// POST { from, to, action: "add" | "accept" | "remove" }
export async function POST(request: Request) {
  try {
    await ensureTable();
    const b = (await request.json()) as {
      from?: string;
      to?: string;
      action?: string;
    };
    const from = (b.from ?? "").trim();
    const to = (b.to ?? "").trim();
    if (!from || !to || from === to) {
      return Response.json({ error: "bad" }, { status: 400 });
    }

    if (b.action === "add") {
      const existing = await db
        .select()
        .from(datingFriends)
        .where(
          and(
            eq(datingFriends.fromClientId, from),
            eq(datingFriends.toClientId, to)
          )
        )
        .limit(1);
      if (existing.length === 0) {
        await db
          .insert(datingFriends)
          .values({ fromClientId: from, toClientId: to, status: "pending" });
      }
      return Response.json({ ok: true });
    }

    if (b.action === "accept") {
      // to принял заявку от from
      await db
        .update(datingFriends)
        .set({ status: "accepted" })
        .where(
          and(
            eq(datingFriends.fromClientId, to),
            eq(datingFriends.toClientId, from)
          )
        );
      return Response.json({ ok: true });
    }

    if (b.action === "remove") {
      await db
        .delete(datingFriends)
        .where(
          or(
            and(
              eq(datingFriends.fromClientId, from),
              eq(datingFriends.toClientId, to)
            ),
            and(
              eq(datingFriends.fromClientId, to),
              eq(datingFriends.toClientId, from)
            )
          )
        );
      return Response.json({ ok: true });
    }

    return Response.json({ error: "bad action" }, { status: 400 });
  } catch {
    return Response.json({ error: "friend failed" }, { status: 500 });
  }
}
