import { db } from "@/db";
import { datingProfiles, liveStreams } from "@/db/schema";
import { sql, eq, like } from "drizzle-orm";

export const dynamic = "force-dynamic";

const FAKE = [
  { c: "fake_anna", name: "Анна", age: 24, g: "female", city: "Москва", photo: "/fake/f1.jpg", goal: "Общение", bio: "Люблю музыку и путешествия ✨", live: true, priv: true },
  { c: "fake_lena", name: "Лена", age: 26, g: "female", city: "Санкт-Петербург", photo: "/fake/f2.jpg", goal: "Отношения", bio: "Творческая натура, ищу интересных людей", live: true, priv: false },
  { c: "fake_kira", name: "Кира", age: 22, g: "female", city: "Сочи", photo: "/fake/f3.jpg", goal: "Флирт", bio: "Солнце, море и хорошее настроение 🌊", live: false, priv: true },
  { c: "fake_ivan", name: "Иван", age: 28, g: "male", city: "Москва", photo: "/fake/m1.jpg", goal: "Отношения", bio: "Спорт, кино, вкусный кофе", live: true, priv: false },
  { c: "fake_max", name: "Максим", age: 30, g: "male", city: "Казань", photo: "/fake/m2.jpg", goal: "Дружба", bio: "Ищу единомышленников для общения", live: false, priv: false },
];

async function toDataOrUrl(path: string): Promise<string> {
  // храним просто путь — фронт умеет и с /fake/..., и с data:
  return path;
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clear = searchParams.get("clear") === "1";

    if (clear) {
      await db.delete(datingProfiles).where(like(datingProfiles.clientId, "fake_%"));
      await db.delete(liveStreams).where(like(liveStreams.clientId, "fake_%"));
      return Response.json({ ok: true, cleared: true });
    }

    let created = 0;
    for (const f of FAKE) {
      const photo = await toDataOrUrl(f.photo);
      const existing = await db
        .select()
        .from(datingProfiles)
        .where(eq(datingProfiles.clientId, f.c))
        .limit(1);

      const values = {
        clientId: f.c,
        name: f.name,
        age: f.age,
        gender: f.g,
        orientation: "hetero",
        lookingFor: f.g === "female" ? "male" : "female",
        city: f.city,
        goal: f.goal,
        bio: f.bio,
        photo,
        phone: "+70000000000",
        email: "",
        verified: 1,
        adult: f.priv ? 1 : 0,
        priceTip: 100,
        pricePrivate: 300,
        priceCall: 500,
        updatedAt: new Date(),
      };

      if (existing.length === 0) {
        await db.insert(datingProfiles).values(values);
        created++;
      } else {
        await db
          .update(datingProfiles)
          .set(values)
          .where(eq(datingProfiles.clientId, f.c));
      }

      // фейковые live-трансляции (свежий heartbeat => онлайн)
      if (f.live) {
        const st = {
          clientId: f.c,
          name: f.name,
          photo,
          title: `${f.name} в эфире 💕`,
          isLive: 1,
          viewers: Math.floor(20 + Math.random() * 200),
          likes: Math.floor(50 + Math.random() * 500),
          heartbeatAt: new Date(),
          startedAt: new Date(),
        };
        const ex = await db
          .select()
          .from(liveStreams)
          .where(eq(liveStreams.clientId, f.c))
          .limit(1);
        if (ex.length === 0) await db.insert(liveStreams).values(st);
        else
          await db
            .update(liveStreams)
            .set(st)
            .where(eq(liveStreams.clientId, f.c));
      }
    }

    return Response.json({ ok: true, created });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "seed failed" },
      { status: 500 }
    );
  }
}
