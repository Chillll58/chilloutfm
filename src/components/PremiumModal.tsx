"use client";

import { useEffect, useState } from "react";
import { unlockPremiumFlow, setPremiumUser } from "@/lib/premium";
import { setVkUser, type VkUser } from "@/lib/vkauth";

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

  // Listen for VK OAuth popup result
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as {
        type?: string;
        data?: { user?: VkUser; premium?: boolean };
      };
      if (d?.type === "chillout-vk-auth" && d.data?.user) {
        setVkUser(d.data.user);
        if (d.data.premium) {
          setPremiumUser(true);
          onActivated();
          onClose();
          window.alert("🎉 Вы вошли через VK. Премиум активирован! 👑");
        } else {
          window.alert(
            "Вы вошли через VK, но активная подписка не найдена. Оформите поддержку через VK Donut."
          );
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [onActivated, onClose]);

  const loginVk = () => {
    const w = 640;
    const h = 720;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    window.open(
      "/api/vk/login",
      "vk_oauth",
      `width=${w},height=${h},left=${left},top=${top}`
    );
  };

  if (!open) return null;

  const goSupport = () => {
    // открываем страницу поддержки VK Donut
    window.open(DONATE_URL, "_blank", "noopener,noreferrer");
    setStep("waiting");
  };

  const activate = async () => {
    const ok = await unlockPremiumFlow();
    if (ok) {
      onActivated();
      onClose();
      setStep("info");
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
              onClick={loginVk}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0077FF] py-3.5 text-sm font-bold text-white transition active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M12.7 16.3c-4.9 0-8-3.4-8.1-9h2.5c.1 4.1 2 5.8 3.4 6.2V7.3h2.3v3.5c1.4-.2 2.9-1.8 3.4-3.5h2.3c-.4 2.1-1.9 3.7-3 4.4 1.1.5 2.8 1.9 3.5 4.6h-2.6c-.5-1.7-1.9-3-3.6-3.2v3.2h-.3z" />
              </svg>
              Войти через VK
            </button>
            <button
              onClick={goSupport}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 py-3.5 text-sm font-bold text-[#0b1020] transition active:scale-[0.98]"
            >
              💛 Поддержать радио и получить Премиум
            </button>
            <button
              onClick={() => void activate()}
              className="w-full rounded-2xl border border-amber-400/40 py-2.5 text-sm font-medium text-amber-200"
            >
              У меня уже есть подписка / код
            </button>
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
              После оформления поддержки на странице VK нажмите кнопку ниже —
              премиум активируется автоматически по вашему VK ID.
            </p>
            <button
              onClick={loginVk}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0077FF] py-3.5 text-sm font-bold text-white transition active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M12.7 16.3c-4.9 0-8-3.4-8.1-9h2.5c.1 4.1 2 5.8 3.4 6.2V7.3h2.3v3.5c1.4-.2 2.9-1.8 3.4-3.5h2.3c-.4 2.1-1.9 3.7-3 4.4 1.1.5 2.8 1.9 3.5 4.6h-2.6c-.5-1.7-1.9-3-3.6-3.2v3.2h-.3z" />
              </svg>
              ✅ Войти через VK и активировать
            </button>
            <button
              onClick={() => void activate()}
              className="mb-2 w-full rounded-2xl border border-amber-400/40 py-2.5 text-sm font-medium text-amber-200"
            >
              Активировать по VK ID / коду
            </button>
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
    </div>
  );
}
