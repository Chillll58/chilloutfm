import { db } from "@/db";
import { feedbackMessages } from "@/db/schema";
import { sql, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ADMIN_KEY =
  process.env.DATING_ADMIN_KEY || process.env.CHAT_ADMIN_KEY || "chillout-admin";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@chilloutfm.ru";
// SMTP-настройки (задайте на Vercel для реальной отправки на почту)
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || "465");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";

async function ensureTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS feedback_messages (
        id serial PRIMARY KEY,
        from_contact text NOT NULL DEFAULT '',
        subject text NOT NULL DEFAULT '',
        message text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(
      sql`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS reply text NOT NULL DEFAULT '';`
    );
    await db.execute(
      sql`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS replied_at timestamptz;`
    );
    await db.execute(
      sql`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS client_id text NOT NULL DEFAULT '';`
    );
  } catch {
    /* ignore */
  }
}

async function trySendEmail(subject: string, message: string, from: string) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return false;
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({
      from: `ChilloutFM <${SMTP_USER}>`,
      to: SUPPORT_EMAIL,
      replyTo: from || undefined,
      subject: subject || "Обратная связь — ChilloutFM",
      text: `${message}\n\n— от: ${from || "не указан"}`,
    });
    return true;
  } catch {
    return false;
  }
}

// GET — обращения. ?client=ID — свои обращения (для пользователя),
// иначе все (нужен админ-ключ).
export async function GET(request: Request) {
  try {
    await ensureTable();
    const { searchParams } = new URL(request.url);
    const client = (searchParams.get("client") ?? "").trim();

    if (client) {
      const rows = await db
        .select()
        .from(feedbackMessages)
        .where(eq(feedbackMessages.clientId, client))
        .orderBy(desc(feedbackMessages.createdAt))
        .limit(50);
      return Response.json({ messages: rows });
    }

    const key = request.headers.get("x-admin-key") ?? "";
    if (!key || key !== ADMIN_KEY) {
      return Response.json({ error: "Нет доступа" }, { status: 401 });
    }
    const rows = await db
      .select()
      .from(feedbackMessages)
      .orderBy(desc(feedbackMessages.createdAt))
      .limit(200);
    return Response.json({ messages: rows });
  } catch {
    return Response.json({ messages: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureTable();
    const b = (await request.json()) as {
      contact?: string;
      subject?: string;
      message?: string;
      clientId?: string;
    };
    const contact = (b.contact ?? "").trim().slice(0, 120);
    const subject = (b.subject ?? "").trim().slice(0, 150);
    const message = (b.message ?? "").trim().slice(0, 4000);
    const clientId = (b.clientId ?? "").trim().slice(0, 80);

    if (!message) {
      return Response.json({ ok: false, error: "Пустое сообщение" }, { status: 400 });
    }

    // сохраняем обращение в базу (админ увидит в любом случае)
    await db
      .insert(feedbackMessages)
      .values({ fromContact: contact, subject, message, clientId });

    // пытаемся отправить на почту, если настроен SMTP
    const emailed = await trySendEmail(subject, message, contact);

    return Response.json({ ok: true, emailed });
  } catch {
    return Response.json({ ok: false, error: "Ошибка отправки" }, { status: 500 });
  }
}

// PATCH — ответ администратора пользователю (сохраняется + email при SMTP)
export async function PATCH(request: Request) {
  const key = request.headers.get("x-admin-key") ?? "";
  if (!key || key !== ADMIN_KEY) {
    return Response.json({ error: "Нет доступа" }, { status: 401 });
  }
  try {
    await ensureTable();
    const b = (await request.json()) as { id?: number; reply?: string };
    const id = Number(b.id);
    const reply = (b.reply ?? "").trim().slice(0, 4000);
    if (!Number.isFinite(id) || !reply) {
      return Response.json({ error: "bad request" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(feedbackMessages)
      .where(eq(feedbackMessages.id, id))
      .limit(1);
    const msg = rows[0];
    if (!msg) return Response.json({ error: "not found" }, { status: 404 });

    await db
      .update(feedbackMessages)
      .set({ reply, repliedAt: new Date() })
      .where(eq(feedbackMessages.id, id));

    // отправляем ответ на email пользователя, если это email и есть SMTP
    let emailed = false;
    const to = msg.fromContact.trim();
    if (to.includes("@")) {
      emailed = await sendReplyEmail(to, msg.subject, reply);
    }

    return Response.json({ ok: true, emailed });
  } catch {
    return Response.json({ error: "reply failed" }, { status: 500 });
  }
}

async function sendReplyEmail(to: string, subject: string, reply: string) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return false;
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({
      from: `ChilloutFM <${SMTP_USER}>`,
      to,
      subject: `Re: ${subject || "Обращение — ChilloutFM"}`,
      text: reply,
    });
    return true;
  } catch {
    return false;
  }
}
