"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@/db/schema";
import type { ReactionAgg } from "@/app/api/reactions/route";
import { getClientId } from "@/lib/clientId";
import {
  categorize,
  fileToDataUrl,
  humanSize,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/media";
import AttachmentView from "./AttachmentView";
import EmojiPicker from "./EmojiPicker";

type PendingAttachment = {
  type: "image" | "audio" | "video" | "file";
  url: string;
  name: string;
  size: number;
};

const REACTION_EMOJIS = ["👍", "❤️", "🔥", "😂", "😮", "😢", "🎧", "✨"];

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return new Date(iso).toLocaleDateString("ru-RU");
}

type ReactionsMap = Record<number, ReactionAgg>;

export default function ChatTab({ active }: { active: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<ReactionsMap>({});
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [attachMenu, setAttachMenu] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [room, setRoom] = useState<"main" | "premium">("main");
  const [isPremium, setIsPremium] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [uploadErr, setUploadErr] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraPhotoRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const clientIdRef = useRef<string>("");

  useEffect(() => {
    clientIdRef.current = getClientId();
    const saved = localStorage.getItem("chillout_name");
    if (saved) setName(saved);
    else setEditingName(true);
    const savedKey = localStorage.getItem("chillout_admin_key");
    if (savedKey) setAdminKey(savedKey);
    if (localStorage.getItem("chillout_premium") === "premium") {
      setIsPremium(true);
    }
  }, []);

  const unlockPremium = useCallback(async () => {
    // Автоматически: по VK ID проверяем оплаченную подписку VK Donut
    const vkId = window.prompt(
      "Введите ваш VK ID (число из адреса vk.com/idХХХ) — после поддержки через VK Donut доступ откроется автоматически.\n\nЕсли у вас есть код — введите его тут же."
    );
    if (!vkId) return;
    const value = vkId.trim();
    const digits = value.replace(/\D/g, "");
    const looksLikeVkId = digits.length >= 4 && digits === value.replace(/[^0-9]/g, "") && !/[a-zA-Z]/.test(value);

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
        localStorage.setItem("chillout_premium", "premium");
        localStorage.setItem("chillout_vk_id", digits);
        setIsPremium(true);
        setRoom("premium");
        window.dispatchEvent(new Event("chillout-premium-changed"));
        window.alert("🎉 Премиум активирован! Добро пожаловать в закрытую комнату 👑");
      } else {
        window.alert(
          json.error ||
            "Подписка не найдена. Оформите поддержку через VK Donut и попробуйте снова."
        );
      }
    } catch {
      window.alert("Ошибка проверки");
    }
  }, []);

  const unlockAdmin = useCallback(async () => {
    const key = window.prompt("Введите ключ администратора:");
    if (!key) return;
    try {
      const res = await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      if (res.ok) {
        localStorage.setItem("chillout_admin_key", key.trim());
        setAdminKey(key.trim());
      } else {
        window.alert("Неверный ключ");
      }
    } catch {
      window.alert("Ошибка проверки");
    }
  }, []);

  const logoutAdmin = useCallback(() => {
    localStorage.removeItem("chillout_admin_key");
    setAdminKey(null);
  }, []);

  const deleteMessage = useCallback(
    async (id: number) => {
      if (!adminKey) return;
      setMessages((prev) => prev.filter((m) => m.id !== id));
      try {
        await fetch(`/api/chat?id=${id}`, {
          method: "DELETE",
          headers: { "x-admin-key": adminKey },
        });
      } catch {
        /* ignore */
      }
    },
    [adminKey]
  );

  const clearChat = useCallback(async () => {
    if (!adminKey) return;
    if (!window.confirm("Очистить весь чат?")) return;
    setMessages([]);
    try {
      await fetch(`/api/chat?all=1`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      });
    } catch {
      /* ignore */
    }
  }, [adminKey]);

  const loadReactions = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return;
    try {
      const res = await fetch(
        `/api/reactions?ids=${ids.join(",")}&clientId=${encodeURIComponent(
          clientIdRef.current
        )}`,
        { cache: "no-store" }
      );
      const json = (await res.json()) as { reactions: ReactionsMap };
      setReactions(json.reactions ?? {});
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setIsSyncing(true);
      const res = await fetch(`/api/chat?room=${room}`, { cache: "no-store" });
      const json = (await res.json()) as { messages: ChatMessage[] };
      const msgs = json.messages ?? [];
      setMessages(msgs);
      setLastSync(new Date());
      loadReactions(msgs.map((m) => m.id));
    } catch {
      /* ignore */
    } finally {
      setIsSyncing(false);
    }
  }, [loadReactions, room]);

  useEffect(() => {
    load();
    if (!active) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load, active]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [text]);

  const react = useCallback(async (messageId: number, emoji: string) => {
    setPickerFor(null);
    // optimistic
    setReactions((prev) => {
      const cur = prev[messageId] ?? { counts: {}, mine: [] };
      const has = cur.mine.includes(emoji);
      const counts = { ...cur.counts };
      counts[emoji] = (counts[emoji] ?? 0) + (has ? -1 : 1);
      if (counts[emoji] <= 0) delete counts[emoji];
      const mine = has
        ? cur.mine.filter((e) => e !== emoji)
        : [...cur.mine, emoji];
      return { ...prev, [messageId]: { counts, mine } };
    });
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          clientId: clientIdRef.current,
          emoji,
        }),
      });
      const json = (await res.json()) as { agg?: ReactionAgg };
      if (json.agg)
        setReactions((prev) => ({ ...prev, [messageId]: json.agg! }));
    } catch {
      /* ignore */
    }
  }, []);

  const pickFile = useCallback(async (file: File | undefined | null) => {
    setAttachMenu(false);
    setUploadErr("");
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setUploadErr(`Файл слишком большой (макс. ${humanSize(MAX_ATTACHMENT_BYTES)})`);
      return;
    }
    try {
      const url = await fileToDataUrl(file);
      setAttachment({
        type: categorize(file.type),
        url,
        name: file.name || "file",
        size: file.size,
      });
    } catch {
      setUploadErr("Не удалось прочитать файл");
    }
  }, []);

  const startRecording = useCallback(async () => {
    setUploadErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recChunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        if (blob.size > MAX_ATTACHMENT_BYTES) {
          setUploadErr("Запись слишком длинная");
          return;
        }
        const url = await fileToDataUrl(blob);
        setAttachment({
          type: "audio",
          url,
          name: "Голосовое сообщение",
          size: blob.size,
        });
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = window.setInterval(() => {
        setRecSeconds((s) => {
          if (s >= 120) {
            // auto-stop at 2 min
            stopRecording();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setUploadErr("Нет доступа к микрофону");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recTimerRef.current) {
      window.clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    setRecording(false);
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    if (recTimerRef.current) {
      window.clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.onstop = null;
      mr.stop();
      mr.stream?.getTracks().forEach((t) => t.stop());
    }
    recChunksRef.current = [];
    setRecording(false);
    setRecSeconds(0);
  }, []);

  const send = async () => {
    const t = text.trim();
    if ((!t && !attachment) || sending) return;
    const finalName = name.trim() || "Гость";
    localStorage.setItem("chillout_name", finalName);
    setName(finalName);
    setSending(true);
    setText("");
    const currentReply = replyTo;
    const currentAttach = attachment;
    setReplyTo(null);
    setAttachment(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalName,
          text: t,
          replyToId: currentReply?.id,
          replyToName: currentReply?.name,
          replyToText: currentReply?.text,
          attachmentType: currentAttach?.type,
          attachmentUrl: currentAttach?.url,
          attachmentName: currentAttach?.name,
          room,
          premiumToken: isPremium ? "premium" : undefined,
        }),
      });
      const json = (await res.json()) as { message?: ChatMessage };
      if (json.message) {
        setMessages((prev) => [...prev, json.message as ChatMessage]);
        setLastSync(new Date());
      } else {
        await load();
      }
    } catch {
      await load();
    } finally {
      setSending(false);
    }
  };

  const syncLabel = useMemo(() => {
    if (isSyncing) return "синхронизация…";
    if (!lastSync) return "ещё не обновлялся";
    return `обновлено ${lastSync.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [isSyncing, lastSync]);

  return (
    <div className="flex h-full flex-col px-3">
      {/* room switcher */}
      <div className="mb-2 flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1">
        <button
          onClick={() => setRoom("main")}
          className={`flex-1 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
            room === "main"
              ? "bg-gradient-to-r from-teal-400 to-purple-500 text-[#0b1020]"
              : "text-slate-300"
          }`}
        >
          💬 Общий
        </button>
        <button
          onClick={() => {
            if (isPremium) setRoom("premium");
            else void unlockPremium();
          }}
          className={`flex flex-1 items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
            room === "premium"
              ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-[#0b1020]"
              : "text-amber-300"
          }`}
        >
          👑 Премиум {!isPremium && "🔒"}
        </button>
      </div>

      {/* premium promo banner (shown in premium room to non-members) */}
      {room === "premium" && !isPremium && (
        <div className="mb-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-center">
          <p className="mb-1 text-sm font-semibold text-amber-200">
            👑 Закрытая премиум-комната
          </p>
          <p className="mb-2 text-xs text-slate-300">
            Доступ открыт тем, кто поддержал радио. Получите код и общайтесь в
            кругу своих!
          </p>
          <div className="flex gap-2">
            <a
              href="https://vk.com/chillou_fm?w=donut_payment-46701989"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-2 text-xs font-bold text-[#0b1020]"
            >
              💛 Поддержать радио
            </a>
            <button
              onClick={() => void unlockPremium()}
              className="flex-1 rounded-full border border-amber-400/40 px-3 py-2 text-xs font-medium text-amber-200"
            >
              У меня есть код
            </button>
          </div>
        </div>
      )}

      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-xs text-slate-500">Вы:</span>
        {isPremium && <span title="Премиум">👑</span>}
        {editingName ? (
          <input
            value={name}
            autoFocus
            maxLength={40}
            placeholder="Ваше имя"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              const n = name.trim() || "Гость";
              setName(n);
              localStorage.setItem("chillout_name", n);
              setEditingName(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="rounded-lg border border-teal-400/40 bg-white/5 px-2 py-1 text-sm text-white outline-none"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-sm font-medium text-teal-300"
          >
            {name || "Гость"}
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
              <path
                d="M4 20h4L18 10l-4-4L4 16v4zM14 6l4 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        <button
          onClick={() => void load()}
          className="ml-auto flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-400"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isSyncing ? "animate-pulse bg-teal-300" : "bg-slate-500"
            }`}
          />
          {syncLabel}
        </button>

        <button
          onClick={adminKey ? logoutAdmin : () => void unlockAdmin()}
          aria-label="Режим администратора"
          className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
            adminKey
              ? "border-amber-400/50 bg-amber-400/20 text-amber-300"
              : "border-white/10 bg-white/5 text-slate-500"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
            {adminKey ? (
              <path
                d="M7 10V7a5 5 0 019.9-1M6 10h12v10H6V10z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M7 10V7a5 5 0 0110 0v3M6 10h12v10H6V10z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </button>
      </div>

      {adminKey && (
        <div className="mb-2 flex items-center justify-between rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
            🛡 Режим администратора
          </span>
          <button
            onClick={() => void clearChat()}
            className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-medium text-rose-200 transition active:scale-95"
          >
            Очистить чат
          </button>
        </div>
      )}


      <div
        className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3"
        onClick={() => setPickerFor(null)}
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
            Пока нет сообщений.<br />
            Напишите первым в эфирный чат 🎶
          </div>
        ) : (
          messages.map((m) => {
            const r = reactions[m.id];
            const active = r?.counts ? Object.entries(r.counts) : [];
            return (
              <div
                key={m.id}
                className="fade-up rounded-2xl bg-white/[0.03] px-3 py-2.5"
              >
                <div className="flex items-baseline gap-1.5">
                  {m.isPremium === 1 && (
                    <span title="Премиум-участник" className="text-sm">
                      👑
                    </span>
                  )}
                  <span
                    className="text-sm font-semibold"
                    style={{ color: m.isPremium === 1 ? "#fbbf24" : m.color }}
                  >
                    {m.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {timeAgo(String(m.createdAt))}
                  </span>
                  {adminKey && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteMessage(m.id);
                      }}
                      className="ml-auto flex h-6 w-6 items-center justify-center rounded-full text-rose-400 hover:bg-rose-500/20"
                      aria-label="Удалить сообщение"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                        <path
                          d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplyTo(m);
                      textareaRef.current?.focus();
                    }}
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-white/10 hover:text-teal-200 ${
                      adminKey ? "" : "ml-auto"
                    }`}
                    aria-label="Ответить"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                      <path
                        d="M9 17l-5-5 5-5M4 12h11a5 5 0 015 5v1"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPickerFor(pickerFor === m.id ? null : m.id);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-white/10 hover:text-slate-200"
                    aria-label="Добавить реакцию"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                      <path
                        d="M8.5 14s1.3 1.5 3.5 1.5S15.5 14 15.5 14M9 9.5h.01M15 9.5h.01"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
                {m.replyToId && (
                  <div className="mt-1.5 flex items-start gap-2 rounded-lg border-l-2 border-teal-400/50 bg-white/[0.04] px-2 py-1">
                    <svg viewBox="0 0 24 24" className="mt-0.5 h-3 w-3 flex-shrink-0 text-teal-300/70" fill="none">
                      <path
                        d="M9 17l-5-5 5-5M4 12h11a5 5 0 015 5v1"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="min-w-0">
                      <span className="block text-[11px] font-semibold text-teal-300/90">
                        {m.replyToName || "Сообщение"}
                      </span>
                      <span className="block truncate text-[11px] text-slate-400">
                        {m.replyToText || "…"}
                      </span>
                    </div>
                  </div>
                )}
                {m.text && (
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">
                    {m.text}
                  </p>
                )}

                {m.attachmentType && m.attachmentUrl && (
                  <AttachmentView
                    type={m.attachmentType}
                    url={m.attachmentUrl}
                    name={m.attachmentName}
                  />
                )}

                {/* emoji picker */}
                {pickerFor === m.id && (
                  <div
                    className="fade-up mt-2 flex flex-wrap gap-1 rounded-xl border border-white/10 bg-[#131a30] p-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => react(m.id, emoji)}
                        className="rounded-lg px-2 py-1 text-lg transition hover:bg-white/10 active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* active reactions */}
                {active.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {active.map(([emoji, count]) => {
                      const mine = r?.mine.includes(emoji);
                      return (
                        <button
                          key={emoji}
                          onClick={() => react(m.id, emoji)}
                          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition active:scale-90 ${
                            mine
                              ? "border-teal-400/50 bg-teal-400/20 text-teal-200"
                              : "border-white/10 bg-white/5 text-slate-300"
                          }`}
                        >
                          <span>{emoji}</span>
                          <span>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {replyTo && (
        <div className="mt-2 flex items-center gap-2 rounded-t-xl border border-b-0 border-teal-400/30 bg-teal-400/10 px-3 py-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0 text-teal-300" fill="none">
            <path
              d="M9 17l-5-5 5-5M4 12h11a5 5 0 015 5v1"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-teal-200">
              Ответ · {replyTo.name}
            </span>
            <span className="block truncate text-[11px] text-slate-400">
              {replyTo.text}
            </span>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white/10"
            aria-label="Отменить ответ"
          >
            ✕
          </button>
        </div>
      )}

      {/* hidden inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void pickFile(e.target.files?.[0])}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => void pickFile(e.target.files?.[0])}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => void pickFile(e.target.files?.[0])}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => void pickFile(e.target.files?.[0])}
      />
      <input
        ref={cameraPhotoRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void pickFile(e.target.files?.[0])}
      />
      <input
        ref={cameraVideoRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void pickFile(e.target.files?.[0])}
      />

      {/* attachment preview */}
      {attachment && (
        <div className="mt-2 flex items-center gap-3 rounded-t-xl border border-b-0 border-purple-400/30 bg-purple-400/10 px-3 py-2">
          <span className="text-lg">
            {attachment.type === "image"
              ? "🖼️"
              : attachment.type === "audio"
                ? "🎵"
                : attachment.type === "video"
                  ? "🎬"
                  : "📎"}
          </span>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-purple-100">
              {attachment.name}
            </span>
            <span className="block text-[10px] text-slate-400">
              {humanSize(attachment.size)}
            </span>
          </div>
          <button
            onClick={() => setAttachment(null)}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white/10"
            aria-label="Убрать вложение"
          >
            ✕
          </button>
        </div>
      )}

      {uploadErr && (
        <p className="mt-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200">
          {uploadErr}
        </p>
      )}

      {/* attach menu */}
      {attachMenu && (
        <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-[#131a30] p-2">
          {[
            { icon: "📸", label: "Камера", ref: cameraPhotoRef },
            { icon: "📹", label: "Снять видео", ref: cameraVideoRef },
            { icon: "🖼️", label: "Фото", ref: imageInputRef },
            { icon: "🎬", label: "Видео", ref: videoInputRef },
            { icon: "🎵", label: "Музыка", ref: audioInputRef },
            { icon: "📎", label: "Файл", ref: fileInputRef },
          ].map((it) => (
            <button
              key={it.label}
              onClick={() => {
                setAttachMenu(false);
                it.ref.current?.click();
              }}
              className="flex flex-col items-center gap-1 rounded-lg py-2.5 text-slate-200 transition hover:bg-white/10"
            >
              <span className="text-xl">{it.icon}</span>
              <span className="text-[11px]">{it.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* emoji picker */}
      {emojiOpen && (
        <EmojiPicker
          onPick={(e) => setText((prev) => (prev + e).slice(0, 500))}
          onClose={() => setEmojiOpen(false)}
        />
      )}

      {/* recording bar */}
      {recording && (
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-400" />
          <span className="flex-1 text-sm font-medium text-rose-100">
            Запись… {Math.floor(recSeconds / 60)}:
            {String(recSeconds % 60).padStart(2, "0")}
          </span>
          <button
            onClick={cancelRecording}
            className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200"
          >
            Отмена
          </button>
          <button
            onClick={stopRecording}
            className="rounded-full bg-teal-400 px-3 py-1 text-xs font-semibold text-[#0b1020]"
          >
            Готово
          </button>
        </div>
      )}

      <div className="mt-2 flex items-end gap-2 pb-1">
        <button
          onClick={() => {
            setAttachMenu((v) => !v);
            setUploadErr("");
          }}
          disabled={recording}
          className={`mb-4 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border transition active:scale-95 ${
            attachMenu
              ? "border-purple-400/50 bg-purple-400/20 text-purple-200"
              : "border-white/10 bg-white/5 text-slate-300"
          } disabled:opacity-40`}
          aria-label="Прикрепить"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          onClick={recording ? stopRecording : () => void startRecording()}
          className={`mb-4 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border transition active:scale-95 ${
            recording
              ? "border-rose-400/50 bg-rose-500/20 text-rose-300"
              : "border-white/10 bg-white/5 text-slate-300"
          }`}
          aria-label="Записать голосовое"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M5 11a7 7 0 0014 0M12 18v3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          onClick={() => {
            setEmojiOpen((v) => !v);
            setAttachMenu(false);
          }}
          className={`mb-4 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border text-lg transition active:scale-95 ${
            emojiOpen
              ? "border-amber-400/50 bg-amber-400/20"
              : "border-white/10 bg-white/5"
          }`}
          aria-label="Смайлики"
        >
          😊
        </button>
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            rows={1}
            maxLength={500}
            placeholder="Сообщение…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            className="no-scrollbar min-h-11 max-h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-400/50"
          />
          <div className="mt-1 px-1 text-right text-[10px] text-slate-500">
            {text.length}/500
          </div>
        </div>
        <button
          onClick={() => void send()}
          disabled={sending || (!text.trim() && !attachment)}
          className="mb-4 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-purple-500 text-[#0b1020] transition active:scale-95 disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M3.4 20.4l17.5-7.5a1 1 0 000-1.8L3.4 3.6a1 1 0 00-1.4 1.1L4 11l10 1-10 1-2 6.3a1 1 0 001.4 1.1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
