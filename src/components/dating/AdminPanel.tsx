"use client";

import { useCallback, useEffect, useState } from "react";

type Feedback = {
  id: number;
  fromContact: string;
  subject: string;
  message: string;
  reply: string;
  repliedAt: string | null;
  createdAt: string;
};

export default function AdminPanel({
  adminKey,
  onBack,
}: {
  adminKey: string;
  onBack: () => void;
}) {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyFor, setReplyFor] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        headers: { "x-admin-key": adminKey },
        cache: "no-store",
      });
      const json = (await res.json()) as { messages?: Feedback[] };
      setItems(json.messages ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    load();
  }, [load]);

  const sendReply = async (id: number) => {
    const text = replyText.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ id, reply: text }),
      });
      const json = (await res.json()) as { ok?: boolean; emailed?: boolean };
      if (json.ok) {
        setReplyFor(null);
        setReplyText("");
        window.alert(
          json.emailed
            ? "Ответ отправлен пользователю на email ✅"
            : "Ответ сохранён. (Email не отправлен — SMTP не настроен)"
        );
        load();
      } else {
        window.alert("Не удалось отправить ответ");
      }
    } catch {
      window.alert("Ошибка сети");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-28 pt-2">
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-300"
        >
          ←
        </button>
        <h2 className="text-lg font-bold text-white">🛡 Обращения</h2>
        <button
          onClick={load}
          className="ml-auto rounded-full bg-white/5 px-3 py-1.5 text-xs text-slate-300"
        >
          ⟳ Обновить
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Обращений пока нет
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((f) => (
            <div
              key={f.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-3"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-white">
                  {f.subject || "Без темы"}
                </span>
                <span className="flex-shrink-0 text-[10px] text-slate-500">
                  {new Date(f.createdAt).toLocaleString("ru-RU")}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-slate-200">
                {f.message}
              </p>
              {f.fromContact && (
                <p className="mt-2 text-[11px] text-teal-300">
                  Контакт: {f.fromContact}
                </p>
              )}

              {/* уже отвечено */}
              {f.reply ? (
                <div className="mt-2 rounded-xl border border-teal-400/30 bg-teal-400/10 p-2.5">
                  <p className="mb-1 text-[10px] font-semibold text-teal-300">
                    Ваш ответ
                    {f.repliedAt
                      ? ` · ${new Date(f.repliedAt).toLocaleString("ru-RU")}`
                      : ""}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm text-slate-100">
                    {f.reply}
                  </p>
                  <button
                    onClick={() => {
                      setReplyFor(f.id);
                      setReplyText(f.reply);
                    }}
                    className="mt-2 text-[11px] text-slate-400"
                  >
                    ✏️ Изменить ответ
                  </button>
                </div>
              ) : replyFor === f.id ? null : (
                <button
                  onClick={() => {
                    setReplyFor(f.id);
                    setReplyText("");
                  }}
                  className="mt-2 rounded-full bg-gradient-to-r from-teal-400 to-purple-500 px-4 py-1.5 text-xs font-semibold text-[#0b1020]"
                >
                  ✉️ Ответить
                </button>
              )}

              {/* форма ответа */}
              {replyFor === f.id && (
                <div className="mt-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    placeholder="Ваш ответ пользователю…"
                    className="no-scrollbar mb-2 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-400/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReplyFor(null)}
                      className="flex-1 rounded-xl border border-white/10 py-2 text-xs text-slate-300"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => void sendReply(f.id)}
                      disabled={sending || !replyText.trim()}
                      className="flex-1 rounded-xl bg-gradient-to-r from-teal-400 to-purple-500 py-2 text-xs font-bold text-[#0b1020] disabled:opacity-40"
                    >
                      {sending ? "Отправка…" : "Отправить ответ"}
                    </button>
                  </div>
                  {f.fromContact.includes("@") ? (
                    <p className="mt-1 text-[10px] text-slate-500">
                      Ответ уйдёт на email {f.fromContact} (если настроен SMTP)
                    </p>
                  ) : (
                    <p className="mt-1 text-[10px] text-amber-300/70">
                      У пользователя не email — ответ сохранится, свяжитесь по:{" "}
                      {f.fromContact || "контакт не указан"}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
