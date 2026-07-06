export const dynamic = "force-dynamic";

const ADMIN_KEY = process.env.CHAT_ADMIN_KEY || "chillout-admin";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { key?: string };
    const key = (body.key ?? "").trim();
    if (key.length > 0 && key === ADMIN_KEY) {
      return Response.json({ ok: true });
    }
    return Response.json({ ok: false }, { status: 401 });
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
}
