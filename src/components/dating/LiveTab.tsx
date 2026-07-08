"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DatingProfile } from "@/lib/dating";
import type { Room } from "livekit-client";
import { getToken, startPublishing, startViewing, leaveRoom } from "@/lib/livekit";
import { startPayment } from "@/lib/dating";

type Stream = {
  id: number;
  clientId: string;
  name: string;
  photo: string;
  title: string;
  viewers: number;
  likes: number;
  isLive: number;
};

type ChatMsg = {
  id: number;
  name: string;
  text: string;
  kind: string;
  amount: number;
};

const EMOJIS = ["❤️", "🔥", "😍", "👏", "😘", "🌹", "💎", "🎉"];

export default function LiveTab({
  clientId,
  myProfile,
}: {
  clientId: string;
  myProfile: DatingProfile | null;
}) {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [active, setActive] = useState<Stream | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);

  const loadStreams = useCallback(async () => {
    try {
      const res = await fetch("/api/dating/live", { cache: "no-store" });
      const json = (await res.json()) as { streams: Stream[] };
      setStreams(json.streams ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (active) return;
    loadStreams();
    const id = setInterval(loadStreams, 5000);
    return () => clearInterval(id);
  }, [loadStreams, active]);

  if (broadcasting && myProfile) {
    return (
      <Broadcaster
        clientId={clientId}
        profile={myProfile}
        onStop={() => {
          setBroadcasting(false);
          loadStreams();
        }}
      />
    );
  }

  if (active) {
    return (
      <StreamRoom
        stream={active}
        me={clientId}
        myName={myProfile?.name || "Гость"}
        onBack={() => setActive(null)}
      />
    );
  }

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-28 pt-2">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">🔴 Эфиры сейчас</h2>
        {myProfile && (
          <button
            onClick={() => setBroadcasting(true)}
            className="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-1.5 text-xs font-semibold text-white"
          >
            📹 Начать эфир
          </button>
        )}
      </div>

      {streams.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">
          Сейчас нет активных трансляций.
          <br />
          {myProfile ? "Начните первым!" : "Создайте анкету, чтобы вести эфир."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {streams.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s)}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left"
            >
              <div className="relative aspect-video w-full bg-black">
                {s.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photo} alt="" className="h-full w-full object-cover opacity-80" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl">
                    📹
                  </div>
                )}
                <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  LIVE
                </span>
                <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                  👁 {s.viewers}
                </span>
              </div>
              <div className="p-2">
                <p className="truncate text-sm font-semibold text-white">{s.name}</p>
                <p className="truncate text-[11px] text-slate-400">
                  {s.title || "Без названия"}
                </p>
                <p className="text-[11px] text-pink-300">❤️ {s.likes}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Broadcaster (стример) ---------- */
function Broadcaster({
  clientId,
  profile,
  onStop,
}: {
  clientId: string;
  profile: DatingProfile;
  onStop: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lkRoomRef = useRef<Room | null>(null);
  const [title, setTitle] = useState("");
  const [started, setStarted] = useState(false);
  const [streamId, setStreamId] = useState<number | null>(null);

  const start = async () => {
    try {
      // регистрируем стрим в БД
      const res = await fetch("/api/dating/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          clientId,
          name: profile.name,
          photo: profile.photo,
          title,
        }),
      });
      const json = (await res.json()) as { stream?: { id: number } };
      if (json.stream) setStreamId(json.stream.id);

      // пробуем LiveKit — реальное вещание зрителям
      const tok = await getToken({
        room: `live_${clientId}`,
        identity: clientId,
        name: profile.name,
        publish: true,
      });
      if (tok.ok && tok.token && tok.url && videoRef.current) {
        lkRoomRef.current = await startPublishing(
          tok.url,
          tok.token,
          videoRef.current
        );
      } else {
        // fallback: локальная камера (демо, зрители видят фото)
        const media = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        streamRef.current = media;
        if (videoRef.current) videoRef.current.srcObject = media;
      }
      setStarted(true);
    } catch {
      window.alert("Нет доступа к камере");
    }
  };

  // heartbeat
  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      fetch("/api/dating/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat", clientId }),
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(id);
  }, [started, clientId]);

  const stop = async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    leaveRoom(lkRoomRef.current);
    lkRoomRef.current = null;
    await fetch("/api/dating/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop", clientId }),
    }).catch(() => {});
    onStop();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover"
        />
        {started && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> В ЭФИРЕ
          </span>
        )}
        {streamId && <BroadcasterChat streamId={streamId} name={profile.name} owner />}
      </div>

      <div className="space-y-2 p-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
        {!started ? (
          <>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название трансляции…"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={onStop}
                className="flex-1 rounded-2xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-slate-200"
              >
                Отмена
              </button>
              <button
                onClick={() => void start()}
                className="flex-1 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 py-3 text-sm font-bold text-white"
              >
                🔴 В эфир
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => void stop()}
            className="w-full rounded-2xl bg-rose-600 py-3 text-sm font-bold text-white"
          >
            ■ Завершить эфир
          </button>
        )}
      </div>
    </div>
  );
}

/* мини-чат для стримера (только просмотр входящих) */
function BroadcasterChat({
  streamId,
  name,
  owner,
}: {
  streamId: number;
  name: string;
  owner?: boolean;
}) {
  void name;
  void owner;
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/dating/live/chat?stream=${streamId}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as { messages: ChatMsg[] };
      setMsgs(json.messages ?? []);
    };
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [streamId]);

  return (
    <div className="no-scrollbar pointer-events-none absolute bottom-3 left-3 max-h-48 w-64 space-y-1 overflow-hidden">
      {msgs.slice(-6).map((m) => (
        <div key={m.id} className="rounded-lg bg-black/50 px-2 py-1 text-xs text-white backdrop-blur">
          {m.kind === "tip" ? (
            <span className="text-amber-300">💝 {m.name}: {m.amount}₽</span>
          ) : m.kind === "like" ? (
            <span className="text-pink-300">{m.name} {m.text}</span>
          ) : (
            <span>
              <b className="text-pink-300">{m.name}:</b> {m.text}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- StreamRoom (зритель) ---------- */
function StreamRoom({
  stream,
  me,
  myName,
  onBack,
}: {
  stream: Stream;
  me: string;
  myName: string;
  onBack: () => void;
}) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [floatEmojis, setFloatEmojis] = useState<{ id: number; e: string }[]>([]);
  const [inPrivate, setInPrivate] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLVideoElement>(null);
  const lkRef = useRef<Room | null>(null);

  const isFake = stream.clientId.startsWith("fake_");

  // подключение к LiveKit для просмотра видео стримера
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Демо-эфиры: играем зациклённое демо-видео
      if (isFake && viewRef.current) {
        viewRef.current.src = "/fake/demo.mp4";
        viewRef.current.loop = true;
        viewRef.current.muted = true;
        try {
          await viewRef.current.play();
        } catch {
          /* ignore */
        }
        setHasVideo(true);
        return;
      }
      const tok = await getToken({
        room: `live_${stream.clientId}`,
        identity: me || `guest_${Date.now()}`,
        name: myName,
        publish: false,
      });
      if (cancelled || !tok.ok || !tok.token || !tok.url || !viewRef.current)
        return;
      try {
        lkRef.current = await startViewing(tok.url, tok.token, viewRef.current);
        setHasVideo(true);
      } catch {
        setHasVideo(false);
      }
    })();
    return () => {
      cancelled = true;
      leaveRoom(lkRef.current);
      lkRef.current = null;
    };
  }, [stream.clientId, me, myName, isFake]);

  const goPrivate = async () => {
    // платный вход в приват-комнату
    await startPayment({
      payerClientId: me,
      targetProfileId: stream.id,
      kind: "private",
    });
    setInPrivate(true);
    // переподключение к приватной комнате
    leaveRoom(lkRef.current);
    lkRef.current = null;
    const tok = await getToken({
      room: `private_${stream.clientId}_${me}`,
      identity: me,
      name: myName,
      publish: false,
    });
    if (tok.ok && tok.token && tok.url && viewRef.current) {
      try {
        lkRef.current = await startViewing(tok.url, tok.token, viewRef.current);
      } catch {
        /* ignore */
      }
    }
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/dating/live/chat?stream=${stream.id}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as { messages: ChatMsg[] };
      setMsgs(json.messages ?? []);
    } catch {
      /* ignore */
    }
  }, [stream.id]);

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  const post = async (payload: Partial<ChatMsg> & { kind: string }) => {
    try {
      await fetch("/api/dating/live/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: stream.id,
          name: myName,
          text: payload.text ?? "",
          kind: payload.kind,
          amount: payload.amount ?? 0,
        }),
      });
      load();
    } catch {
      /* ignore */
    }
  };

  const send = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    post({ kind: "message", text: t });
  };

  const sendEmoji = (e: string) => {
    const id = Date.now() + Math.random();
    setFloatEmojis((p) => [...p, { id, e }]);
    setTimeout(() => setFloatEmojis((p) => p.filter((x) => x.id !== id)), 2500);
    post({ kind: "like", text: e });
  };

  const sendTip = () => {
    const val = window.prompt("Сумма чаевых, ₽:");
    const amount = Number(val);
    if (!amount || amount < 1) return;
    post({ kind: "tip", text: "", amount });
    // тут можно открыть YooMoney: startPayment(...)
    window.alert(`Спасибо! Чаевые ${amount}₽ отправлены 💝`);
  };

  return (
    <div className="flex h-full flex-col">
      {/* video area — LiveKit видео + фото-заглушка */}
      <div className="relative aspect-video w-full flex-shrink-0 bg-black">
        <video
          ref={viewRef}
          autoPlay
          playsInline
          className={`h-full w-full object-cover ${hasVideo ? "" : "hidden"}`}
        />
        {!hasVideo &&
          (stream.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={stream.photo} alt="" className="h-full w-full object-cover opacity-70" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl">📹</div>
          ))}
        <button
          onClick={onBack}
          className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
        >
          ←
        </button>
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />{" "}
          {inPrivate ? "PRIVATE" : "LIVE"}
        </span>
        <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
          {stream.name} · 👁 {stream.viewers} · ❤️ {stream.likes}
        </div>
        {!inPrivate && (
          <button
            onClick={() => void goPrivate()}
            className="absolute bottom-3 right-3 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 px-3 py-1.5 text-xs font-bold text-[#0b1020]"
          >
            🔒 Приват
          </button>
        )}
        {/* floating emojis */}
        <div className="pointer-events-none absolute bottom-0 right-4">
          {floatEmojis.map((f) => (
            <span
              key={f.id}
              className="absolute bottom-0 text-3xl"
              style={{ animation: "fLoat 2.4s ease-out forwards" }}
            >
              {f.e}
            </span>
          ))}
        </div>
      </div>

      {/* chat */}
      <div className="no-scrollbar flex-1 space-y-1.5 overflow-y-auto p-3">
        {msgs.map((m) => (
          <div key={m.id} className="text-sm">
            {m.kind === "tip" ? (
              <span className="rounded-lg bg-amber-400/20 px-2 py-1 font-semibold text-amber-200">
                💝 {m.name} задонатил {m.amount}₽
              </span>
            ) : m.kind === "like" ? (
              <span className="text-pink-300">
                {m.name} {m.text}
              </span>
            ) : (
              <span className="text-slate-200">
                <b className="text-pink-300">{m.name}:</b> {m.text}
              </span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* emoji row */}
      <div className="flex gap-1 overflow-x-auto px-3 pb-1">
        {EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => sendEmoji(e)}
            className="text-2xl transition active:scale-125"
          >
            {e}
          </button>
        ))}
      </div>

      {/* input */}
      <div className="flex items-center gap-2 p-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
        <button
          onClick={sendTip}
          className="flex-shrink-0 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-2.5 text-xs font-bold text-[#0b1020]"
        >
          💝 Донат
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Сообщение…"
          className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-pink-400/50"
        />
        <button
          onClick={send}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-500 text-white"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M3.4 20.4l17.5-7.5a1 1 0 000-1.8L3.4 3.6a1 1 0 00-1.4 1.1L4 11l10 1-10 1-2 6.3a1 1 0 001.4 1.1z" />
          </svg>
        </button>
      </div>

      <style>{`@keyframes fLoat{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-160px);opacity:0}}`}</style>
    </div>
  );
}
