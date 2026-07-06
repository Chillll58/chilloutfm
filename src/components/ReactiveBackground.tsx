"use client";

import { useEffect, useRef } from "react";

/**
 * Visible music-reactive background.
 * Animated colored blobs + equalizer bars at the bottom that pulse.
 * When playing, motion and brightness increase noticeably.
 */
export default function ReactiveBackground({
  active,
}: {
  active: boolean;
}) {
  const blob1 = useRef<HTMLDivElement>(null);
  const blob2 = useRef<HTMLDivElement>(null);
  const blob3 = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    let t = 0;
    const bars = barsRef.current
      ? Array.from(barsRef.current.children) as HTMLElement[]
      : [];

    const tick = () => {
      const on = activeRef.current;
      t += on ? 0.03 : 0.008;

      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
      const pulse2 = 0.5 + 0.5 * Math.sin(t * 1.6 + 1.5);

      if (blob1.current) {
        const x = Math.sin(t * 0.7) * 26;
        const y = Math.cos(t * 0.55) * 22;
        const s = 1 + (on ? pulse * 0.35 : pulse * 0.08);
        blob1.current.style.transform = `translate(${x}%, ${y}%) scale(${s})`;
        blob1.current.style.opacity = String(on ? 0.5 + pulse * 0.3 : 0.28);
      }
      if (blob2.current) {
        const x = Math.cos(t * 0.5) * 30;
        const y = Math.sin(t * 0.65) * 24;
        const s = 1 + (on ? pulse2 * 0.4 : pulse2 * 0.1);
        blob2.current.style.transform = `translate(${x}%, ${y}%) scale(${s})`;
        blob2.current.style.opacity = String(on ? 0.5 + pulse2 * 0.3 : 0.26);
      }
      if (blob3.current) {
        const x = Math.sin(t * 0.4 + 2) * 24;
        const y = Math.cos(t * 0.6 + 1) * 20;
        const s = 1 + (on ? pulse * 0.3 : 0.05);
        blob3.current.style.transform = `translate(${x}%, ${y}%) scale(${s})`;
        blob3.current.style.opacity = String(on ? 0.45 + pulse * 0.25 : 0.22);
      }

      // bottom equalizer bars
      for (let i = 0; i < bars.length; i++) {
        const phase = t * 3 + i * 0.5;
        const base = 0.15 + 0.85 * Math.abs(Math.sin(phase));
        const h = on ? base : 0.12 + 0.1 * Math.abs(Math.sin(phase));
        bars[i].style.transform = `scaleY(${h})`;
        bars[i].style.opacity = String(on ? 0.5 + base * 0.4 : 0.18);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* colored moving blobs */}
      <div
        ref={blob1}
        className="absolute left-[10%] top-[8%] h-64 w-64 rounded-full bg-teal-500 blur-[70px] will-change-transform"
      />
      <div
        ref={blob2}
        className="absolute right-[8%] top-[35%] h-72 w-72 rounded-full bg-fuchsia-500 blur-[80px] will-change-transform"
      />
      <div
        ref={blob3}
        className="absolute bottom-[18%] left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500 blur-[75px] will-change-transform"
      />

      {/* bottom equalizer bars */}
      <div
        ref={barsRef}
        className="absolute inset-x-0 bottom-0 flex h-40 items-end justify-center gap-1 px-2"
      >
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="h-full flex-1 origin-bottom rounded-t-full bg-gradient-to-t from-teal-400 via-purple-400 to-transparent will-change-transform"
            style={{ transform: "scaleY(0.12)" }}
          />
        ))}
      </div>

      {/* subtle dark veil so text stays readable */}
      <div className="absolute inset-0 bg-[#0b1020]/55" />
    </div>
  );
}
