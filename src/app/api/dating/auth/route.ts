import { db } from "@/db";
import { datingProfiles, verifyCodes } from "@/db/schema";
import { sql, eq, or, and, gt, desc } from "drizzle-orm";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function hash(pw: string): string {
  return crypto.createHash("sha256").update("chl_" + pw).digest("hex");
}

async function ensure() {
  try {
    await db.execute(
      sql`ALTER TABLE dating_profiles ADD COLUMN IF NOT EXISTS password text NOT NULL DEFAULT '';`
    );
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

function pub(p: typeof datingProfiles.$inferSelect) {
  // не отдаём пароль наружу
  const { password, ...rest } = p;
  void password;
  return rest;
}

export async function POST(request: Request) {
  try {
    await ensure();
    const b = (await request.json()) as {
      action?: string;
      contact?: string;
      password?: string;
      code?: string;
    };
    const action = String(b.action ?? "");
    const contact = (b.contact ?? "").trim().toLowerCase();

    // ---- Вход по телефону/email + пароль ----
    if (action === "login") {
      const rows = await db
        .select()
        .from(datingProfiles)
        .where(
          or(
            eq(datingProfiles.phone, contact),
            eq(datingProfiles.email, contact)
          )
        )
        .limit(1);
      const prof = rows[0];
      if (!prof || !prof.password || prof.password !== hash(b.password ?? "")) {
        return Response.json(
          { ok: false, error: "Неверный логин или пароль" },
          { status: 401 }
        );
      }
      return Response.json({ ok: true, profile: pub(prof) });
    }

    // ---- Установить пароль (при регистрации/смене) ----
    if (action === "set-password") {
      const rows = await db
        .select()
        .from(datingProfiles)
        .where(
          or(
            eq(datingProfiles.phone, contact),
            eq(datingProfiles.email, contact)
          )
        )
        .limit(1);
      const prof = rows[0];
      if (!prof) {
        return Response.json({ ok: false, error: "Анкета не найдена" }, { status: 404 });
      }
      await db
        .update(datingProfiles)
        .set({ password: hash(b.password ?? "") })
        .where(eq(datingProfiles.id, prof.id));
      return Response.json({ ok: true });
    }

    // ---- Сброс пароля по коду ----
    if (action === "reset") {
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
      if (rows.length === 0) {
        return Response.json({ ok: false, error: "Неверный код" }, { status: 401 });
      }
      const profRows = await db
        .select()
        .from(datingProfiles)
        .where(
          or(
            eq(datingProfiles.phone, contact),
            eq(datingProfiles.email, contact)
          )
        )
        .limit(1);
      const prof = profRows[0];
      if (!prof) {
        return Response.json({ ok: false, error: "Анкета не найдена" }, { status: 404 });
      }
      await db
        .update(datingProfiles)
        .set({ password: hash(b.password ?? "") })
        .where(eq(datingProfiles.id, prof.id));
      await db.delete(verifyCodes).where(eq(verifyCodes.contact, contact));
      return Response.json({ ok: true, profile: pub(prof) });
    }

    return Response.json({ error: "bad action" }, { status: 400 });
  } catch {
    return Response.json({ error: "auth failed" }, { status: 500 });
  }
}
