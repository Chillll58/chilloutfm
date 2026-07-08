import { db } from "@/db";
import { datingPayments, datingProfiles } from "@/db/schema";
import { sql, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Кошелёк YooMoney владельца платформы (получает 30% + аккумулирует все платежи)
const YOOMONEY_WALLET = process.env.YOOMONEY_WALLET || "";
const EARNER_PERCENT = 70; // процент исполнителю
const PRICES: Record<string, number> = {
  tip: 0, // сумма задаётся пользователем
  private: 0, // берём из анкеты
  call: 0,
  top: 149, // продвижение в топ на 7 дней
  premium: 199,
};

async function ensureTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dating_payments (
        id serial PRIMARY KEY,
        payer_client_id text NOT NULL,
        target_profile_id integer NOT NULL,
        kind text NOT NULL,
        amount integer NOT NULL,
        earner_share integer NOT NULL DEFAULT 0,
        platform_share integer NOT NULL DEFAULT 0,
        label text NOT NULL DEFAULT '',
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS dating_payments_label_idx ON dating_payments (label);`
    );
    // добавить новые колонки в профили, если их нет
    for (const c of [
      "phone text NOT NULL DEFAULT ''",
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
      await db.execute(
        sql.raw(
          `ALTER TABLE dating_profiles ADD COLUMN IF NOT EXISTS ${col} ${c
            .split(" ")
            .slice(1)
            .join(" ")};`
        )
      );
    }
  } catch {
    /* ignore */
  }
}

export async function POST(request: Request) {
  try {
    await ensureTable();
    const b = (await request.json()) as {
      payerClientId?: string;
      targetProfileId?: number;
      kind?: string;
      amount?: number;
    };
    const payer = (b.payerClientId ?? "").trim();
    const targetProfileId = Number(b.targetProfileId) || 0;
    const kind = String(b.kind ?? "");
    if (!payer || !["tip", "private", "call", "top", "premium"].includes(kind)) {
      return Response.json({ error: "bad request" }, { status: 400 });
    }

    // сумма
    let amount = Number(b.amount) || 0;
    if (kind === "top" || kind === "premium") amount = PRICES[kind];
    if (kind === "private" || kind === "call" || kind === "tip") {
      // взять цену из анкеты цели
      if (targetProfileId) {
        const rows = await db
          .select()
          .from(datingProfiles)
          .where(eq(datingProfiles.id, targetProfileId))
          .limit(1);
        const p = rows[0];
        if (p) {
          if (kind === "private") amount = p.pricePrivate;
          if (kind === "call") amount = p.priceCall;
          if (kind === "tip") amount = amount || p.priceTip;
        }
      }
    }
    if (amount < 1) amount = 1;

    const earnerShare =
      kind === "top" || kind === "premium"
        ? 0
        : Math.round((amount * EARNER_PERCENT) / 100);
    const platformShare = amount - earnerShare;
    const label = `chl_${kind}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    await db.insert(datingPayments).values({
      payerClientId: payer,
      targetProfileId,
      kind,
      amount,
      earnerShare,
      platformShare,
      label,
      status: "pending",
    });

    // Ссылка на оплату YooMoney (quickpay)
    let payUrl = "";
    if (YOOMONEY_WALLET) {
      payUrl =
        "https://yoomoney.ru/quickpay/confirm.xml?" +
        new URLSearchParams({
          receiver: YOOMONEY_WALLET,
          "quickpay-form": "shop",
          targets: `ChilloutFM ${kind} #${targetProfileId}`,
          paymentType: "AC",
          sum: String(amount),
          label,
        }).toString();
    }

    return Response.json({ ok: true, label, amount, payUrl });
  } catch {
    return Response.json({ error: "pay failed" }, { status: 500 });
  }
}
