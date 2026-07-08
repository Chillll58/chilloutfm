"use client";

import { useEffect, useState } from "react";

// При выпуске новой версии меняйте это значение (дата/тег последней сборки,
// которую вы залили). Приложение сравнит её с датой релиза на GitHub.
const CURRENT_BUILD = "2026-07-06T20:49:12Z";

type UpdateInfo = {
  ok: boolean;
  publishedAt?: string;
  name?: string;
  url: string;
};

export default function UpdateBanner() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/update", { cache: "no-store" });
        const json = (await res.json()) as UpdateInfo;
        if (cancelled || !json.ok || !json.publishedAt) return;

        const latest = new Date(json.publishedAt).getTime();
        const current = new Date(CURRENT_BUILD).getTime();
        const seen = localStorage.getItem("chillout_update_seen");

        // показываем, если релиз новее текущей сборки и его ещё не скрыли
        if (latest > current && seen !== json.publishedAt) {
          setInfo(json);
          setDismissed(false);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (dismissed || !info) return null;

  const close = () => {
    if (info.publishedAt) {
      localStorage.setItem("chillout_update_seen", info.publishedAt);
    }
    setDismissed(true);
  };

  return (
    <div className="relative z-20 mx-3 mb-1 mt-1 flex items-center gap-3 rounded-2xl border border-teal-400/40 bg-gradient-to-r from-teal-500/20 to-purple-500/20 p-3 backdrop-blur">
      <span className="text-2xl">🎉</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">Доступна новая версия!</p>
        <p className="truncate text-xs text-slate-300">
          Обновите приложение до последней версии
        </p>
      </div>
      <a
        href={info.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={close}
        className="flex-shrink-0 rounded-full bg-gradient-to-r from-teal-400 to-purple-500 px-3 py-1.5 text-xs font-bold text-[#0b1020]"
      >
        Обновить
      </a>
      <button
        onClick={close}
        className="flex-shrink-0 text-slate-400"
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>
  );
}
