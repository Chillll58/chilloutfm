"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DatingProfile } from "@/lib/dating";

type Msg = {
  id: number;
  fromClientId: string;
  toClientId: string;
  text: string;
  createdAt: string;
};

const FREE_LIMIT = 5;

export default function DatingChat({
  me,
  peer,
  premium,
  onBack,
  onNeedPremium,
}: {
  me: string;
  peer: DatingProfile;
  premium: boolean;
  onBack: () => void;
  onNeedPremium: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/dating/messages?me=${encodeURIComponent(
          me
        )}&with=${encodeURIComponent(peer.clientId)}`,
        { cache: "no-store" }
      );
      const json = (await res.json()) as { messages: Msg[] };
      setMessages(json.messages ?? []);
    } catch {
      /* ignore */
    }
  }, [me, peer.clientId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const myCount = messages.filter((m) => m.fromClientId === me).length;

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    if (!premium && myCount >= FREE_LIMIT) {
      onNeedPremium();
      return;
    }
    setText("");
    try {
      const res = await fetch("/api/dating/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: me, to: peer.clientId, text: t }),
      });
      const json = (await res.json()) as { message?: Msg };
      if (json.message) setMessages((p) => [...p, json.message!]);
    } catch {
      /* ignore */
    }
  };

  const remaining = FREE_LIMIT - myCount;

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-3 py-2">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-300"
        >
          ←
        </button>
        {peer.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={peer.photo}
            alt={peer.name}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            {peer.gender === "female" ? "👩" : "👨"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {peer.name}
            {peer.premium === 1 && " 👑"}
          </p>
          <p className="truncate text-[11px] text-slate-400">
            {peer.age} · {peer.city || "—"}
          </p>
        </div>
      </div>

      {/* messages */}
      <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-500">
            Напишите первым 💬
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.fromClientId === me;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                      : "bg-white/10 text-slate-100"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* free limit note */}
      {!premium && (
        <div className="px-3">
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-center text-[11px] text-amber-200">
            {remaining > 0
              ? `Осталось ${remaining} бесплатных сообщений. 👑 Премиум — без лимита`
              : "Лимит бесплатных сообщений исчерпан. Оформите 👑 Премиум"}
          </div>
        </div>
      )}

      {/* input */}
      <div className="flex items-end gap-2 p-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Сообщение…"
          className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-pink-400/50"
        />
        <button
          onClick={send}
          disabled={!text.trim()}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-500 text-white transition active:scale-95 disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M3.4 20.4l17.5-7.5a1 1 0 000-1.8L3.4 3.6a1 1 0 00-1.4 1.1L4 11l10 1-10 1-2 6.3a1 1 0 001.4 1.1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
