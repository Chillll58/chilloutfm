import { db } from "@/db";
import { premiumSubscribers } from "@/db/schema";
import { sql, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Настраивается в VK: Управление сообществом → Работа с API → Callback API
const CONFIRMATION = process.env.VK_CONFIRMATION_CODE || "";
const SECRET = process.env.VK_SECRET || "";

async function ensureTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS premium_subscribers (
        id serial PRIMARY KEY,
        vk_user_id text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS premium_subscribers_vk_id_idx
      ON premium_subscribers (vk_user_id);
    `);
  } catch {
    /* ignore */
  }
}

async function setPremium(vkUserId: string, active: boolean) {
  await ensureTable();
  const status = active ? "active" : "expired";
  const existing = await db
    .select()
    .from(premiumSubscribers)
    .where(eq(premiumSubscribers.vkUserId, vkUserId))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(premiumSubscribers)
      .set({ status })
      .where(eq(premiumSubscribers.vkUserId, vkUserId));
  } else if (active) {
    await db.insert(premiumSubscribers).values({ vkUserId, status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type?: string;
      secret?: string;
      object?: { user_id?: number | string };
    };

    // VK verification handshake
    if (body.type === "confirmation") {
      return new Response(CONFIRMATION, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    // optional secret check
    if (SECRET && body.secret && body.secret !== SECRET) {
      return new Response("ok", { headers: { "Content-Type": "text/plain" } });
    }

    const vkUserId = String(body.object?.user_id ?? "").trim();

    if (vkUserId) {
      if (
        body.type === "donut_subscription_create" ||
        body.type === "donut_subscription_prolonged"
      ) {
        await setPremium(vkUserId, true);
      } else if (
        body.type === "donut_subscription_expired" ||
        body.type === "donut_subscription_cancelled"
      ) {
        await setPremium(vkUserId, false);
      }
    }

    // VK expects a plain "ok"
    return new Response("ok", { headers: { "Content-Type": "text/plain" } });
  } catch {
    return new Response("ok", { headers: { "Content-Type": "text/plain" } });
  }
}
