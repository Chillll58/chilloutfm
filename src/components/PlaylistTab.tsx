"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NowPlaying, Track } from "@/lib/types";
import AlbumArt from "./AlbumArt";
import { getClientId } from "@/lib/clientId";
import {
  getFavorites,
  isFavorite,
  onFavoritesChanged,
  removeFavorite,
  toggleFavorite,
} from "@/lib/favorites";
import type { VoteAgg } from "@/app/api/votes/route";
import { popularityScore } from "@/lib/popularity";
import { youtubeSearch, vkSearch, downloadSearch } from "@/lib/premium";


type VotesMap = Record<string, VoteAgg>;

export default function PlaylistTab({
  data,
  premium,
}: {
  data: NowPlaying | null;
  premium: boolean;
}) {
  const [votes, setVotes] = useState<VotesMap>({});
  const [favs, setFavs] = useState<string[]>([]);
  const clientIdRef = useRef<string>("");

  useEffect(() => {
    clientIdRef.current = getClientId();
    setFavs(getFavorites());
    return onFavoritesChanged(() => setFavs(getFavorites()));
  }, []);

  const history = useMemo(() => data?.history ?? [], [data]);
  const next = useMemo(() => data?.next ?? [], [data]);

  const allIds = useMemo(() => {
    const ids = new Set<string>();
    if (data?.current) ids.add(currentSongId(data));
    history.forEach((t) => ids.add(t.songid));
    next.forEach((t) => ids.add(t.songid));
    return Array.from(ids);
  }, [data, history, next]);

  const loadVotes = useCallback(async () => {
    if (allIds.length === 0) return;
    try {
      const res = await fetch(
        `/api/votes?ids=${encodeURIComponent(
          allIds.join(",")
        )}&clientId=${encodeURIComponent(clientIdRef.current)}`,
        { cache: "no-store" }
      );
      const json = (await res.json()) as { votes: VotesMap };
      setVotes(json.votes ?? {});
    } catch {
      /* ignore */
    }
  }, [allIds]);

  useEffect(() => {
    loadVotes();
    const id = setInterval(loadVotes, 12000);
    return () => clearInterval(id);
  }, [loadVotes]);

  // heart = like the track (single positive vote, toggle)
  const like = useCallback(
    async (songid: string) => {
      setVotes((prev) => {
        const cur = prev[songid] ?? { up: 0, down: 0, score: 0, mine: 0 };
        const nowLiked = cur.mine !== 1;
        const up = Math.max(0, cur.up + (nowLiked ? 1 : -1));
        return {
          ...prev,
          [songid]: {
            up,
            down: 0,
            score: up,
            mine: nowLiked ? 1 : 0,
          },
        };
      });
      navigator.vibrate?.(15);
      try {
        const res = await fetch("/api/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            songid,
            clientId: clientIdRef.current,
            value: 1,
          }),
        });
        const json = (await res.json()) as { agg?: VoteAgg };
        if (json.agg) setVotes((prev) => ({ ...prev, [songid]: json.agg! }));
      } catch {
        loadVotes();
      }
    },
    [loadVotes]
  );

  // build artist lookup per songid for favorite boost
  const artistOf = useMemo(() => {
    const map: Record<string, string> = {};
    if (data?.current) map[currentSongId(data)] = data.current.artist;
    history.forEach((t) => (map[t.songid] = t.artist));
    next.forEach((t) => (map[t.songid] = t.artist));
    return map;
  }, [data, history, next]);

  const liveSongId = data ? currentSongId(data) : "";

  const scores = useMemo(() => {
    const map: Record<string, number> = {};
    for (const id of allIds) {
      map[id] = popularityScore({
        songid: id,
        likes: votes[id]?.up ?? 0,
        isFavoriteArtist: favs.some(
          (a) => a.toLowerCase() === (artistOf[id] ?? "").toLowerCase()
        ),
        isLive: id === liveSongId,
      });
    }
    return map;
  }, [allIds, votes, favs, artistOf, liveSongId]);

  const maxScore = useMemo(() => {
    let max = 1;
    for (const id of allIds) {
      if ((scores[id] ?? 0) > max) max = scores[id];
    }
    return max;
  }, [allIds, scores]);

  const barWidth = (songid: string) => {
    const s = scores[songid] ?? 0;
    return Math.max(8, Math.min(100, Math.round((s / maxScore) * 100)));
  };

  return (
    <div className="px-4 pt-2">
      {/* Favorites */}
      {favs.length > 0 && (
        <>
          <h2 className="mb-2 px-1 text-lg font-bold text-white">
            ⭐ Избранные артисты
          </h2>
          <div className="mb-5 flex flex-wrap gap-2">
            {favs.map((a) => {
              const live =
                data?.current.artist &&
                data.current.artist.toLowerCase() === a.toLowerCase();
              return (
                <span
                  key={a}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                    live
                      ? "border-amber-400/50 bg-amber-400/20 text-amber-200"
                      : "border-white/10 bg-white/[0.05] text-slate-200"
                  }`}
                >
                  {live && (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                  )}
                  {a}
                  <button
                    onClick={() => removeFavorite(a)}
                    className="ml-0.5 text-slate-400 hover:text-rose-300"
                    aria-label="Убрать"
                  >
                    ✕
                  </button>
                </span>
              );
            })}
          </div>
        </>
      )}

      {/* Now playing */}
      <h2 className="mb-3 px-1 text-lg font-bold text-white">Сейчас играет</h2>
      {data?.current && (
        <div className="mb-6 rounded-2xl border border-teal-400/30 bg-teal-400/10 p-3">
          <div className="flex items-center gap-3">
            <AlbumArt
              src={data.current.img}
              alt={data.current.artist}
              className="h-14 w-14 flex-shrink-0"
              rounded="rounded-xl"
              spinning
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">
                {data.current.artist}
              </p>
              <p className="truncate text-sm text-teal-200/80">
                {data.current.title || "—"}
              </p>
            </div>
            <StarButton artist={data.current.artist} />
            <LikeHeart
              songid={currentSongId(data)}
              agg={votes[currentSongId(data)]}
              onLike={like}
            />
          </div>
          <PopularityBar
            width={barWidth(currentSongId(data))}
            likes={votes[currentSongId(data)]?.up ?? 0}
          />
        </div>
      )}

      {/* Next */}
      {next.length > 0 && (
        <>
          <h2 className="mb-3 px-1 text-lg font-bold text-white">Далее</h2>
          <ul className="mb-6 space-y-2">
            {next.map((t, i) => (
              <TrackRow
                key={`next-${t.songid}-${i}`}
                track={t}
                agg={votes[t.songid]}
                width={barWidth(t.songid)}
                onLike={like}
                badge="скоро"
                premium={premium}
              />
            ))}
          </ul>
        </>
      )}

      {/* History */}
      <h2 className="mb-3 px-1 text-lg font-bold text-white">История эфира</h2>
      {history.length === 0 ? (
        <p className="px-1 py-8 text-center text-sm text-slate-500">
          История пока пуста…
        </p>
      ) : (
        <ul className="space-y-2 pb-4">
          {history.map((t, i) => (
            <TrackRow
              key={`hist-${t.songid}-${i}`}
              track={t}
              agg={votes[t.songid]}
              width={barWidth(t.songid)}
              onLike={like}
              time={t.time}
              premium={premium}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function currentSongId(data: NowPlaying): string {
  return (
    data.current.song ||
    `${data.current.artist} - ${data.current.title}` ||
    "current"
  );
}

function StarButton({ artist }: { artist: string }) {
  const [fav, setFav] = useState(false);
  useEffect(() => {
    setFav(isFavorite(artist));
    return onFavoritesChanged(() => setFav(isFavorite(artist)));
  }, [artist]);
  return (
    <button
      onClick={() => {
        setFav(toggleFavorite(artist));
        navigator.vibrate?.(15);
      }}
      aria-label="Избранный артист"
      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border transition active:scale-90 ${
        fav
          ? "border-amber-400/50 bg-amber-400/20 text-amber-300"
          : "border-white/10 bg-white/5 text-slate-400"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill={fav ? "currentColor" : "none"}>
        <path
          d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17.8 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function LikeHeart({
  songid,
  agg,
  onLike,
}: {
  songid: string;
  agg?: VoteAgg;
  onLike: (songid: string) => void;
}) {
  const liked = agg?.mine === 1;
  const count = agg?.up ?? 0;
  return (
    <button
      onClick={() => onLike(songid)}
      aria-label="Нравится трек"
      className={`flex flex-shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-sm transition active:scale-90 ${
        liked
          ? "border-pink-400/60 bg-pink-500/20 text-pink-400"
          : "border-white/15 bg-white/5 text-white"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill={liked ? "currentColor" : "none"}>
        <path
          d="M12 21s-7-4.35-9.5-8.5C1 9 3 5.5 6.5 5.5c2 0 3.5 1.5 5.5 3.5 2-2 3.5-3.5 5.5-3.5C21 5.5 23 9 21.5 12.5 19 16.65 12 21 12 21z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      {count > 0 && <span className="text-xs font-medium">{count}</span>}
    </button>
  );
}

function PopularityBar({ width, likes }: { width: number; likes: number }) {
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-[10px] text-slate-400">
        <span>Популярность</span>
        <span>{likes} ❤️</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-400 to-purple-400 transition-all duration-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function TrackRow({
  track,
  agg,
  width,
  onLike,
  time,
  badge,
  premium,
}: {
  track: Track;
  agg?: VoteAgg;
  width: number;
  onLike: (songid: string) => void;
  time?: string;
  badge?: string;
  premium: boolean;
}) {
  return (
    <li className="fade-up rounded-2xl border border-white/5 bg-white/[0.03] p-2.5">
      <div className="flex items-center gap-3">
        <AlbumArt
          src={track.img}
          alt={track.artist}
          className="h-11 w-11 flex-shrink-0"
          rounded="rounded-lg"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-100">
            {track.artist}
          </p>
          <p className="truncate text-xs text-slate-400">
            {track.title || "—"}
          </p>
        </div>
        {badge && (
          <span className="rounded-full bg-purple-400/15 px-2 py-0.5 text-[10px] font-semibold text-purple-200">
            {badge}
          </span>
        )}
        {time && (
          <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-300">
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-slate-500" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
              <path
                d="M12 8v4l3 2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            {time.slice(0, 5)}
          </span>
        )}
        <StarButton artist={track.artist} />
        <LikeHeart songid={track.songid} agg={agg} onLike={onLike} />
      </div>
      <PopularityBar width={width} likes={agg?.up ?? 0} />
      <DownloadRow track={track} premium={premium} />
    </li>
  );
}

function DownloadRow({ track, premium }: { track: Track; premium: boolean }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-[11px] text-slate-400">Поиск:</span>
      <a
        href={youtubeSearch(track.artist, track.title)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 rounded-full border border-red-400/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-200 transition active:scale-95"
      >
        ▶ YouTube
      </a>
      <a
        href={vkSearch(track.artist, track.title)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-200 transition active:scale-95"
      >
        🎵 ВК
      </a>
      {premium ? (
        <a
          href={downloadSearch(track.artist, track.title)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-400/20 to-yellow-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-200 transition active:scale-95"
        >
          ⬇️ Скачать
        </a>
      ) : (
        <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-500">
          👑 Скачать
        </span>
      )}
    </div>
  );
}
