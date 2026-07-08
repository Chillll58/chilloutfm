import { db } from "@/db";
import { datingLikes } from "@/db/schema";
import { sql, and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function ensureSchema() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dating_likes (
        id serial PRIMARY KEY,
        from_client_id text NOT NULL,
        to_profile_id integer NOT NULL,
        value integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS dating_likes_unique ON dating_likes (from_client_id, to_profile_id);`
    );
  } catch {
    /* ignore */
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const b = (await request.json()) as {
      from?: string;
      profileId?: number;
      value?: number;
    };
    const from = (b.from ?? "").trim();
    const profileId = Number(b.profileId);
    const value = Math.min(5, Math.max(1, Number(b.value) || 5));
    if (!from || !Number.isFinite(profileId)) {
      return Response.json({ error: "bad request" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(datingLikes)
      .where(
        and(
          eq(datingLikes.fromClientId, from),
          eq(datingLikes.toProfileId, profileId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(datingLikes)
        .set({ value })
        .where(
          and(
            eq(datingLikes.fromClientId, from),
            eq(datingLikes.toProfileId, profileId)
          )
        );
    } else {
      await db
        .insert(datingLikes)
        .values({ fromClientId: from, toProfileId: profileId, value });
    }

    // recompute
    const rows = await db
      .select()
      .from(datingLikes)
      .where(eq(datingLikes.toProfileId, profileId));
    const count = rows.length;
    const avg = count ? rows.reduce((s, r) => s + r.value, 0) / count : 0;

    return Response.json({ avg, count });
  } catch {
    return Response.json({ error: "rate failed" }, { status: 500 });
  }
}
