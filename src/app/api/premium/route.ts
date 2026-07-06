import { db } from "@/db";
import { premiumSubscribers } from "@/db/schema";
import { sql, eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Резервный код (на случай ручной выдачи). Основной путь — авто через VK Donut.
const PREMIUM_CODE = process.env.PREMIUM_CODE || "CHILL-PREMIUM";

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

export async function POST(request: Request) {
  try {
    await ensureTable();
    const body = (await request.json()) as {
      mode?: "vk" | "code";
      vkUserId?: string;
      code?: string;
    };

    // 1) Автоматически: проверяем, оплатил ли этот VK-пользователь донат
    if (body.mode === "vk") {
      const vkUserId = (body.vkUserId ?? "").trim().replace(/\D/g, "");
      if (!vkUserId) {
        return Response.json(
          { ok: false, error: "Укажите ваш VK ID" },
          { status: 400 }
        );
      }
      const rows = await db
        .select()
        .from(premiumSubscribers)
        .where(
          and(
            eq(premiumSubscribers.vkUserId, vkUserId),
            eq(premiumSubscribers.status, "active")
          )
        )
        .limit(1);
      if (rows.length > 0) {
        return Response.json({ ok: true, token: "premium" });
      }
      return Response.json(
        {
          ok: false,
          error:
            "Подписка не найдена. Оформите поддержку через VK Donut и попробуйте снова.",
        },
        { status: 402 }
      );
    }

    // 2) Резервно: ручной код
    const code = (body.code ?? "").trim().toUpperCase();
    if (code.length > 0 && code === PREMIUM_CODE.toUpperCase()) {
      return Response.json({ ok: true, token: "premium" });
    }
    return Response.json({ ok: false, error: "Неверный код" }, { status: 401 });
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
}
