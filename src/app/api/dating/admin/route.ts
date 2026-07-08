import { db } from "@/db";
import {
  datingPayments,
  datingProfiles,
  datingPayouts,
} from "@/db/schema";
import { sql, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ADMIN_KEY = process.env.DATING_ADMIN_KEY || process.env.CHAT_ADMIN_KEY || "chillout-admin";

function isAdmin(request: Request): boolean {
  const key = request.headers.get("x-admin-key") ?? "";
  return key.length > 0 && key === ADMIN_KEY;
}

async function ensure() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dating_payouts (
        id serial PRIMARY KEY,
        profile_id integer NOT NULL,
        profile_name text NOT NULL DEFAULT '',
        amount integer NOT NULL,
        note text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  } catch {
    /* ignore */
  }
}

// GET: сводка для админа
export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "Нет доступа" }, { status: 401 });
  }
  try {
    await ensure();

    // все платежи (последние 200)
    const payments = await db
      .select()
      .from(datingPayments)
      .orderBy(desc(datingPayments.createdAt))
      .limit(200);

    // все выплаты
    const payouts = await db
      .select()
      .from(datingPayouts)
      .orderBy(desc(datingPayouts.createdAt))
      .limit(200);

    // профили с заработком
    const profiles = await db
      .select()
      .from(datingProfiles)
      .orderBy(desc(datingProfiles.earnings))
      .limit(200);

    // итоги (только оплаченные)
    let totalGross = 0;
    let totalPlatform = 0;
    let totalEarner = 0;
    for (const p of payments) {
      if (p.status !== "paid") continue;
      totalGross += p.amount;
      totalPlatform += p.platformShare;
      totalEarner += p.earnerShare;
    }
    const totalPaidOut = payouts.reduce((s, x) => s + x.amount, 0);

    // баланс к выплате по каждому исполнителю = earnings - выплачено
    const paidByProfile: Record<number, number> = {};
    for (const po of payouts) {
      paidByProfile[po.profileId] = (paidByProfile[po.profileId] ?? 0) + po.amount;
    }

    const earners = profiles
      .filter((p) => (p.earnings ?? 0) > 0 || paidByProfile[p.id])
      .map((p) => ({
        id: p.id,
        name: p.name,
        photo: p.photo,
        earned: p.earnings ?? 0,
        paidOut: paidByProfile[p.id] ?? 0,
        balance: (p.earnings ?? 0) - (paidByProfile[p.id] ?? 0),
      }));

    return Response.json({
      ok: true,
      summary: {
        totalGross, // всего получено (руб.)
        totalPlatform, // моя доля (30% + продвижения/премиум)
        totalEarner, // причитается исполнителям (70%)
        totalPaidOut, // уже выплачено
        toPayOut: totalEarner - totalPaidOut, // осталось выплатить
      },
      payments,
      payouts,
      earners,
    });
  } catch {
    return Response.json({ error: "failed" }, { status: 500 });
  }
}

// POST: провести выплату исполнителю
export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "Нет доступа" }, { status: 401 });
  }
  try {
    await ensure();
    const b = (await request.json()) as {
      profileId?: number;
      amount?: number;
      note?: string;
    };
    const profileId = Number(b.profileId);
    const amount = Math.max(1, Math.floor(Number(b.amount) || 0));
    if (!Number.isFinite(profileId) || amount < 1) {
      return Response.json({ error: "bad request" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(datingProfiles)
      .where(eq(datingProfiles.id, profileId))
      .limit(1);
    const prof = rows[0];
    if (!prof) return Response.json({ error: "no profile" }, { status: 404 });

    await db.insert(datingPayouts).values({
      profileId,
      profileName: prof.name,
      amount,
      note: String(b.note ?? "").slice(0, 200),
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "payout failed" }, { status: 500 });
  }
}

// POST verify (проверка ключа админа)
export async function PUT(request: Request) {
  try {
    const b = (await request.json()) as { key?: string };
    const key = (b.key ?? "").trim();
    if (key && key === ADMIN_KEY) {
      return Response.json({ ok: true });
    }
    return Response.json({ ok: false }, { status: 401 });
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
}
