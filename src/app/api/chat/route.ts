import { db } from "@/db";
import { chatMessages, messageReactions } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Self-healing: make sure required tables/columns exist on any database
// (e.g. a fresh Neon instance) without running migrations manually.
const globalForSchema = globalThis as typeof globalThis & {
  __chilloutSchemaReady?: boolean;
};

async function ensureSchema() {
  if (globalForSchema.__chilloutSchemaReady) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id serial PRIMARY KEY,
        name text NOT NULL,
        text text NOT NULL,
        color text NOT NULL DEFAULT '#5eead4',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(
      sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to_id integer;`
    );
    await db.execute(
      sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to_name text;`
    );
    await db.execute(
      sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to_text text;`
    );
    await db.execute(
      sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_type text;`
    );
    await db.execute(
      sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_url text;`
    );
    await db.execute(
      sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_name text;`
    );
    await db.execute(
      sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS room text NOT NULL DEFAULT 'main';`
    );
    await db.execute(
      sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_premium integer NOT NULL DEFAULT 0;`
    );
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id serial PRIMARY KEY,
        message_id integer NOT NULL,
        client_id text NOT NULL,
        emoji text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS track_votes (
        id serial PRIMARY KEY,
        songid text NOT NULL,
        client_id text NOT NULL,
        value integer NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    globalForSchema.__chilloutSchemaReady = true;
  } catch {
    // ignore — a later request will retry
  }
}

export const ADMIN_KEY = process.env.CHAT_ADMIN_KEY || "chillout-admin";

function isAdmin(request: Request): boolean {
  const key = request.headers.get("x-admin-key") ?? "";
  return key.length > 0 && key === ADMIN_KEY;
}

const COLORS = [
  "#5eead4",
  "#a78bfa",
  "#f472b6",
  "#38bdf8",
  "#fbbf24",
  "#4ade80",
  "#fb923c",
];

function pickColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const room = searchParams.get("room") === "premium" ? "premium" : "main";
    const rows = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.room, room))
      .orderBy(desc(chatMessages.createdAt))
      .limit(100);
    return Response.json({ messages: rows.reverse() });
  } catch {
    return Response.json({ messages: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = (await request.json()) as {
      name?: string;
      text?: string;
      replyToId?: number;
      replyToName?: string;
      replyToText?: string;
      attachmentType?: string;
      attachmentUrl?: string;
      attachmentName?: string;
      room?: string;
      premiumToken?: string;
    };
    const name = (body.name ?? "").trim().slice(0, 40) || "Гость";
    const text = (body.text ?? "").trim().slice(0, 500);

    const isPremiumUser = body.premiumToken === "premium" ? 1 : 0;
    const room = body.room === "premium" ? "premium" : "main";

    // В премиум-комнату могут писать только премиум-участники
    if (room === "premium" && !isPremiumUser) {
      return Response.json(
        { error: "Доступ только для премиум-участников" },
        { status: 403 }
      );
    }

    // attachment (stored as data URL)
    const allowedTypes = ["image", "audio", "video", "file"];
    const attachmentType = allowedTypes.includes(body.attachmentType ?? "")
      ? (body.attachmentType as string)
      : null;
    let attachmentUrl = attachmentType ? (body.attachmentUrl ?? "").trim() : null;
    const attachmentName = attachmentType
      ? (body.attachmentName ?? "").trim().slice(0, 120) || null
      : null;

    // size guard: data URL length ~ 1.37x bytes; ~8MB base64 ≈ 6MB file
    if (attachmentUrl && attachmentUrl.length > 8_000_000) {
      return Response.json(
        { error: "Файл слишком большой (макс. ~6 МБ)" },
        { status: 413 }
      );
    }
    if (attachmentUrl && !attachmentUrl.startsWith("data:")) {
      attachmentUrl = null;
    }

    if (!text && !attachmentUrl) {
      return Response.json({ error: "Пустое сообщение" }, { status: 400 });
    }

    const replyToId =
      typeof body.replyToId === "number" && Number.isFinite(body.replyToId)
        ? body.replyToId
        : null;
    const replyToName = replyToId
      ? (body.replyToName ?? "").trim().slice(0, 40) || null
      : null;
    const replyToText = replyToId
      ? (body.replyToText ?? "").trim().slice(0, 120) || null
      : null;

    try {
      const [row] = await db
        .insert(chatMessages)
        .values({
          name,
          text,
          color: pickColor(name),
          replyToId,
          replyToName,
          replyToText,
          attachmentType,
          attachmentUrl,
          attachmentName,
          room,
          isPremium: isPremiumUser,
        })
        .returning();
      return Response.json({ message: row });
    } catch {
      // Fallback for databases without the new columns yet.
      const [row] = await db
        .insert(chatMessages)
        .values({ name, text: text || "📎 вложение", color: pickColor(name) })
        .returning();
      return Response.json({ message: row });
    }
  } catch {
    return Response.json({ error: "Ошибка отправки" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "Нет доступа" }, { status: 401 });
  }
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all");
    const id = Number(searchParams.get("id"));

    if (all === "1") {
      // Reactions table may not exist on some databases — ignore its errors.
      try {
        await db.delete(messageReactions);
      } catch {
        /* ignore */
      }
      await db.delete(chatMessages);
      return Response.json({ ok: true, cleared: true });
    }

    if (Number.isFinite(id) && id > 0) {
      try {
        await db
          .delete(messageReactions)
          .where(eq(messageReactions.messageId, id));
      } catch {
        /* ignore */
      }
      await db.delete(chatMessages).where(eq(chatMessages.id, id));
      return Response.json({ ok: true, id });
    }

    return Response.json({ error: "bad request" }, { status: 400 });
  } catch {
    return Response.json({ error: "Ошибка удаления" }, { status: 500 });
  }
}
