"use client";

import { useState } from "react";
import { setPremiumUser } from "@/lib/premium";

const DONATE_URL = "https://vk.com/chillou_fm?w=donut_payment-46701989";

const FREE_FEATURES = [
  "🎵 Радио в эфире 128 kbps",
  "📋 Плейлист и история треков",
  "🔍 Поиск треков на YouTube и ВК",
  "❤️ Лайки и избранные артисты",
  "💬 Общий чат",
  "⏰ Будильник и таймер сна",
];

const PREMIUM_FEATURES = [
  "👑 Золотая корона в чате",
  "🔊 Звук высокого качества 320 kbps",
  "🔒 Закрытая премиум-комната",
  "⬇️ Скачивание треков (YouTube/ВК)",
  "⭐ Приоритетная поддержка радио",
  "✨ Все функции обычного профиля",
];

export default function PremiumModal({
  open,
  onClose,
  onActivated,
}: {
  open: boolean;
  onClose: () => void;
  onActivated: () => void;
}) {
  const [step, setStep] = useState<"info" | "waiting">("info");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showHint, setShowHint] = useState(false);

  if (!open) return null;

  const goSupport = () => {
    // открываем страницу поддержки VK Donut (с фолбэком для WebView)
    const w = window.open(DONATE_URL, "_blank", "noopener,noreferrer");
    if (!w) {
      const a = document.createElement("a");
      a.href = DONATE_URL;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    }
    setStep("waiting");
  };

  const activate = async () => {
    const value = code.trim();
    if (!value) {
      setErr("Введите код или ваш VK ID");
      return;
    }
    setBusy(true);
    setErr("");
    const digits = value.replace(/\D/g, "");
    const looksLikeVkId = digits.length >= 4 && !/[a-zA-Z]/.test(value);
    try {
      const res = await fetch("/api/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          looksLikeVkId
            ? { mode: "vk", vkUserId: digits }
            : { mode: "code", code: value }
        ),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && json.ok) {
        setPremiumUser(true);
        if (digits) localStorage.setItem("chillout_vk_id", digits);
        onActivated();
        onClose();
        setStep("info");
        setCode("");
        window.alert("🎉 Премиум активирован! 👑");
      } else {
        setErr(
          json.error ||
            "Не найдено. Проверьте код или оформите поддержку через VK Donut."
        );
      }
    } catch {
      setErr("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="fade-up max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0f1630] p-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-xl text-[#0b1020]">
            👑
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">Профили ChilloutFM</h2>
            <p className="text-xs text-slate-400">Выберите свой уровень</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400"
          >
            ✕
          </button>
        </div>

        {step === "info" ? (
          <>
            {/* Обычный */}
            <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg">👤</span>
                <h3 className="font-bold text-white">Обычный</h3>
                <span className="ml-auto text-xs text-slate-400">Бесплатно</span>
              </div>
              <ul className="space-y-1.5">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="text-sm text-slate-300">
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Премиум */}
            <div className="mb-4 rounded-2xl border border-amber-400/40 bg-gradient-to-b from-amber-400/10 to-transparent p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg">👑</span>
                <h3 className="font-bold text-amber-200">Премиум</h3>
                <span className="ml-auto rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-200">
                  поддержка радио
                </span>
              </div>
              <ul className="space-y-1.5">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="text-sm text-amber-100/90">
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={goSupport}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 py-3.5 text-sm font-bold text-[#0b1020] transition active:scale-[0.98]"
            >
              💛 Поддержать радио и получить Премиум
            </button>
            {/* Ввод кода / VK ID прямо в окне (работает в APK) */}
            <div className="mt-2 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-300">
                  Уже есть код или VK ID? Введите здесь:
                </p>
                <button
                  onClick={() => setShowHint(true)}
                  className="flex-shrink-0 rounded-full border border-sky-400/40 bg-sky-400/10 px-2.5 py-1 text-[11px] font-medium text-sky-300"
                >
                  ❓ Подсказка
                </button>
              </div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Код или VK ID"
                className="mb-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-400/50"
              />
              {err && <p className="mb-2 text-xs text-rose-300">{err}</p>}
              <button
                onClick={() => void activate()}
                disabled={busy}
                className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 py-2.5 text-sm font-bold text-[#0b1020] disabled:opacity-50"
              >
                {busy ? "Проверка…" : "✅ Активировать премиум"}
              </button>
            </div>
          </>
        ) : (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/20 text-3xl">
              💛
            </div>
            <h3 className="mb-2 text-base font-bold text-white">
              Спасибо за поддержку!
            </h3>
            <p className="mb-5 text-sm text-slate-300">
              После оформления поддержки на странице VK введите ваш код или VK ID
              ниже — премиум активируется сразу.
            </p>
            <div className="mb-2 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-3 text-left">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-300">
                  Введите код или ваш VK ID:
                </p>
                <button
                  onClick={() => setShowHint(true)}
                  className="flex-shrink-0 rounded-full border border-sky-400/40 bg-sky-400/10 px-2.5 py-1 text-[11px] font-medium text-sky-300"
                >
                  ❓ Подсказка
                </button>
              </div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Код или VK ID"
                className="mb-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-400/50"
              />
              {err && <p className="mb-2 text-xs text-rose-300">{err}</p>}
              <button
                onClick={() => void activate()}
                disabled={busy}
                className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 py-2.5 text-sm font-bold text-[#0b1020] disabled:opacity-50"
              >
                {busy ? "Проверка…" : "✅ Активировать премиум"}
              </button>
            </div>
            <button
              onClick={goSupport}
              className="mb-2 w-full rounded-2xl border border-white/10 py-2.5 text-sm text-slate-300"
            >
              Открыть страницу поддержки ещё раз
            </button>
            <button
              onClick={() => setStep("info")}
              className="w-full py-2 text-xs text-slate-500"
            >
              ← Назад к описанию
            </button>
          </div>
        )}
      </div>

      {/* окно-подсказка про VK ID */}
      {showHint && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-5"
          onClick={() => setShowHint(false)}
        >
          <div
            className="fade-up w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f1630] p-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 text-3xl">🔎</div>
            <h3 className="mb-2 text-base font-bold text-white">
              Как узнать свой VK ID
            </h3>
            <p className="mb-4 text-sm leading-relaxed text-slate-300">
              Чтобы найти ваш числовой ID (номер аккаунта), зайдите в личный
              кабинет VK ID в раздел «Мои данные» — номер будет указан рядом с
              фото.
            </p>
            <a
              href="https://id.vk.com/account/#/personal"
              target="_blank"
              rel="noopener noreferrer"
              className="mb-2 block w-full rounded-xl bg-[#0077FF] py-2.5 text-sm font-bold text-white"
            >
              Открыть личный кабинет VK ID ↗
            </a>
            <button
              onClick={() => setShowHint(false)}
              className="w-full rounded-xl border border-white/10 py-2 text-sm text-slate-300"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
