import crypto from "crypto";

export const dynamic = "force-dynamic";

const VK_APP_ID = process.env.VK_APP_ID || "";

function baseUrl(request: Request): string {
  const env = process.env.APP_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  // реальный публичный домен из заголовков прокси (Vercel и др.)
  const h = request.headers;
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  if (host && !host.startsWith("0.0.0.0") && !host.startsWith("localhost")) {
    return `${proto}://${host}`;
  }
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Build a redirect Response with mutable headers (so we can set cookies). */
function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: location });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
}

export async function GET(request: Request) {
  const origin = baseUrl(request);
  const redirectUri = `${origin}/api/vk/oauth`;

  if (!VK_APP_ID) {
    return redirect(`${origin}/?vk=notconfigured`);
  }

  try {
    const codeVerifier = b64url(crypto.randomBytes(48));
    const codeChallenge = b64url(
      crypto.createHash("sha256").update(codeVerifier).digest()
    );
    const state = b64url(crypto.randomBytes(16));

    const authUrl =
      "https://id.vk.com/authorize?" +
      new URLSearchParams({
        response_type: "code",
        client_id: VK_APP_ID,
        redirect_uri: redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state,
        scope: "",
      }).toString();

    const cookie = (n: string, v: string) =>
      `${n}=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;

    return redirect(authUrl, [
      cookie("vk_verifier", codeVerifier),
      cookie("vk_state", state),
    ]);
  } catch {
    return redirect(`${origin}/?vk=error`);
  }
}
