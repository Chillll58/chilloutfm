export const dynamic = "force-dynamic";
export const revalidate = 0;

const REPO = "Chillll58/chilloutfm";
const RELEASE_URL = `https://github.com/${REPO}/releases/tag/latest`;

export async function GET() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/releases/latest`,
      {
        cache: "no-store",
        headers: {
          "User-Agent": "ChilloutFM-App",
          Accept: "application/vnd.github+json",
        },
      }
    );
    if (!res.ok) {
      return Response.json({ ok: false, url: RELEASE_URL });
    }
    const d = (await res.json()) as {
      tag_name?: string;
      name?: string;
      published_at?: string;
      body?: string;
    };
    return Response.json({
      ok: true,
      tag: d.tag_name ?? "latest",
      name: d.name ?? "",
      publishedAt: d.published_at ?? "",
      notes: (d.body ?? "").slice(0, 500),
      url: RELEASE_URL,
    });
  } catch {
    return Response.json({ ok: false, url: RELEASE_URL });
  }
}
