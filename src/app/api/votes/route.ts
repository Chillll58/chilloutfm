import { db } from "@/db";
import { trackVotes } from "@/db/schema";
import { inArray, and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export type VoteAgg = {
  up: number;
  down: number;
  score: number;
  mine: 0 | 1 | -1;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids") ?? "";
    const clientId = searchParams.get("clientId") ?? "";
    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 100);

    if (ids.length === 0) {
      return Response.json({ votes: {} });
    }

    const rows = await db
      .select()
      .from(trackVotes)
      .where(inArray(trackVotes.songid, ids));

    const map: Record<string, VoteAgg> = {};
    for (const id of ids) {
      map[id] = { up: 0, down: 0, score: 0, mine: 0 };
    }
    for (const r of rows) {
      const agg = map[r.songid] ?? { up: 0, down: 0, score: 0, mine: 0 };
      if (r.value > 0) agg.up += 1;
      else if (r.value < 0) agg.down += 1;
      agg.score = agg.up - agg.down;
      if (clientId && r.clientId === clientId) {
        agg.mine = r.value > 0 ? 1 : -1;
      }
      map[r.songid] = agg;
    }

    return Response.json({ votes: map });
  } catch {
    return Response.json({ votes: {} }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      songid?: string;
      clientId?: string;
      value?: number;
    };
    const songid = (body.songid ?? "").trim();
    const clientId = (body.clientId ?? "").trim();
    const value = body.value === 1 ? 1 : body.value === -1 ? -1 : 0;

    if (!songid || !clientId) {
      return Response.json({ error: "bad request" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(trackVotes)
      .where(
        and(eq(trackVotes.songid, songid), eq(trackVotes.clientId, clientId))
      )
      .limit(1);

    if (existing.length > 0) {
      if (value === 0 || existing[0].value === value) {
        // toggle off
        await db
          .delete(trackVotes)
          .where(
            and(
              eq(trackVotes.songid, songid),
              eq(trackVotes.clientId, clientId)
            )
          );
      } else {
        await db
          .update(trackVotes)
          .set({ value })
          .where(
            and(
              eq(trackVotes.songid, songid),
              eq(trackVotes.clientId, clientId)
            )
          );
      }
    } else if (value !== 0) {
      await db.insert(trackVotes).values({ songid, clientId, value });
    }

    const rows = await db
      .select()
      .from(trackVotes)
      .where(eq(trackVotes.songid, songid));

    let up = 0;
    let down = 0;
    let mine: 0 | 1 | -1 = 0;
    for (const r of rows) {
      if (r.value > 0) up += 1;
      else if (r.value < 0) down += 1;
      if (r.clientId === clientId) mine = r.value > 0 ? 1 : -1;
    }

    return Response.json({
      agg: { up, down, score: up - down, mine },
    });
  } catch {
    return Response.json({ error: "vote failed" }, { status: 500 });
  }
}
