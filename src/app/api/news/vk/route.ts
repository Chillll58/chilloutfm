export const dynamic = "force-dynamic";
export const revalidate = 0;

// Сервисный ключ доступа ВК (создаётся в настройках VK-приложения)
const VK_SERVICE_TOKEN = process.env.VK_SERVICE_TOKEN || "";
const GROUP_DOMAIN = "chillou_fm"; // vk.com/chillou_fm

type VkPost = {
  id: number;
  date: number;
  text: string;
  image: string;
  audios: { artist: string; title: string; url: string }[];
  link: string;
};

export async function GET() {
  if (!VK_SERVICE_TOKEN) {
    return Response.json({
      ok: false,
      reason: "notoken",
      groupUrl: `https://vk.com/${GROUP_DOMAIN}`,
      posts: [],
    });
  }

  try {
    const url =
      "https://api.vk.com/method/wall.get?" +
      new URLSearchParams({
        domain: GROUP_DOMAIN,
        count: "20",
        access_token: VK_SERVICE_TOKEN,
        v: "5.199",
      }).toString();

    const res = await fetch(url, { cache: "no-store" });
    const json = (await res.json()) as {
      response?: {
        items?: Array<{
          id: number;
          date: number;
          text?: string;
          attachments?: Array<{
            type: string;
            photo?: { sizes?: Array<{ url: string; width: number }> };
            audio?: { artist?: string; title?: string; url?: string };
          }>;
        }>;
      };
      error?: { error_msg?: string };
    };

    if (json.error || !json.response?.items) {
      return Response.json({
        ok: false,
        reason: "apierror",
        error: json.error?.error_msg ?? "unknown",
        groupUrl: `https://vk.com/${GROUP_DOMAIN}`,
        posts: [],
      });
    }

    const posts: VkPost[] = json.response.items.map((it) => {
      let image = "";
      const audios: VkPost["audios"] = [];
      for (const a of it.attachments ?? []) {
        if (a.type === "photo" && a.photo?.sizes?.length && !image) {
          const best = a.photo.sizes.reduce((p, c) =>
            c.width > p.width ? c : p
          );
          image = best.url;
        }
        if (a.type === "audio" && a.audio) {
          audios.push({
            artist: a.audio.artist ?? "",
            title: a.audio.title ?? "",
            url: a.audio.url ?? "",
          });
        }
      }
      return {
        id: it.id,
        date: it.date,
        text: it.text ?? "",
        image,
        audios,
        link: `https://vk.com/${GROUP_DOMAIN}?w=wall-${
          json.response?.items ? "" : ""
        }`,
      };
    });

    return Response.json({
      ok: true,
      groupUrl: `https://vk.com/${GROUP_DOMAIN}`,
      posts,
    });
  } catch {
    return Response.json({
      ok: false,
      reason: "fetch",
      groupUrl: `https://vk.com/${GROUP_DOMAIN}`,
      posts: [],
    });
  }
}
