import { db } from "@/db";
import { datingProfiles, datingLikes, liveStreams } from "@/db/schema";
import { sql, eq, and, ne, desc, gte, lte, ilike, or, like, gt } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function ensureSchema() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dating_profiles (
        id serial PRIMARY KEY,
        client_id text NOT NULL,
        name text NOT NULL,
        age integer NOT NULL DEFAULT 18,
        gender text NOT NULL,
        orientation text NOT NULL DEFAULT 'hetero',
        looking_for text NOT NULL DEFAULT 'female',
        city text NOT NULL DEFAULT '',
        goal text NOT NULL DEFAULT '',
        bio text NOT NULL DEFAULT '',
        photo text NOT NULL DEFAULT '',
        min_age integer NOT NULL DEFAULT 18,
        max_age integer NOT NULL DEFAULT 60,
        premium integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS dating_profiles_client_idx ON dating_profiles (client_id);`
    );
    for (const c of [
      "phone text NOT NULL DEFAULT ''",
      "email text NOT NULL DEFAULT ''",
      "password text NOT NULL DEFAULT ''",
      "verified integer NOT NULL DEFAULT 0",
      "hidden text NOT NULL DEFAULT '[]'",
      "adult integer NOT NULL DEFAULT 0",
      "photos text NOT NULL DEFAULT ''",
      "videos text NOT NULL DEFAULT ''",
      "private_photos text NOT NULL DEFAULT ''",
      "price_tip integer NOT NULL DEFAULT 100",
      "price_private integer NOT NULL DEFAULT 300",
      "price_call integer NOT NULL DEFAULT 500",
      "top_until timestamptz",
      "earnings integer NOT NULL DEFAULT 0",
    ]) {
      const col = c.split(" ")[0];
      const def = c.split(" ").slice(1).join(" ");
      await db.execute(
        sql.raw(
          `ALTER TABLE dating_profiles ADD COLUMN IF NOT EXISTS ${col} ${def};`
        )
      );
    }
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

// GET: список анкет с фильтрами, или своя анкета (?me=clientId)
export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const me = searchParams.get("me");

    if (me) {
      const rows = await db
        .select()
        .from(datingProfiles)
        .where(eq(datingProfiles.clientId, me))
        .limit(1);
      const p = rows[0];
      if (p) {
        const withPw = p as typeof p & { password?: string };
        return Response.json({
          profile: { ...p, hasPassword: !!withPw.password, password: undefined },
        });
      }
      return Response.json({ profile: null });
    }

    const clientId = searchParams.get("clientId") ?? "";
    const city = (searchParams.get("city") ?? "").trim();
    let gender = searchParams.get("gender") ?? "";
    const smart = searchParams.get("smart") === "1";
    const minAge = Number(searchParams.get("minAge") ?? "18");
    const maxAge = Number(searchParams.get("maxAge") ?? "99");

    // Умный подбор: определяем, кого показывать, по анкете зрителя
    if (smart && clientId) {
      const mineRows = await db
        .select()
        .from(datingProfiles)
        .where(eq(datingProfiles.clientId, clientId))
        .limit(1);
      const mine = mineRows[0];
      if (mine) {
        if (mine.lookingFor === "male") gender = "male";
        else if (mine.lookingFor === "female") gender = "female";
        // lookingFor === "any" → показываем всех
      }
    }

    const conds = [] as ReturnType<typeof eq>[];
    if (clientId) conds.push(ne(datingProfiles.clientId, clientId));
    if (city) conds.push(ilike(datingProfiles.city, `%${city}%`));
    if (gender === "male" || gender === "female")
      conds.push(eq(datingProfiles.gender, gender));
    conds.push(gte(datingProfiles.age, Number.isFinite(minAge) ? minAge : 18));
    conds.push(lte(datingProfiles.age, Number.isFinite(maxAge) ? maxAge : 99));

    const rows = await db
      .select()
      .from(datingProfiles)
      .where(and(...conds))
      .orderBy(
        // продвинутые в топ — выше (topUntil в будущем), потом по свежести
        sql`CASE WHEN ${datingProfiles.topUntil} > now() THEN 0 ELSE 1 END`,
        desc(datingProfiles.updatedAt)
      )
      .limit(100);

    // подтянуть средний рейтинг
    const ids = rows.map((r) => r.id);
    const ratings: Record<number, { avg: number; count: number }> = {};
    if (ids.length > 0) {
      const likeRows = await db.select().from(datingLikes);
      for (const l of likeRows) {
        if (!ids.includes(l.toProfileId)) continue;
        const cur = ratings[l.toProfileId] ?? { avg: 0, count: 0 };
        cur.avg = (cur.avg * cur.count + l.value) / (cur.count + 1);
        cur.count += 1;
        ratings[l.toProfileId] = cur;
      }
    }

    // какие пользователи сейчас в эфире (по clientId)
    const cutoff = new Date(Date.now() - 20 * 1000);
    const liveRows = await db
      .select()
      .from(liveStreams)
      .where(or(gt(liveStreams.heartbeatAt, cutoff), like(liveStreams.clientId, "fake_%")));
    const liveMap: Record<string, number> = {};
    for (const s of liveRows) liveMap[s.clientId] = s.id;

    return Response.json({
      profiles: rows.map((r) => {
        let hiddenFields: string[] = [];
        try {
          hiddenFields = JSON.parse(r.hidden || "[]");
        } catch {
          hiddenFields = [];
        }
        const out: Record<string, unknown> = {
          ...r,
          phone: "", // телефон всегда скрыт (доступ за оплату)
          email: "", // email не публикуется
          password: undefined, // пароль никогда не отдаём
          privatePhotos: "", // приват-контент скрыт до оплаты
          isTop: r.topUntil ? new Date(r.topUntil) > new Date() : false,
          hiddenFields,
          live: liveMap[r.clientId] !== undefined,
          streamId: liveMap[r.clientId],
          rating: ratings[r.id]?.avg ?? 0,
          ratingCount: ratings[r.id]?.count ?? 0,
        };
        // применяем скрытые пользователем поля
        for (const f of hiddenFields) {
          if (f === "age") out.age = 0;
          if (f === "city") out.city = "";
          if (f === "bio") out.bio = "";
        }
        return out;
      }),
    });
  } catch {
    return Response.json({ profiles: [] }, { status: 500 });
  }
}

// POST: создать / обновить свою анкету
export async function POST(request: Request) {
  try {
    await ensureSchema();
    const b = (await request.json()) as Record<string, unknown>;
    const clientId = String(b.clientId ?? "").trim();
    if (!clientId) {
      return Response.json({ error: "no client" }, { status: 400 });
    }

    const name = String(b.name ?? "").trim().slice(0, 40) || "Аноним";
    const age = Math.min(99, Math.max(18, Number(b.age) || 18));
    const gender = b.gender === "female" ? "female" : "male";
    const orientation = ["hetero", "homo", "bi"].includes(String(b.orientation))
      ? String(b.orientation)
      : "hetero";
    const lookingFor = ["male", "female", "any"].includes(String(b.lookingFor))
      ? String(b.lookingFor)
      : "female";
    const city = String(b.city ?? "").trim().slice(0, 60);
    const goal = String(b.goal ?? "").trim().slice(0, 40);
    const bio = String(b.bio ?? "").trim().slice(0, 600);
    let photo = String(b.photo ?? "").trim();
    if (photo && !photo.startsWith("data:")) photo = "";
    if (photo.length > 8_000_000) {
      return Response.json({ error: "Фото слишком большое" }, { status: 413 });
    }
    const minAge = Math.min(99, Math.max(18, Number(b.minAge) || 18));
    const maxAge = Math.min(99, Math.max(minAge, Number(b.maxAge) || 60));
    const premium = b.premium ? 1 : 0;
    const phone = String(b.phone ?? "").trim().slice(0, 30);
    const adult = b.adult ? 1 : 0;
    const clampArr = (v: unknown) => {
      try {
        const arr = Array.isArray(v) ? v : JSON.parse(String(v || "[]"));
        return JSON.stringify(
          (Array.isArray(arr) ? arr : []).slice(0, 6).filter((x) => typeof x === "string")
        );
      } catch {
        return "[]";
      }
    };
    const photos = clampArr(b.photos);
    const videos = clampArr(b.videos);
    const privatePhotos = clampArr(b.privatePhotos);
    const email = String(b.email ?? "").trim().slice(0, 80);
    const verified = b.verified ? 1 : 0;
    const hidden = (() => {
      try {
        const a = Array.isArray(b.hidden) ? b.hidden : JSON.parse(String(b.hidden || "[]"));
        return JSON.stringify(Array.isArray(a) ? a.filter((x) => typeof x === "string") : []);
      } catch {
        return "[]";
      }
    })();
    const priceTip = Math.min(100000, Math.max(10, Number(b.priceTip) || 100));
    const pricePrivate = Math.min(100000, Math.max(10, Number(b.pricePrivate) || 300));
    const priceCall = Math.min(100000, Math.max(10, Number(b.priceCall) || 500));

    if (!phone) {
      return Response.json(
        { error: "Телефон обязателен для заполнения" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(datingProfiles)
      .where(eq(datingProfiles.clientId, clientId))
      .limit(1);

    const values = {
      clientId,
      name,
      age,
      gender,
      orientation,
      lookingFor,
      city,
      goal,
      bio,
      photo,
      minAge,
      maxAge,
      premium,
      phone,
      email,
      verified,
      hidden,
      adult,
      photos,
      videos,
      privatePhotos,
      priceTip,
      pricePrivate,
      priceCall,
      updatedAt: new Date(),
    };

    let row;
    if (existing.length > 0) {
      [row] = await db
        .update(datingProfiles)
        .set(values)
        .where(eq(datingProfiles.clientId, clientId))
        .returning();
    } else {
      [row] = await db.insert(datingProfiles).values(values).returning();
    }
    return Response.json({ profile: row });
  } catch {
    return Response.json({ error: "save failed" }, { status: 500 });
  }
}
