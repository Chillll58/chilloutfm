import type { NowPlaying, Track } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATION_ID = "8795";
const STATUS_URL = `https://myradio24.org/users/${STATION_ID}/status.json`;
const BASE = "https://myradio24.org/";
export const STREAM_URL = `https://myradio24.org/${STATION_ID}`;

function decode(input: string): string {
  if (!input) return "";
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function absImg(img: string | undefined): string {
  if (!img) return "";
  const clean = img.replace(/^\/+/, "");
  return BASE + clean;
}

function splitSong(song: string): { artist: string; title: string } {
  const s = decode(song);
  const idx = s.indexOf(" - ");
  if (idx === -1) return { artist: s, title: "" };
  return { artist: s.slice(0, idx).trim(), title: s.slice(idx + 3).trim() };
}

function mapTrack(raw: {
  time?: string;
  song?: string;
  img?: string;
  songid?: string;
}): Track {
  const song = decode(raw.song ?? "");
  const { artist, title } = splitSong(song);
  return {
    time: raw.time ?? "",
    song,
    artist,
    title,
    img: absImg(raw.img),
    songid: raw.songid ?? song,
  };
}

export async function GET() {
  try {
    const res = await fetch(STATUS_URL, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 ChilloutFM-App" },
    });

    if (!res.ok) {
      throw new Error(`status ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;

    const song = decode(String(data.song ?? ""));
    const artist = decode(String(data.artist ?? "")) || splitSong(song).artist;
    const title =
      decode(String(data.songtitle ?? "")) || splitSong(song).title;

    const historyRaw = Array.isArray(data.songs)
      ? (data.songs as Array<Record<string, string>>)
      : [];
    const nextRaw = Array.isArray(data.nextsongs)
      ? (data.nextsongs as Array<Record<string, string>>)
      : [];

    const history = historyRaw
      .map(mapTrack)
      .reverse(); // newest first

    const payload: NowPlaying = {
      online: Number(data.online) === 1,
      station: decode(String(data.streamname ?? data.title ?? "ChilloutFM")),
      genre: decode(String(data.genre ?? "")),
      kbps: String(data.kbps ?? ""),
      listeners: Number(data.listeners ?? 0),
      favorites: Number(data.favorites ?? 0),
      djname: decode(String(data.djname ?? "")),
      logo: absImg(String(data.logo ?? "")),
      current: {
        artist,
        title,
        song,
        img: absImg(String(data.imgbig ?? data.img ?? "")),
      },
      next: nextRaw.map(mapTrack),
      history,
      streamUrl: STREAM_URL,
      updatedAt: Date.now(),
    };

    return Response.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return Response.json(
      {
        online: false,
        error: err instanceof Error ? err.message : "unknown error",
        streamUrl: STREAM_URL,
      },
      { status: 502 }
    );
  }
}
