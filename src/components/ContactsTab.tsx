"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPanel from "./dating/AdminPanel";
import { getClientId } from "@/lib/clientId";

type MyFeedback = {
  id: number;
  subject: string;
  message: string;
  reply: string;
  repliedAt: string | null;
  createdAt: string;
};

const APP_VERSION = "1.0";
const UPDATE_URL =
  "https://github.com/Chillll58/chilloutfm/releases/tag/latest";
const SUPPORT_EMAIL = "support@chilloutfm.ru";
const PRIVACY_URL = "http://chilloutfm.ru/privacy-policies.pdf";
const TERMS_URL = "http://chilloutfm.ru/terms-of-use.pdf";

// ЮMoney кошелёк администратора
const YOOMONEY_PURSE = "410012399835166";
const COFFEE_URL =
  "https://yoomoney.ru/quickpay/confirm?" +
  new URLSearchParams({
    receiver: YOOMONEY_PURSE,
    "quickpay-form": "donate",
    targets: "ChilloutFM — админу на кофе ☕",
    paymentType: "AC",
    sum: "100",
  }).toString();

export default function ContactsTab() {
  const [contact, setContact] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [myMessages, setMyMessages] = useState<MyFeedback[]>([]);
  const [clientId, setClientId] = useState("");

  const loadMine = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/feedback?client=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as { messages?: MyFeedback[] };
      setMyMessages(json.messages ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("chillove_admin");
    if (saved) setAdminKey(saved);
    const id = getClientId();
    setClientId(id);
    loadMine(id);
  }, [loadMine]);

  const unlockAdmin = async () => {
    const key = window.prompt("Ключ администратора:");
    if (!key) return;
    try {
      const res = await fetch("/api/dating/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      if (res.ok) {
        localStorage.setItem("chillove_admin", key.trim());
        setAdminKey(key.trim());
        setShowAdmin(true);
      } else {
        window.alert("Неверный ключ");
      }
    } catch {
      window.alert("Ошибка проверки");
    }
  };

  const sendEmail = async () => {
    if (!message.trim()) return;
    setSending(true);
    setErr("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: contact.trim(),
          subject: subject.trim(),
          message: message.trim(),
          clientId,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (json.ok) {
        setSent(true);
        setSubject("");
        setMessage("");
        setContact("");
        loadMine(clientId);
      } else {
        setErr(json.error || "Не удалось отправить");
      }
    } catch {
      setErr("Ошибка сети. Попробуйте позже.");
    } finally {
      setSending(false);
    }
  };

  // экран админ-панели
  if (showAdmin && adminKey) {
    return <AdminPanel adminKey={adminKey} onBack={() => setShowAdmin(false)} />;
  }

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-28 pt-2">
      <div className="mb-4 flex items-center justify-between px-1">
        <h1 className="text-xl font-extrabold text-white">
          Контакты <span className="text-teal-300">Chill</span> 📬
        </h1>
        <button
          onClick={() => (adminKey ? setShowAdmin(true) : void unlockAdmin())}
          className={`rounded-full px-2.5 py-1.5 text-xs font-semibold ${
            adminKey
              ? "bg-amber-400/20 text-amber-300"
              : "border border-white/10 bg-white/5 text-slate-400"
          }`}
        >
          🛡 Админ
        </button>
      </div>

      {/* Обновление */}
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="mb-1 text-sm font-semibold text-white">Обновление</p>
        <p className="mb-3 text-xs text-slate-400">
          ChilloutFM · версия {APP_VERSION}
        </p>
        <a
          href={UPDATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-400 to-purple-500 py-2.5 text-sm font-bold text-[#0b1020] transition active:scale-[0.98]"
        >
          🔄 Проверить обновление
        </a>
      </div>

      {/* Донат */}
      <div className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
        <p className="mb-1 text-sm font-semibold text-amber-200">
          Поддержать проект
        </p>
        <p className="mb-3 text-xs text-slate-400">
          Добровольная благодарность разработчику (ЮMoney)
        </p>
        <a
          href={COFFEE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 py-2.5 text-sm font-semibold text-amber-200 transition active:scale-[0.98]"
        >
          ☕ Админу на кофе
        </a>
      </div>

      {/* Обратная связь */}
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="mb-1 text-sm font-semibold text-white">Обратная связь</p>
        <p className="mb-3 text-xs text-slate-400">
          Напишите админу прямо здесь — сообщение придёт на {SUPPORT_EMAIL}
        </p>

        {sent ? (
          <div className="rounded-xl border border-teal-400/40 bg-teal-400/10 p-4 text-center">
            <div className="mb-1 text-2xl">✅</div>
            <p className="text-sm font-semibold text-teal-200">
              Сообщение отправлено!
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Спасибо, мы ответим при необходимости.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-3 rounded-full bg-white/10 px-4 py-1.5 text-xs text-slate-200"
            >
              Написать ещё
            </button>
          </div>
        ) : (
          <>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Ваш email или телефон (для ответа)"
              className="mb-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-400/50"
            />
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Тема"
              className="mb-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-400/50"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Ваше сообщение…"
              className="no-scrollbar mb-2 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-400/50"
            />
            {err && <p className="mb-2 text-xs text-rose-300">{err}</p>}
            <button
              onClick={() => void sendEmail()}
              disabled={!message.trim() || sending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-400 to-purple-500 py-2.5 text-sm font-bold text-[#0b1020] transition active:scale-[0.98] disabled:opacity-40"
            >
              {sending ? "Отправка…" : "✉️ Отправить"}
            </button>
          </>
        )}
      </div>

      {/* Мои обращения */}
      {myMessages.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 px-1 text-sm font-semibold text-white">
            Мои обращения
          </p>
          <div className="space-y-2">
            {myMessages.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-white">
                    {m.subject || "Без темы"}
                  </span>
                  <span className="flex-shrink-0 text-[10px] text-slate-500">
                    {new Date(m.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-xs text-slate-300">
                  {m.message}
                </p>
                {m.reply ? (
                  <div className="mt-2 rounded-xl border border-teal-400/30 bg-teal-400/10 p-2.5">
                    <p className="mb-1 text-[10px] font-semibold text-teal-300">
                      💬 Ответ администратора
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm text-slate-100">
                      {m.reply}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-500">
                    ⏳ Ожидает ответа
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Документы */}
      <div className="mb-4 grid grid-cols-1 gap-2">
        <a
          href={PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition active:scale-[0.98]"
        >
          🔒 Политика конфиденциальности
          <span className="ml-auto text-slate-500">↗</span>
        </a>
        <a
          href={TERMS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition active:scale-[0.98]"
        >
          ⚖️ Для правообладателей
          <span className="ml-auto text-slate-500">↗</span>
        </a>
      </div>

      <p className="pb-4 text-center text-[11px] text-slate-500">
        ChilloutFM © {new Date().getFullYear()} · интернет-радио для настроения
      </p>
    </div>
  );
}
