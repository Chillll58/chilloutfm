"use client";

import { useRef, useState } from "react";
import type { DatingProfile } from "@/lib/dating";

export default function SwipeDeck({
  profiles,
  onOpen,
  onLikeSwipe,
  onWatch,
  onRate,
}: {
  profiles: DatingProfile[];
  onOpen: (p: DatingProfile) => void;
  onLikeSwipe: (p: DatingProfile, liked: boolean) => void;
  onWatch?: (p: DatingProfile) => void;
  onRate?: (p: DatingProfile, value: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const moved = useRef(false);

  const current = profiles[index];
  const next = profiles[index + 1];

  if (!current) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">
        Анкеты закончились 💫
        <br />
        <button
          onClick={() => setIndex(0)}
          className="mt-3 rounded-full bg-white/10 px-4 py-2 text-xs text-slate-200"
        >
          Смотреть заново
        </button>
      </div>
    );
  }

  const commit = (liked: boolean) => {
    onLikeSwipe(current, liked);
    setDx(liked ? 600 : -600);
    setTimeout(() => {
      setDx(0);
      setIndex((i) => i + 1);
    }, 180);
  };

  const onDown = (x: number) => {
    startX.current = x;
    moved.current = false;
    setDragging(true);
  };
  const onMove = (x: number) => {
    if (!dragging) return;
    const d = x - startX.current;
    if (Math.abs(d) > 6) moved.current = true;
    setDx(d);
  };
  const onUp = () => {
    setDragging(false);
    if (dx > 110) commit(true);
    else if (dx < -110) commit(false);
    else {
      if (!moved.current) onOpen(current);
      setDx(0);
    }
  };

  const rot = dx / 20;
  const likeOp = Math.max(0, Math.min(1, dx / 110));
  const nopeOp = Math.max(0, Math.min(1, -dx / 110));

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[62vh] max-h-[560px] w-full max-w-sm select-none">
        {/* next card behind */}
        {next && (
          <Card
            p={next}
            style={{
              transform: "scale(0.95) translateY(12px)",
              zIndex: 1,
            }}
          />
        )}
        {/* live badge (clickable) */}
        {current.live && (
          <button
            onClick={() => onWatch?.(current)}
            className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white shadow-lg"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            LIVE · смотреть
          </button>
        )}
        {/* current card */}
        <Card
          p={current}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            onDown(e.clientX);
          }}
          onPointerMove={(e) => onMove(e.clientX)}
          onPointerUp={onUp}
          style={{
            transform: `translateX(${dx}px) rotate(${rot}deg)`,
            transition: dragging ? "none" : "transform 0.2s ease",
            zIndex: 2,
            cursor: "grab",
          }}
          overlay={
            <>
              <span
                className="absolute left-4 top-4 rounded-lg border-2 border-emerald-400 px-2 py-0.5 text-lg font-black text-emerald-400"
                style={{ opacity: likeOp, transform: "rotate(-12deg)" }}
              >
                НРАВИТСЯ
              </span>
              <span
                className="absolute right-4 top-4 rounded-lg border-2 border-rose-400 px-2 py-0.5 text-lg font-black text-rose-400"
                style={{ opacity: nopeOp, transform: "rotate(12deg)" }}
              >
                ПРОПУСК
              </span>
            </>
          }
        />
      </div>

      {/* action buttons */}
      <div className="mt-4 flex items-center gap-5">
        <button
          onClick={() => commit(false)}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5 text-2xl text-rose-400 active:scale-90"
        >
          ✕
        </button>
        <button
          onClick={() => onOpen(current)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-lg text-sky-300 active:scale-90"
        >
          ℹ
        </button>
        <button
          onClick={() => commit(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-500 text-2xl text-white active:scale-90"
        >
          ❤️
        </button>
      </div>
      {/* оценка (перелистывает после голоса) */}
      <div className="mt-3 flex items-center gap-1">
        <span className="mr-1 text-[11px] text-slate-400">Оценить:</span>
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            onClick={() => {
              onRate?.(current, v);
              commit(true);
            }}
            className="text-xl transition active:scale-125"
          >
            ⭐
          </button>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        Свайп вправо — нравится, влево — пропустить, тап — открыть
      </p>
    </div>
  );
}

function Card({
  p,
  style,
  overlay,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  p: DatingProfile;
  style?: React.CSSProperties;
  overlay?: React.ReactNode;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl"
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {p.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.photo}
          alt={p.name}
          draggable={false}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-8xl">
          {p.gender === "female" ? "👩" : "👨"}
        </div>
      )}

      {/* gradient + info */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold text-white">
            {p.name}
            {p.age ? `, ${p.age}` : ""}
          </h3>
          {p.premium === 1 && <span>👑</span>}
          {p.isTop && (
            <span className="rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[9px] font-bold text-[#0b1020]">
              🚀 ТОП
            </span>
          )}
          {p.adult === 1 && (
            <span className="rounded-full bg-rose-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
              18+
            </span>
          )}
        </div>
        <p className="text-sm text-slate-200">📍 {p.city || "—"}</p>
        {p.bio && <p className="mt-0.5 line-clamp-2 text-xs text-slate-300">{p.bio}</p>}
        {(p.ratingCount ?? 0) > 0 && (
          <p className="text-xs text-amber-300">⭐ {(p.rating ?? 0).toFixed(1)}</p>
        )}
      </div>

      {overlay}
    </div>
  );
}
