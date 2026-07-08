import { AccessToken } from "livekit-server-sdk";

export const dynamic = "force-dynamic";

const API_KEY = process.env.LIVEKIT_API_KEY || "";
const API_SECRET = process.env.LIVEKIT_API_SECRET || "";
const LK_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

// POST { room, identity, name, publish }
export async function POST(request: Request) {
  try {
    if (!API_KEY || !API_SECRET || !LK_URL) {
      return Response.json(
        { ok: false, error: "LiveKit не настроен" },
        { status: 200 }
      );
    }

    const b = (await request.json()) as {
      room?: string;
      identity?: string;
      name?: string;
      publish?: boolean;
    };
    const room = String(b.room ?? "").trim();
    const identity = String(b.identity ?? "").trim() || `u_${Date.now()}`;
    const name = String(b.name ?? "Гость").slice(0, 40);
    const canPublish = Boolean(b.publish);

    if (!room) {
      return Response.json({ ok: false, error: "no room" }, { status: 400 });
    }

    const at = new AccessToken(API_KEY, API_SECRET, { identity, name });
    at.addGrant({
      room,
      roomJoin: true,
      canPublish,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    return Response.json({ ok: true, token, url: LK_URL });
  } catch {
    return Response.json({ ok: false, error: "token failed" }, { status: 500 });
  }
}
