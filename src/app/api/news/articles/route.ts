export const dynamic = "force-dynamic";
export const revalidate = 0;

export type Article = {
  id: string;
  title: string;
  summary: string;
  body: string;
  image: string;
  source: string;
  url: string;
  date: string;
};

// Реальные обновляемые новости о музыке (RSS). Обновляются по мере выхода.
const FEEDS = [
  { url: "https://mixmag.net/rss.xml", source: "Mixmag" },
  { url: "https://djmag.com/rss.xml", source: "DJ Mag" },
];

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function stripTags(s: string): string {
  return decode(
    s
      // сначала снять CDATA
      .replace(/<!\[CDATA\[/g, "")
      .replace(/\]\]>/g, "")
      // выкинуть картинки/скрипты/стили целиком
      .replace(/<img[^>]*>/gi, " ")
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      // все остальные теги (в т.ч. с атрибутами и переносами)
      .replace(/<[^>]*>/g, " ")
      // битые остатки открытых тегов < ... без закрытия
      .replace(/<[^<]*$/g, " ")
      // остатки атрибутов вроде class="..." если тег был битый
      .replace(/\b[a-z-]+="[^"]*"/gi, " ")
      .replace(/\bclass=/gi, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
  )
    .replace(/Continue reading\.\.\.?/i, "")
    .trim();
}

// Перевод на русский через бесплатный публичный эндпоинт Google Translate
async function translate(text: string): Promise<string> {
  const t = text.trim();
  if (!t) return t;
  try {
    const url =
      "https://translate.googleapis.com/translate_a/single?" +
      new URLSearchParams({
        client: "gtx",
        sl: "en",
        tl: "ru",
        dt: "t",
        q: t.slice(0, 1500),
      }).toString();
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return t;
    const data = (await res.json()) as unknown;
    // формат: [[[ "перевод", "оригинал", ...], ...], ...]
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const parts = (data[0] as unknown[])
        .map((seg) => (Array.isArray(seg) ? String(seg[0] ?? "") : ""))
        .join("");
      return parts || t;
    }
    return t;
  } catch {
    return t;
  }
}

function parseFeed(xml: string, source: string): Article[] {
  const items = xml.split(/<item>/i).slice(1);
  const out: Article[] = [];
  for (const raw of items) {
    const block = raw.split(/<\/item>/i)[0];
    const title = decode((block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim());
    const link = decode((block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? "").trim());
    const descRaw = block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ?? "";
    const img = descRaw.match(/<img[^>]+src="([^"]+)"/i)?.[1] ?? "";
    const text = stripTags(descRaw);
    const date = decode((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] ?? "").trim());
    if (!title || !link) continue;
    out.push({
      id: link,
      title,
      summary: text.slice(0, 160),
      body: text,
      image: img,
      source,
      url: link,
      date: date || new Date().toISOString(),
    });
  }
  return out;
}

// Достаём og:image со страницы статьи, если в RSS картинки нет
async function fetchOgImage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 ChilloutFM" },
    });
    if (!res.ok) return "";
    const html = (await res.text()).slice(0, 60000);
    const m =
      html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
      ) ||
      html.match(
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
      );
    return m?.[1] ?? "";
  } catch {
    return "";
  }
}

export async function GET() {
  try {
    const results = await Promise.all(
      FEEDS.map(async (f) => {
        try {
          const res = await fetch(f.url, {
            cache: "no-store",
            headers: { "User-Agent": "Mozilla/5.0 ChilloutFM" },
          });
          if (!res.ok) return [];
          const xml = await res.text();
          return parseFeed(xml, f.source).slice(0, 8);
        } catch {
          return [];
        }
      })
    );

    // чередуем источники и ограничиваем
    const merged: Article[] = [];
    const lists = results.filter((r) => r.length);
    let idx = 0;
    while (merged.length < 12 && lists.some((l) => l.length > idx)) {
      for (const l of lists) if (l[idx]) merged.push(l[idx]);
      idx++;
    }

    if (merged.length === 0) {
      return Response.json({ articles: FALLBACK });
    }

    const cleanFinal = (s: string) =>
      s
        .replace(/<[^>]*>/g, " ")
        .replace(/\bclass=/gi, " ")
        .replace(/\b[a-z-]+="[^"]*"/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

    // перевод + гарантируем картинку (og:image, если в RSS нет)
    const translated = await Promise.all(
      merged.slice(0, 14).map(async (a) => {
        const [title, body, image] = await Promise.all([
          translate(a.title),
          translate(a.body),
          a.image ? Promise.resolve(a.image) : fetchOgImage(a.url),
        ]);
        const cleanBody = cleanFinal(body);
        return {
          ...a,
          title: cleanFinal(title),
          body: cleanBody,
          summary: cleanBody.slice(0, 160),
          image,
        };
      })
    );

    // только новости с картинкой, максимум 10
    const withImages = translated.filter((a) => a.image).slice(0, 10);

    return Response.json({
      articles: withImages.length ? withImages : translated.slice(0, 10),
    });
  } catch {
    return Response.json({ articles: FALLBACK });
  }
}

// Резерв, если RSS недоступен
const FALLBACK: Article[] = [
  {
    id: "f1",
    title: "Chillout и lounge: музыка для спокойного вечера",
    summary: "Подборка расслабляющих жанров набирает популярность в стриминге.",
    body: "Chillout, lounge и downtempo продолжают набирать популярность. Спокойная музыка помогает расслабиться после насыщенного дня и всё чаще звучит дома, в кафе и спа. Слушайте ChilloutFM, чтобы быть в атмосфере.",
    image: "",
    source: "ChilloutFM",
    url: "https://vk.com/chillou_fm",
    date: new Date().toISOString(),
  },
];
