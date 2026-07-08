import { db } from "@/db";
import { datingPayments, datingProfiles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Секрет уведомлений HTTP из настроек YooMoney
const NOTIFY_SECRET = process.env.YOOMONEY_NOTIFY_SECRET || "";

/**
 * YooMoney шлёт form-urlencoded с полями и sha1_hash.
 * Проверяем подпись, отмечаем платёж оплаченным, применяем эффект.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const get = (k: string) => String(form.get(k) ?? "");

    const notification_type = get("notification_type");
    const operation_id = get("operation_id");
    const amount = get("amount");
    const currency = get("currency");
    const datetime = get("datetime");
    const sender = get("sender");
    const codepro = get("codepro");
    const label = get("label");
    const sha1_hash = get("sha1_hash");

    // Проверка подписи
    if (NOTIFY_SECRET) {
      const check = [
        notification_type,
        operation_id,
        amount,
        currency,
        datetime,
        sender,
        codepro,
        NOTIFY_SECRET,
        label,
      ].join("&");
      const hash = crypto.createHash("sha1").update(check).digest("hex");
      if (hash !== sha1_hash) {
        return new Response("bad sign", { status: 403 });
      }
    }

    if (!label) return new Response("ok");

    const rows = await db
      .select()
      .from(datingPayments)
      .where(eq(datingPayments.label, label))
      .limit(1);
    const pay = rows[0];
    if (!pay || pay.status === "paid") return new Response("ok");

    await db
      .update(datingPayments)
      .set({ status: "paid" })
      .where(eq(datingPayments.label, label));

    // применить эффект
    if (pay.targetProfileId) {
      if (pay.kind === "top") {
        const until = new Date();
        until.setDate(until.getDate() + 7);
        await db
          .update(datingProfiles)
          .set({ topUntil: until })
          .where(eq(datingProfiles.id, pay.targetProfileId));
      }
      if (pay.earnerShare > 0) {
        await db
          .update(datingProfiles)
          .set({ earnings: sql`${datingProfiles.earnings} + ${pay.earnerShare}` })
          .where(eq(datingProfiles.id, pay.targetProfileId));
      }
    }

    return new Response("ok");
  } catch {
    return new Response("ok");
  }
}
