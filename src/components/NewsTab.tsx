"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { youtubeSearch, vkSearch } from "@/lib/premium";

type Track = {
  artist: string;
  title: string;
  img: string;
  preview: string;
  album: string;
  released: string;
};

type Article = {
  id: string;
  title: string;
  summary: string;
  body: string;
  image: string;
  source: string;
  url: string;
  date: string;
};

type FeedItem =
  | { kind: "track"; track: Track }
  | { kind: "article"; article: Article };

const NEWS_GRADIENT = "linear-gradient(135deg,#2dd4bf,#7c3aed,#ec4899)";
type VkPost = {
  id: number;
  date: number;
  text: string;
  image: string;
  audios: { artist: string; title: string; url: string }[];
  link?: string;
};

const HOSTS = [
  {
    name: "Inessa Arakelyan",
    role: "Chief / Executive Director",
    photo: "/hosts/inessa.jpg",
    vk: "https://vk.com/inessachillout",
  },
  {
    name: "Александр Минкин",
    role: "Program Director",
    photo: "/hosts/alexander.jpg",
    vk: "https://vk.com/a.minkin",
  },
];

const SCHEDULE = [
  {
    time: "00:00 – 18:00",
    title: "Chillout поток",
    desc: "Расслабляющая атмосферная музыка на весь день 🌿",
    icon: "🎧",
  },
  {
    time: "18:00 – 21:00",
    title: "GOA / PSY — Радио Рекорд",
    desc: "Перед сном колбасимся! Заводной GOA/PSY-трэнс, потом плавно переключаемся обратно на Chill 🌀",
    icon: "🔊",
  },
  {
    time: "21:00 – 00:00",
    title: "Вечерний Chill",
    desc: "Мягкое возвращение к спокойным ритмам для крепкого сна 🌙",
    icon: "🌌",
  },
];

function isPlaceholder(s?: string) {
  return !s || s.includes("nocover") || s.trim() === "";
}

export default function NewsTab() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [openArticle, setOpenArticle] = useState<Article | null>(null);
  const [posts, setPosts] = useState<VkPost[]>([]);
  const [vkOk, setVkOk] = useState<boolean | null>(null);
  const [groupUrl, setGroupUrl] = useState("https://vk.com/chillou_fm");
  const [section, setSection] = useState<"music" | "vk" | "hosts" | "schedule">(
    "music"
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingUrl, setPlayingUrl] = useState("");

  const loadMusic = useCallback(async () => {
    try {
      const [mRes, aRes] = await Promise.all([
        fetch("/api/news/music", { cache: "no-store" }),
        fetch("/api/news/articles", { cache: "no-store" }),
      ]);
      const mJson = (await mRes.json()) as { tracks: Track[] };
      const aJson = (await aRes.json()) as { articles: Article[] };
      setTracks(mJson.tracks ?? []);
      setArticles(aJson.articles ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  // смешанная лента: строго чередуем 1 новость / 1 трек
  const buildFeed = (): FeedItem[] => {
    const feed: FeedItem[] = [];
    const a = articles.slice(0, 10);
    const t = tracks.slice(0, 10);
    const max = Math.max(a.length, t.length);
    for (let i = 0; i < max; i++) {
      if (a[i]) feed.push({ kind: "article", article: a[i] });
      if (t[i]) feed.push({ kind: "track", track: t[i] });
    }
    return feed;
  };

  const loadVk = useCallback(async () => {
    try {
      const res = await fetch("/api/news/vk", { cache: "no-store" });
      const json = (await res.json()) as {
        ok: boolean;
        posts: VkPost[];
        groupUrl: string;
      };
      setVkOk(json.ok);
      setPosts(json.posts ?? []);
      if (json.groupUrl) setGroupUrl(json.groupUrl);
    } catch {
      setVkOk(false);
    }
  }, []);

  useEffect(() => {
    loadMusic();
    loadVk();
  }, [loadMusic, loadVk]);

  const playAudio = (url: string) => {
    if (!audioRef.current) return;
    if (playingUrl === url) {
      audioRef.current.pause();
      setPlayingUrl("");
      return;
    }
    audioRef.current.src = url;
    audioRef.current.play().catch(() => {});
    setPlayingUrl(url);
  };

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-28 pt-2">
      <h1 className="mb-3 px-1 text-xl font-extrabold text-white">
        Новости <span className="text-teal-300">Chill</span> 📰
      </h1>

      {/* section switcher */}
      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto">
        {[
          ["music", "🎵 Новинки"],
          ["vk", "📢 ВК"],
          ["hosts", "🎙 Ведущие"],
          ["schedule", "🗓 Программа"],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setSection(k as typeof section)}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              section === k
                ? "bg-gradient-to-r from-teal-400 to-purple-500 text-[#0b1020]"
                : "border border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* 1. МУЗЫКАЛЬНЫЕ НОВИНКИ ИЗ ИНТЕРНЕТА */}
      {section === "music" && (
        <div className="space-y-2.5">
          <button
            onClick={loadMusic}
            className="mb-1 w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 text-xs text-slate-400"
          >
            ⟳ Обновить ленту
          </button>
          {tracks.length === 0 && articles.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Загрузка…</p>
          ) : (
            buildFeed().map((item, i) =>
              item.kind === "article" ? (
                <ArticleCard
                  key={`art-${item.article.id}-${i}`}
                  a={item.article}
                  onRead={() => setOpenArticle(item.article)}
                />
              ) : (
                <TrackCard
                  key={`trk-${item.track.title}-${i}`}
                  t={item.track}
                  active={playingUrl === item.track.preview}
                  onPlay={() => playAudio(item.track.preview)}
                />
              )
            )
          )}
          <p className="pt-2 text-center text-[11px] text-slate-500">
            Новинки и новости Chillout 🎶 · нажмите на обложку для превью
          </p>
        </div>
      )}

      {/* 2. ВК ПОСТЫ */}
      {section === "vk" && (
        <div className="space-y-3">
          {vkOk === false ? (
            <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4 text-center">
              <p className="mb-2 text-sm text-slate-200">
                Автолента из сообщества появится после подключения VK API.
              </p>
              <a
                href={groupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-full bg-[#0077FF] px-4 py-2 text-sm font-semibold text-white"
              >
                Открыть сообщество ВК
              </a>
            </div>
          ) : posts.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Загрузка…</p>
          ) : (
            posts.map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
              >
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="w-full object-cover" referrerPolicy="no-referrer" />
                )}
                <div className="p-3">
                  <p className="mb-1 text-[10px] text-slate-500">
                    {new Date(p.date * 1000).toLocaleString("ru-RU")}
                  </p>
                  {p.text && (
                    <p className="whitespace-pre-wrap break-words text-sm text-slate-200">
                      {p.text}
                    </p>
                  )}
                  {p.audios.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => playAudio(a.url)}
                      className="mt-2 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-200"
                    >
                      <span className="text-teal-300">
                        {playingUrl === a.url ? "⏸" : "▶"}
                      </span>
                      <span className="truncate">
                        {a.artist} — {a.title}
                      </span>
                    </button>
                  ))}
                  {p.link && (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#0077FF] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Открыть в ВК ↗
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. ВЕДУЩИЕ */}
      {section === "hosts" && (
        <div className="space-y-3">
          {HOSTS.map((h) => (
            <div
              key={h.name}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={h.photo}
                alt={h.name}
                className="h-20 w-20 flex-shrink-0 rounded-2xl object-cover ring-1 ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-white">{h.name}</p>
                <p className="text-xs text-teal-200/80">{h.role}</p>
                <a
                  href={h.vk}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#0077FF] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                    <path d="M12.7 16.3c-4.9 0-8-3.4-8.1-9h2.5c.1 4.1 2 5.8 3.4 6.2V7.3h2.3v3.5c1.4-.2 2.9-1.8 3.4-3.5h2.3c-.4 2.1-1.9 3.7-3 4.4 1.1.5 2.8 1.9 3.5 4.6h-2.6c-.5-1.7-1.9-3-3.6-3.2v3.2h-.3z" />
                  </svg>
                  Написать в ВК
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. ПРОГРАММА */}
      {section === "schedule" && (
        <div className="space-y-2.5">
          {SCHEDULE.map((s) => (
            <div
              key={s.time}
              className="rounded-2xl border border-white/10 bg-white/5 p-3.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <p className="font-mono text-sm font-bold text-teal-300">
                    {s.time}
                  </p>
                  <p className="text-sm font-semibold text-white">{s.title}</p>
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      )}

      <audio
        ref={audioRef}
        onEnded={() => setPlayingUrl("")}
        className="hidden"
      />

      {/* модалка полной новости — по центру, выше */}
      {openArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
          onClick={() => setOpenArticle(null)}
        >
          <div
            className="fade-up flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0f1630]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative aspect-[16/9] w-full flex-shrink-0 bg-black"
              style={openArticle.image ? undefined : { background: NEWS_GRADIENT }}
            >
              {openArticle.image && (
                <>
                  {/* размытый фон-заполнитель, чтобы не было пустых полей */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={openArticle.image}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-lg"
                    referrerPolicy="no-referrer"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={openArticle.image}
                    alt={openArticle.title}
                    className="relative h-full w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </>
              )}
              <button
                onClick={() => setOpenArticle(null)}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
              >
                ✕
              </button>
              <span className="absolute bottom-3 left-4 z-10 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">
                {openArticle.source} ·{" "}
                {new Date(openArticle.date).toLocaleDateString("ru-RU")}
              </span>
            </div>
            <div className="no-scrollbar flex-1 overflow-y-auto p-4">
              <h2 className="mb-3 text-lg font-bold text-white">
                {openArticle.title}
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                {openArticle.body}
              </p>
              <div className="mt-5 border-t border-white/10 pt-3">
                <p className="mb-2 text-xs text-slate-500">
                  Источник: {openArticle.source}
                </p>
                <a
                  href={openArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-full bg-gradient-to-r from-teal-400 to-purple-500 px-5 py-2.5 text-sm font-bold text-[#0b1020]"
                >
                  Читать на сайте источника ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrackCard({
  t,
  active,
  onPlay,
}: {
  t: Track;
  active: boolean;
  onPlay: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-2.5 transition ${
        active ? "border-teal-400/50 bg-teal-400/10" : "border-white/10 bg-white/5"
      }`}
    >
      <button
        onClick={onPlay}
        className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-teal-500/30 to-purple-500/30"
      >
        {!isPlaceholder(t.img) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={t.img}
            alt={t.artist}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl">
            🎵
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xl text-white">
          {active ? "⏸" : "▶"}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">
          {t.artist || "—"}
        </p>
        <p className="truncate text-xs text-teal-200/80">{t.title || "—"}</p>
        {t.album && (
          <p className="truncate text-[10px] text-slate-500">{t.album}</p>
        )}
        <div className="mt-1 flex gap-1.5">
          <a
            href={youtubeSearch(t.artist, t.title)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-200"
          >
            ▶ YouTube
          </a>
          <a
            href={vkSearch(t.artist, t.title)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-200"
          >
            🎵 ВК
          </a>
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ a, onRead }: { a: Article; onRead: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-purple-400/20 bg-white/5">
      <div
        className="relative aspect-[16/9] w-full"
        style={{ background: NEWS_GRADIENT }}
      >
        {a.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.image}
            alt={a.title}
            className="h-full w-full object-cover object-center"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white">
          📰 Новость
        </span>
      </div>
      <div className="p-3">
        <p className="mb-1 text-[10px] text-slate-500">
          {a.source} · {new Date(a.date).toLocaleDateString("ru-RU")}
        </p>
        <h3 className="text-sm font-bold text-white">{a.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-slate-300">{a.summary}</p>
        <button
          onClick={onRead}
          className="mt-2 rounded-full bg-gradient-to-r from-teal-400 to-purple-500 px-4 py-1.5 text-xs font-semibold text-[#0b1020]"
        >
          Читать далее →
        </button>
      </div>
    </div>
  );
}
