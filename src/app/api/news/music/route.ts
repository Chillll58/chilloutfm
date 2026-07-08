export const dynamic = "force-dynamic";
export const revalidate = 0;

type Track = {
  artist: string;
  title: string;
  img: string;
  preview: string; // 30-сек mp3 для прослушивания
  album: string;
  released: string;
};

// Новинки Chillout из интернета через бесплатный iTunes Search API
const TERMS = [
  "chillout",
  "lounge chill",
  "ambient chill",
  "downtempo",
  "chillout remix",
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const term = q || TERMS[Math.floor(Math.random() * TERMS.length)];

    const url =
      "https://itunes.apple.com/search?" +
      new URLSearchParams({
        term,
        media: "music",
        entity: "song",
        limit: "40",
        country: "RU",
        lang: "ru_ru",
      }).toString();

    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 ChilloutFM" },
    });
    if (!res.ok) return Response.json({ tracks: [] });

    const data = (await res.json()) as {
      results?: Array<{
        artistName?: string;
        trackName?: string;
        collectionName?: string;
        artworkUrl100?: string;
        previewUrl?: string;
        releaseDate?: string;
      }>;
    };

    const tracks: Track[] = (data.results ?? [])
      .filter((r) => r.previewUrl && r.trackName)
      .map((r) => ({
        artist: r.artistName ?? "",
        title: r.trackName ?? "",
        // увеличенная обложка
        img: (r.artworkUrl100 ?? "").replace("100x100", "300x300"),
        preview: r.previewUrl ?? "",
        album: r.collectionName ?? "",
        released: r.releaseDate ?? "",
      }))
      // самые свежие сверху
      .sort((a, b) => (b.released > a.released ? 1 : -1))
      .slice(0, 10);

    return Response.json({ tracks });
  } catch {
    return Response.json({ tracks: [] }, { status: 500 });
  }
}
