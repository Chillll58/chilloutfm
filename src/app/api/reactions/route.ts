import { db } from "@/db";
import { messageReactions } from "@/db/schema";
import { inArray, and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export type ReactionAgg = {
  counts: Record<string, number>;
  mine: string[];
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids") ?? "";
    const clientId = searchParams.get("clientId") ?? "";
    const ids = idsParam
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n))
      .slice(0, 100);

    if (ids.length === 0) {
      return Response.json({ reactions: {} });
    }

    const rows = await db
      .select()
      .from(messageReactions)
      .where(inArray(messageReactions.messageId, ids));

    const map: Record<number, ReactionAgg> = {};
    for (const id of ids) map[id] = { counts: {}, mine: [] };

    for (const r of rows) {
      const agg = map[r.messageId] ?? { counts: {}, mine: [] };
      agg.counts[r.emoji] = (agg.counts[r.emoji] ?? 0) + 1;
      if (clientId && r.clientId === clientId) agg.mine.push(r.emoji);
      map[r.messageId] = agg;
    }

    return Response.json({ reactions: map });
  } catch {
    return Response.json({ reactions: {} }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      messageId?: number;
      clientId?: string;
      emoji?: string;
    };
    const messageId = Number(body.messageId);
    const clientId = (body.clientId ?? "").trim();
    const emoji = (body.emoji ?? "").trim().slice(0, 8);

    if (!Number.isFinite(messageId) || !clientId || !emoji) {
      return Response.json({ error: "bad request" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.clientId, clientId),
          eq(messageReactions.emoji, emoji)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(messageReactions)
        .where(
          and(
            eq(messageReactions.messageId, messageId),
            eq(messageReactions.clientId, clientId),
            eq(messageReactions.emoji, emoji)
          )
        );
    } else {
      await db
        .insert(messageReactions)
        .values({ messageId, clientId, emoji });
    }

    const rows = await db
      .select()
      .from(messageReactions)
      .where(eq(messageReactions.messageId, messageId));

    const counts: Record<string, number> = {};
    const mine: string[] = [];
    for (const r of rows) {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
      if (r.clientId === clientId) mine.push(r.emoji);
    }

    return Response.json({ agg: { counts, mine } });
  } catch {
    return Response.json({ error: "reaction failed" }, { status: 500 });
  }
}
