"use client";

import { useState } from "react";
import type { DatingProfile } from "@/lib/dating";

export default function LoginPanel({
  onBack,
  onLoggedIn,
}: {
  onBack: () => void;
  onLoggedIn: (p: DatingProfile) => void;
}) {
  const [step, setStep] = useState<"login" | "recover">("login");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPass, setNewPass] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const login = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/dating/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          contact: contact.trim().toLowerCase(),
          password,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        profile?: DatingProfile;
        error?: string;
      };
      if (json.ok && json.profile) onLoggedIn(json.profile);
      else setErr(json.error || "Ошибка входа");
    } catch {
      setErr("Ошибка сети");
    } finally {
      setBusy(false);
    }
  };

  const sendCode = async () => {
    setErr("");
    if (!contact.trim()) {
      setErr("Введите телефон или email");
      return;
    }
    try {
      const res = await fetch("/api/dating/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", contact: contact.trim().toLowerCase() }),
      });
      const json = (await res.json()) as { devCode?: string };
      setCodeSent(true);
      if (json.devCode) setDevCode(json.devCode);
    } catch {
      setErr("Не удалось отправить код");
    }
  };

  const reset = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/dating/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset",
          contact: contact.trim().toLowerCase(),
          code: code.trim(),
          password: newPass,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        profile?: DatingProfile;
        error?: string;
      };
      if (json.ok && json.profile) onLoggedIn(json.profile);
      else setErr(json.error || "Не удалось сбросить пароль");
    } catch {
      setErr("Ошибка сети");
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-pink-400/50";

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-5 pb-28 pt-2">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-300"
        >
          ←
        </button>
        <h2 className="text-lg font-bold text-white">
          {step === "login" ? "Вход" : "Восстановление доступа"}
        </h2>
      </div>

      {step === "login" ? (
        <div className="space-y-3">
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Телефон или email"
            className={input}
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Пароль"
            className={input}
          />
          {err && <p className="text-sm text-rose-300">{err}</p>}
          <button
            onClick={() => void login()}
            disabled={busy}
            className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Войти
          </button>
          <button
            onClick={() => {
              setStep("recover");
              setErr("");
            }}
            className="w-full text-center text-xs text-slate-400"
          >
            Забыли пароль? Восстановить по SMS/email
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Телефон или email из анкеты"
            className={input}
          />
          {!codeSent ? (
            <button
              onClick={() => void sendCode()}
              className="w-full rounded-2xl bg-teal-400 py-3 text-sm font-bold text-[#0b1020]"
            >
              Получить код
            </button>
          ) : (
            <>
              {devCode && (
                <p className="text-[11px] text-amber-300">
                  Демо-код: <b>{devCode}</b> (SMS/email провайдер не настроен)
                </p>
              )}
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Код из сообщения"
                inputMode="numeric"
                className={input}
              />
              <input
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                type="password"
                placeholder="Новый пароль"
                className={input}
              />
              <button
                onClick={() => void reset()}
                disabled={busy}
                className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                Сбросить пароль и войти
              </button>
            </>
          )}
          {err && <p className="text-sm text-rose-300">{err}</p>}
          <button
            onClick={() => {
              setStep("login");
              setErr("");
              setCodeSent(false);
            }}
            className="w-full text-center text-xs text-slate-400"
          >
            ← Назад ко входу
          </button>
        </div>
      )}
    </div>
  );
}
