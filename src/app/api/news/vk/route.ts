export const dynamic = "force-dynamic";
export const revalidate = 0;

// Сервисный ключ доступа ВК (из настроек VK-приложения)
const VK_SERVICE_TOKEN = process.env.VK_SERVICE_TOKEN || "";
const GROUP_DOMAIN = process.env.VK_GROUP_DOMAIN || "chillou_fm";

type VkPost = {
  id: number;
  date: number;
  text: string;
  image: string;
  audios: { artist: string; title: string; url: string }[];
  link: string;
};

export async function GET() {
  const groupUrl = `https://vk.com/${GROUP_DOMAIN}`;

  if (!VK_SERVICE_TOKEN) {
    return Response.json({ ok: false, reason: "notoken", groupUrl, posts: [] });
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
          owner_id?: number;
          from_id?: number;
          date: number;
          text?: string;
          attachments?: Array<{
            type: string;
            photo?: { sizes?: Array<{ url: string; width: number }> };
            audio?: { artist?: string; title?: string; url?: string };
            video?: { image?: Array<{ url: string; width: number }> };
            link?: { photo?: { sizes?: Array<{ url: string; width: number }> } };
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
        groupUrl,
        posts: [],
      });
    }

    const pickBest = (sizes?: Array<{ url: string; width: number }>) => {
      if (!sizes?.length) return "";
      return sizes.reduce((p, c) => (c.width > p.width ? c : p)).url;
    };

    const posts: VkPost[] = json.response.items
      .map((it) => {
        let image = "";
        const audios: VkPost["audios"] = [];
        for (const a of it.attachments ?? []) {
          if (a.type === "photo" && !image) image = pickBest(a.photo?.sizes);
          if (a.type === "video" && !image) image = pickBest(a.video?.image);
          if (a.type === "link" && !image)
            image = pickBest(a.link?.photo?.sizes);
          if (a.type === "audio" && a.audio && a.audio.url) {
            audios.push({
              artist: a.audio.artist ?? "",
              title: a.audio.title ?? "",
              url: a.audio.url ?? "",
            });
          }
        }
        const owner = it.owner_id ?? it.from_id ?? 0;
        return {
          id: it.id,
          date: it.date,
          text: it.text ?? "",
          image,
          audios,
          link: owner
            ? `https://vk.com/wall${owner}_${it.id}`
            : groupUrl,
        };
      })
      // показываем посты с текстом или картинкой
      .filter((p) => p.text || p.image);

    return Response.json({ ok: true, groupUrl, posts });
  } catch {
    return Response.json({ ok: false, reason: "fetch", groupUrl, posts: [] });
  }
}
