import { db } from "@/db";
import { premiumSubscribers } from "@/db/schema";
import { sql, and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const VK_APP_ID = process.env.VK_APP_ID || "";

function baseUrl(request: Request): string {
  const env = process.env.APP_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: new Headers({ Location: location }),
  });
}

function readCookie(request: Request, name: string): string {
  const raw = request.headers.get("cookie") ?? "";
  const m = raw.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
}

async function isPaid(vkUserId: string): Promise<boolean> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS premium_subscribers (
        id serial PRIMARY KEY,
        vk_user_id text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
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
    return rows.length > 0;
  } catch {
    return false;
  }
}

function closePage(
  payload: Record<string, unknown>,
  origin: string
): Response {
  const json = JSON.stringify(payload);
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0b1020;color:#fff;font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px;">
<div><div style="font-size:40px">👑</div><p style="margin-top:12px">Готово! Возвращаемся…</p></div>
<script>
  try {
    var data = ${json};
    if (data.user) localStorage.setItem('chillout_vk_user', JSON.stringify(data.user));
    if (data.premium) localStorage.setItem('chillout_premium','premium');
    if (window.opener) {
      window.opener.postMessage({ type: 'chillout-vk-auth', data: data }, '*');
      window.close();
    } else {
      location.replace('${origin}/?vklogin=1');
    }
  } catch (e) { location.replace('${origin}/?vklogin=1'); }
</script></body></html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const origin = baseUrl(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const deviceId = searchParams.get("device_id") ?? "";
  const state = searchParams.get("state") ?? "";

  const cookieVerifier = readCookie(request, "vk_verifier");
  const cookieState = readCookie(request, "vk_state");

  if (!code || !VK_APP_ID || !cookieVerifier) {
    return redirect(`${origin}/?vk=error`);
  }
  if (cookieState && state && cookieState !== state) {
    return redirect(`${origin}/?vk=error`);
  }

  const redirectUri = `${origin}/api/vk/oauth`;

  try {
    // New VK ID token exchange (PKCE, no client_secret needed)
    const tokenRes = await fetch("https://id.vk.com/oauth2/auth", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        code_verifier: cookieVerifier,
        client_id: VK_APP_ID,
        device_id: deviceId,
        redirect_uri: redirectUri,
        state: cookieState || state,
      }).toString(),
      cache: "no-store",
    });

    const token = (await tokenRes.json()) as {
      access_token?: string;
      user_id?: number | string;
      error?: string;
    };

    if (!token.access_token) {
      return redirect(`${origin}/?vk=error`);
    }

    let vkUserId = token.user_id ? String(token.user_id) : "";
    let name = "Пользователь VK";
    let photo = "";

    // Fetch profile via VK ID user_info
    try {
      const infoRes = await fetch("https://id.vk.com/oauth2/user_info", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          access_token: token.access_token,
          client_id: VK_APP_ID,
        }).toString(),
        cache: "no-store",
      });
      const info = (await infoRes.json()) as {
        user?: {
          user_id?: string | number;
          first_name?: string;
          last_name?: string;
          avatar?: string;
        };
      };
      if (info.user) {
        vkUserId = String(info.user.user_id ?? vkUserId);
        name =
          `${info.user.first_name ?? ""} ${info.user.last_name ?? ""}`.trim() ||
          name;
        photo = info.user.avatar ?? "";
      }
    } catch {
      /* ignore */
    }

    if (!vkUserId) {
      return redirect(`${origin}/?vk=error`);
    }

    const premium = await isPaid(vkUserId);
    const res = closePage(
      { user: { id: vkUserId, name, photo }, premium },
      origin
    );
    // clear cookies
    res.headers.append(
      "Set-Cookie",
      "vk_verifier=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
    );
    res.headers.append(
      "Set-Cookie",
      "vk_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
    );
    return res;
  } catch {
    return redirect(`${origin}/?vk=error`);
  }
}
