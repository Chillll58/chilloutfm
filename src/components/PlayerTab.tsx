"use client";

import { useEffect, useState } from "react";
import type { NowPlaying } from "@/lib/types";
import AlbumArt from "./AlbumArt";

const STATION_URL = "https://myradio24.com/8795";

function StationFavorite({ count }: { count: number }) {
  const [faved, setFaved] = useState(false);

  useEffect(() => {
    setFaved(localStorage.getItem("chillout_station_fav") === "1");
  }, []);

  const toggle = () => {
    const next = !faved;
    setFaved(next);
    localStorage.setItem("chillout_station_fav", next ? "1" : "0");
    navigator.vibrate?.(20);
    if (next) {
      // синхронизация с сервисом: открываем страницу станции,
      // где лайк регистрируется в аккаунте myradio24
      window.open(STATION_URL, "_blank", "noopener,noreferrer");
    }
  };

  // оптимистично показываем +1, если пользователь добавил в избранное
  const shown = count + (faved ? 1 : 0);

  return (
    <button
      onClick={toggle}
      aria-label="В избранное станции"
      className={`flex items-center gap-1.5 transition active:scale-90 ${
        faved ? "text-pink-400" : "text-slate-400"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill={faved ? "currentColor" : "none"}
      >
        <path
          d="M12 21s-7-4.35-9.5-8.5C1 9 3 5.5 6.5 5.5c2 0 3.5 1.5 5.5 3.5 2-2 3.5-3.5 5.5-3.5C21 5.5 23 9 21.5 12.5 19 16.65 12 21 12 21z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      {shown}
    </button>
  );
}

function Equalizer({ active }: { active: boolean }) {
  return (
    <div className="flex h-4 items-end gap-[3px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="eq-bar w-[3px] rounded-full bg-teal-300"
          style={{
            height: "100%",
            animationDelay: `${i * 0.12}s`,
            animationPlayState: active ? "running" : "paused",
            opacity: active ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  );
}

export default function PlayerTab({
  data,
  isPlaying,
  isLoading,
  onToggle,
  volume,
  onVolume,
  isFavorite,
  onToggleFavorite,
  premium,
  quality,
  onQualityChange,
  onSelectProfile,
}: {
  data: NowPlaying | null;
  isPlaying: boolean;
  isLoading: boolean;
  onToggle: () => void;
  volume: number;
  onVolume: (v: number) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  premium: boolean;
  quality: "sd" | "hq";
  onQualityChange: (q: "sd" | "hq") => void;
  onSelectProfile: (target: "free" | "premium") => void;
}) {
  const artist = data?.current.artist || "ChilloutFM";
  const title = data?.current.title || (data ? "" : "Загрузка…");

  return (
    <div className="player-shell flex flex-col items-center px-6 pb-32 pt-3">
      {/* profile switcher */}
      <div className="mb-4 flex w-full max-w-[320px] items-center gap-1.5 rounded-full border border-white/10 bg-white/5 p-1">
        <button
          onClick={() => onSelectProfile("free")}
          className={`flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
            !premium
              ? "bg-gradient-to-r from-teal-400 to-purple-500 text-[#0b1020]"
              : "text-slate-300"
          }`}
        >
          👤 Обычный
        </button>
        <button
          onClick={() => onSelectProfile("premium")}
          className={`flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
            premium
              ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-[#0b1020]"
              : "text-amber-300"
          }`}
        >
          👑 Премиум {!premium && "🔒"}
        </button>
      </div>

      {/* quality selector */}
      <div className="mb-4 flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-xs">
        <button
          onClick={() => onQualityChange("sd")}
          className={`rounded-full px-3 py-1 font-medium transition ${
            quality === "sd"
              ? "bg-gradient-to-r from-teal-400 to-purple-500 text-[#0b1020]"
              : "text-slate-300"
          }`}
        >
          128 kbps
        </button>
        <button
          onClick={() => onQualityChange("hq")}
          className={`flex items-center gap-1 rounded-full px-3 py-1 font-medium transition ${
            quality === "hq"
              ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-[#0b1020]"
              : premium
                ? "text-amber-300"
                : "text-slate-500"
          }`}
        >
          👑 320 HQ {!premium && "🔒"}
        </button>
      </div>

      {/* Artwork */}
      <div className="player-art relative mb-4 aspect-square w-full max-w-[300px] sm:max-w-[340px] md:max-w-[380px]">
        <div className="glow-pulse pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[115%] w-[115%] rounded-full bg-gradient-to-tr from-teal-500/40 via-purple-500/40 to-pink-500/40 blur-3xl" />
        <AlbumArt
          src={data?.current.img}
          alt={artist}
          className="h-full w-full shadow-2xl shadow-black/50 ring-1 ring-white/10"
          rounded="rounded-[2rem]"
          spinning={isPlaying}
        />
        <div className="absolute bottom-3 right-3 rounded-full bg-black/50 p-2.5 backdrop-blur">
          <Equalizer active={isPlaying && !isLoading} />
        </div>
      </div>

      <div className="player-right flex w-full flex-col items-center">
      {/* Track info */}
      <div className="mb-1 flex w-full items-center justify-center gap-2 px-2">
        <div className="min-w-0 text-center">
          <h1 className="truncate text-2xl font-bold text-white">{artist}</h1>
          <p className="mt-1 line-clamp-2 text-base text-teal-200/90">
            {title || "\u00A0"}
          </p>
        </div>
        <button
          onClick={onToggleFavorite}
          aria-label="В избранное"
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border transition active:scale-90 ${
            isFavorite
              ? "border-pink-400/50 bg-pink-500/20 text-pink-300"
              : "border-white/10 bg-white/5 text-slate-400"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill={isFavorite ? "currentColor" : "none"}
          >
            <path
              d="M12 21s-7-4.35-9.5-8.5C1 9 3 5.5 6.5 5.5c2 0 3.5 1.5 5.5 3.5 2-2 3.5-3.5 5.5-3.5C21 5.5 23 9 21.5 12.5 19 16.65 12 21 12 21z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Listeners */}
      <div className="mb-4 mt-2 flex items-center gap-5 text-sm text-slate-400">
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
            <path
              d="M16 20v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M10 10a3 3 0 100-6 3 3 0 000 6zM20 20v-2a4 4 0 00-3-3.87M16 4.13A4 4 0 0116 12"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {data?.listeners ?? 0} слушают
        </span>
        <StationFavorite count={data?.favorites ?? 0} />
      </div>

      {/* Play button */}
      <button
        onClick={onToggle}
        aria-label={isPlaying ? "Пауза" : "Слушать"}
        className="play-btn group relative mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-purple-500 text-[#0b1020] shadow-lg shadow-purple-500/30 transition active:scale-95"
      >
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-400 to-purple-500 opacity-60 blur-lg transition group-hover:opacity-90" />
        <span className="relative">
          {isLoading ? (
            <svg viewBox="0 0 24 24" className="h-8 w-8 animate-spin" fill="none">
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="44"
                strokeDashoffset="14"
              />
            </svg>
          ) : isPlaying ? (
            <svg viewBox="0 0 24 24" className="h-9 w-9" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1.5" />
              <rect x="14" y="5" width="4" height="14" rx="1.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-1 h-9 w-9" fill="currentColor">
              <path d="M7 5.5v13a1 1 0 001.53.85l10-6.5a1 1 0 000-1.7l-10-6.5A1 1 0 007 5.5z" />
            </svg>
          )}
        </span>
      </button>

      {/* Volume */}
      <div className="flex w-full max-w-[300px] items-center gap-3 sm:max-w-[380px]">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none">
          <path
            d="M4 9v6h4l5 4V5L8 9H4z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onVolume(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-teal-400"
          style={{
            background: `linear-gradient(to right, #2dd4bf ${
              volume * 100
            }%, rgba(255,255,255,0.15) ${volume * 100}%)`,
          }}
        />
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none">
          <path
            d="M4 9v6h4l5 4V5L8 9H4zM16 9a3 3 0 010 6M18.5 6.5a7 7 0 010 11"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      </div>
    </div>
  );
}
