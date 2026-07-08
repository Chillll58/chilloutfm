import { db } from "@/db";
import { verifyCodes } from "@/db/schema";
import { sql, eq, and, gt, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Реальная отправка SMS/email требует провайдера (Twilio / SMSC / SMTP).
// Здесь: генерируем код, сохраняем, и если провайдер не настроен —
// возвращаем devCode для показа пользователю (демо-режим).
const SMS_API = process.env.SMS_API_KEY || "";
const EMAIL_API = process.env.EMAIL_API_KEY || "";

async function ensureTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS verify_codes (
        id serial PRIMARY KEY,
        contact text NOT NULL,
        code text NOT NULL,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  } catch {
    /* ignore */
  }
}

// POST { action: "send", contact }  → отправить код
// POST { action: "check", contact, code } → проверить
export async function POST(request: Request) {
  try {
    await ensureTable();
    const b = (await request.json()) as {
      action?: string;
      contact?: string;
      code?: string;
    };
    const contact = (b.contact ?? "").trim().toLowerCase();
    if (!contact) {
      return Response.json({ error: "Укажите телефон или email" }, { status: 400 });
    }

    if (b.action === "send") {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await db.insert(verifyCodes).values({ contact, code, expiresAt });

      const isEmail = contact.includes("@");
      let delivered = false;

      // Здесь можно подключить реальную отправку:
      if (isEmail && EMAIL_API) {
        // TODO: интеграция SMTP/API рассылки
        delivered = true;
      } else if (!isEmail && SMS_API) {
        // TODO: интеграция SMS-шлюза (SMSC/Twilio)
        delivered = true;
      }

      return Response.json({
        ok: true,
        delivered,
        // демо-режим: показываем код в приложении, пока нет провайдера
        devCode: delivered ? undefined : code,
      });
    }

    if (b.action === "check") {
      const code = (b.code ?? "").trim();
      const rows = await db
        .select()
        .from(verifyCodes)
        .where(
          and(
            eq(verifyCodes.contact, contact),
            eq(verifyCodes.code, code),
            gt(verifyCodes.expiresAt, new Date())
          )
        )
        .orderBy(desc(verifyCodes.createdAt))
        .limit(1);

      if (rows.length > 0) {
        // очистить использованные коды
        await db.delete(verifyCodes).where(eq(verifyCodes.contact, contact));
        return Response.json({ ok: true, verified: true });
      }
      return Response.json({ ok: false, verified: false }, { status: 401 });
    }

    return Response.json({ error: "bad action" }, { status: 400 });
  } catch {
    return Response.json({ error: "verify failed" }, { status: 500 });
  }
}
