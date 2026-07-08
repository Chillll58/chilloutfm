"use client";

import { useCallback, useEffect, useState } from "react";
import { getClientId } from "@/lib/clientId";
import {
  GENDER_LABEL,
  LOOKING_LABEL,
  ORIENTATION_LABEL,
  parseMedia,
  startPayment,
  type DatingProfile,
} from "@/lib/dating";
import ProfileEditor from "./ProfileEditor";
import DatingChat from "./DatingChat";
import MyCabinet from "./MyCabinet";
import LiveTab from "./LiveTab";
import SwipeDeck from "./SwipeDeck";
import AdminPanel from "./AdminPanel";
import LoginPanel from "./LoginPanel";

type View = "browse" | "editor" | "detail" | "chat" | "account" | "admin" | "login";

export default function DatingTab({
  premium,
  onNeedPremium,
}: {
  premium: boolean;
  onNeedPremium: () => void;
}) {
  const [clientId, setClientId] = useState("");
  const [myProfile, setMyProfile] = useState<DatingProfile | null>(null);
  const [profiles, setProfiles] = useState<DatingProfile[]>([]);
  const [view, setView] = useState<View>("browse");
  const [active, setActive] = useState<DatingProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // filters
  const [fCity, setFCity] = useState("");
  const [fGender, setFGender] = useState("");
  const [fMin, setFMin] = useState(18);
  const [fMax, setFMax] = useState(60);

  const [ageOk, setAgeOk] = useState(true);
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [mode, setMode] = useState<"profiles" | "live">("profiles");
  const [pView, setPView] = useState<"cards" | "grid">("cards");
  const [liveStrip, setLiveStrip] = useState<
    { id: number; clientId: string; name: string; photo: string; viewers: number }[]
  >([]);

  useEffect(() => {
    const id = getClientId();
    setClientId(id);
    setAgeOk(localStorage.getItem("chillove_18") === "1");
    const savedAdmin = localStorage.getItem("chillove_admin");
    if (savedAdmin) setAdminKey(savedAdmin);
  }, []);

  const confirmAge = () => {
    localStorage.setItem("chillove_18", "1");
    setAgeOk(true);
  };

  const unlockAdmin = async () => {
    if (adminKey) {
      // выход
      localStorage.removeItem("chillove_admin");
      setAdminKey(null);
      return;
    }
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
        setView("admin");
      } else {
        window.alert("Неверный ключ");
      }
    } catch {
      window.alert("Ошибка проверки");
    }
  };

  const loadMine = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/dating/profiles?me=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as { profile: DatingProfile | null };
      setMyProfile(json.profile);
      return json.profile;
    } catch {
      return null;
    }
  }, []);

  const loadProfiles = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        clientId,
        city: fCity,
        gender: fGender,
        minAge: String(fMin),
        maxAge: String(fMax),
        // показываем ВСЕ анкеты (умный подбор только по кнопке фильтра)
        smart: "0",
      });
      const res = await fetch(`/api/dating/profiles?${params}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as { profiles: DatingProfile[] };
      setProfiles(json.profiles ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [clientId, fCity, fGender, fMin, fMax]);

  useEffect(() => {
    if (!clientId) return;
    loadMine(clientId);
  }, [clientId, loadMine]);

  useEffect(() => {
    if (view === "browse") loadProfiles();
  }, [view, loadProfiles]);

  // загрузка живых эфиров для верхней ленты на главной
  const loadLiveStrip = useCallback(async () => {
    try {
      const res = await fetch("/api/dating/live", { cache: "no-store" });
      const json = (await res.json()) as {
        streams: {
          id: number;
          clientId: string;
          name: string;
          photo: string;
          viewers: number;
        }[];
      };
      setLiveStrip(json.streams ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (view === "browse" && mode === "profiles") {
      loadLiveStrip();
      const id = setInterval(loadLiveStrip, 8000);
      return () => clearInterval(id);
    }
  }, [view, mode, loadLiveStrip]);

  const rate = async (profile: DatingProfile, value: number) => {
    try {
      const res = await fetch("/api/dating/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: clientId, profileId: profile.id, value }),
      });
      const json = (await res.json()) as { avg: number; count: number };
      // обновляем рейтинг локально — БЕЗ перезагрузки списка,
      // чтобы свайп-колода не сбрасывалась
      setActive((p) =>
        p ? { ...p, rating: json.avg, ratingCount: json.count } : p
      );
      setProfiles((prev) =>
        prev.map((x) =>
          x.id === profile.id
            ? { ...x, rating: json.avg, ratingCount: json.count }
            : x
        )
      );
    } catch {
      /* ignore */
    }
  };

  const openChat = (p: DatingProfile) => {
    setActive(p);
    setView("chat");
  };

  const addFriend = async (toClientId: string) => {
    try {
      await fetch("/api/dating/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: clientId, to: toClientId, action: "add" }),
      });
      window.alert("Заявка в друзья отправлена 🤝");
    } catch {
      window.alert("Не удалось отправить заявку");
    }
  };

  // ---------- 18+ GATE ----------
  if (!ageOk) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="mb-4 text-6xl">🔞</div>
        <h2 className="mb-2 text-xl font-bold text-white">Только 18+</h2>
        <p className="mb-6 text-sm text-slate-400">
          Раздел Chill.Love может содержать материалы для взрослых. Входя, вы
          подтверждаете, что вам исполнилось 18 лет.
        </p>
        <button
          onClick={confirmAge}
          className="w-full max-w-xs rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 py-3 text-sm font-bold text-white"
        >
          Мне есть 18 лет — войти
        </button>
      </div>
    );
  }

  // ---------- CHAT ----------
  if (view === "chat" && active) {
    return (
      <div className="flex h-full flex-col">
        <DatingChat
          me={clientId}
          peer={active}
          premium={premium}
          onBack={() => setView("detail")}
          onNeedPremium={onNeedPremium}
        />
      </div>
    );
  }

  // ---------- ADMIN ----------
  if (view === "admin" && adminKey) {
    return <AdminPanel adminKey={adminKey} onBack={() => setView("browse")} />;
  }

  // ---------- LOGIN ----------
  if (view === "login") {
    return (
      <LoginPanel
        onBack={() => setView("browse")}
        onLoggedIn={(p) => {
          setMyProfile(p);
          // привязываем анкету к этому устройству
          try {
            localStorage.setItem("chillout_client_id", p.clientId);
          } catch {
            /* ignore */
          }
          setView("account");
        }}
      />
    );
  }

  // ---------- ACCOUNT / CABINET ----------
  if (view === "account" && myProfile) {
    return (
      <MyCabinet
        clientId={clientId}
        profile={myProfile}
        onEdit={() => setView("editor")}
        onBack={() => setView("browse")}
      />
    );
  }

  // ---------- EDITOR ----------
  if (view === "editor") {
    return (
      <div className="no-scrollbar h-full overflow-y-auto">
        <div className="flex items-center gap-2 px-4 pt-2">
          <button
            onClick={() => setView("browse")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-300"
          >
            ←
          </button>
          <span className="text-sm text-slate-400">Назад к анкетам</span>
        </div>
        <ProfileEditor
          clientId={clientId}
          initial={myProfile}
          onSaved={(p) => {
            setMyProfile(p);
            setView("browse");
          }}
        />
      </div>
    );
  }

  // ---------- DETAIL ----------
  if (view === "detail" && active) {
    return (
      <div className="no-scrollbar h-full overflow-y-auto px-4 pb-28 pt-2">
        <button
          onClick={() => setView("browse")}
          className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-300"
        >
          ←
        </button>
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <div className="aspect-square w-full bg-white/5">
            {active.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.photo}
                alt={active.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-7xl">
                {active.gender === "female" ? "👩" : "👨"}
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">
                {active.name}, {active.age}
              </h2>
              {active.premium === 1 && <span>👑</span>}
              {active.isTop && (
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  🚀 ТОП
                </span>
              )}
              {active.adult === 1 && (
                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                  18+
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              📍 {active.city || "—"}
            </p>
            {(active.ratingCount ?? 0) > 0 && (
              <p className="mt-1 text-sm text-amber-300">
                ⭐ {(active.rating ?? 0).toFixed(1)} ({active.ratingCount})
              </p>
            )}

            {active.live && (
              <button
                onClick={() => {
                  setMode("live");
                  setView("browse");
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 py-2.5 text-sm font-bold text-white"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                🔴 Сейчас в эфире — смотреть трансляцию
              </button>
            )}

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Tag>{GENDER_LABEL[active.gender]}</Tag>
              <Tag>{ORIENTATION_LABEL[active.orientation]}</Tag>
              <Tag>Ищет: {LOOKING_LABEL[active.lookingFor]}</Tag>
              {active.goal && <Tag>🎯 {active.goal}</Tag>}
            </div>
            {active.bio && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">
                {active.bio}
              </p>
            )}

            {/* rating */}
            <div className="mt-4">
              <p className="mb-1 text-xs text-slate-400">
                Оценить анкету (бесплатно)
              </p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => rate(active, v)}
                    className="text-2xl transition active:scale-90"
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            {/* extra photos / videos */}
            {parseMedia(active.videos).length > 0 && (
              <div className="mt-4 space-y-2">
                {parseMedia(active.videos).map((v, i) => (
                  <video
                    key={i}
                    src={v}
                    controls
                    className="w-full rounded-xl"
                    preload="metadata"
                  />
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => openChat(active)}
                className="flex-1 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 py-3 text-sm font-bold text-white transition active:scale-[0.98]"
              >
                💬 Написать
              </button>
              <button
                onClick={() => void addFriend(active.clientId)}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition active:scale-95"
              >
                🤝 В друзья
              </button>
            </div>

            {/* платные действия */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <PayBtn
                onClick={() =>
                  startPayment({
                    payerClientId: clientId,
                    targetProfileId: active.id,
                    kind: "tip",
                    amount: active.priceTip,
                  })
                }
              >
                💝 Чаевые {active.priceTip}₽
              </PayBtn>
              <PayBtn
                onClick={() =>
                  startPayment({
                    payerClientId: clientId,
                    targetProfileId: active.id,
                    kind: "call",
                  })
                }
              >
                📞 Телефон {active.priceCall}₽
              </PayBtn>
              <PayBtn
                onClick={() =>
                  startPayment({
                    payerClientId: clientId,
                    targetProfileId: active.id,
                    kind: "private",
                  })
                }
              >
                🔒 Приват {active.pricePrivate}₽
              </PayBtn>
              <PayBtn
                onClick={() =>
                  startPayment({
                    payerClientId: clientId,
                    targetProfileId: active.id,
                    kind: "top",
                  })
                }
              >
                🚀 Поднять в топ
              </PayBtn>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-500">
              Оплата через YooMoney · исполнителю 70%
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------- BROWSE ----------
  return (
    <div className="no-scrollbar h-full overflow-y-auto px-3 pb-28 pt-2">
      {/* header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <button
          onClick={() => {
            setMode("profiles");
            setView("browse");
            setActive(null);
          }}
          className="text-xl font-extrabold text-white"
        >
          🏠 Chill<span className="text-pink-400">.Love</span> 💕
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => (adminKey ? setView("admin") : void unlockAdmin())}
            className={`rounded-full px-2.5 py-1.5 text-xs font-semibold ${
              adminKey
                ? "bg-amber-400/20 text-amber-300"
                : "border border-white/10 bg-white/5 text-slate-400"
            }`}
          >
            🛡 Админ
          </button>
          {myProfile ? (
            <button
              onClick={() => setView("account")}
              className="flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-3 py-1.5 text-xs font-semibold text-white"
            >
              👤 Кабинет
            </button>
          ) : (
            <button
              onClick={() => setView("login")}
              className="flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-3 py-1.5 text-xs font-semibold text-white"
            >
              🔑 Вход
            </button>
          )}
        </div>
      </div>

      {/* Переключатель Анкеты / Эфиры */}
      <div className="mb-3 flex gap-1.5 rounded-full border border-white/10 bg-white/5 p-1">
        <button
          onClick={() => setMode("profiles")}
          className={`flex-1 rounded-full py-1.5 text-sm font-medium transition ${
            mode === "profiles"
              ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
              : "text-slate-300"
          }`}
        >
          💗 Анкеты
        </button>
        <button
          onClick={() => setMode("live")}
          className={`flex-1 rounded-full py-1.5 text-sm font-medium transition ${
            mode === "live"
              ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white"
              : "text-slate-300"
          }`}
        >
          🔴 Эфиры
        </button>
      </div>

      {/* Лента эфиров на главной */}
      {mode === "profiles" && liveStrip.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 px-1 text-xs font-semibold text-rose-300">
            🔴 Сейчас в эфире
          </p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {liveStrip.map((s) => (
              <button
                key={s.id}
                onClick={() => setMode("live")}
                className="relative w-24 flex-shrink-0"
              >
                <div className="relative h-28 w-24 overflow-hidden rounded-2xl border border-rose-400/40 bg-white/5">
                  {s.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.photo} alt={s.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl">
                      📹
                    </div>
                  )}
                  <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-rose-600 px-1.5 py-0.5 text-[8px] font-bold text-white">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
                    LIVE
                  </span>
                  <span className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 text-[8px] text-white">
                    👁 {s.viewers}
                  </span>
                </div>
                <p className="mt-1 truncate text-center text-[11px] text-slate-200">
                  {s.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* demo seed */}
      <button
        onClick={async () => {
          await fetch("/api/dating/seed", { method: "POST" });
          loadProfiles();
          loadLiveStrip();
          window.alert("Демо-анкеты и эфиры добавлены ✨");
        }}
        className="mb-3 w-full rounded-xl border border-dashed border-white/20 bg-white/[0.03] py-2 text-xs text-slate-400"
      >
        ✨ Загрузить демо-анкеты и трансляции (для теста)
      </button>

      {adminKey && (
        <button
          onClick={() => void unlockAdmin()}
          className="mb-3 w-full text-center text-[11px] text-slate-600"
        >
          🛡 Выйти из админки
        </button>
      )}

      {mode === "live" && (
        <div className="-mx-3">
          <LiveTab clientId={clientId} myProfile={myProfile} />
        </div>
      )}

      {mode === "profiles" && (
      <>
      {/* registration prompt */}
      {!myProfile && (
        <div className="mb-3 rounded-2xl border border-pink-400/30 bg-pink-500/10 p-4 text-center">
          <p className="mb-1 text-sm font-semibold text-pink-200">
            Заполните анкету, чтобы начать знакомства 💖
          </p>
          <p className="mb-3 text-xs text-slate-300">
            Фото и общение доступны только зарегистрированным.
          </p>
          <button
            onClick={() => setView("editor")}
            className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2 text-sm font-bold text-white"
          >
            Создать анкету
          </button>
        </div>
      )}

      {/* filters */}
      <div className="mb-3 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex gap-2">
          <input
            value={fCity}
            onChange={(e) => setFCity(e.target.value)}
            placeholder="🔍 Город"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <select
            value={fGender}
            onChange={(e) => setFGender(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none [color-scheme:dark]"
          >
            <option value="">Все</option>
            <option value="female">Девушки</option>
            <option value="male">Парни</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Возраст {fMin}–{fMax}</span>
          <input
            type="range"
            min={18}
            max={99}
            value={fMin}
            onChange={(e) => setFMin(Math.min(Number(e.target.value), fMax))}
            className="flex-1 accent-pink-400"
          />
          <input
            type="range"
            min={18}
            max={99}
            value={fMax}
            onChange={(e) => setFMax(Math.max(Number(e.target.value), fMin))}
            className="flex-1 accent-pink-400"
          />
        </div>
      </div>

      {/* вид: карточки / сетка */}
      <div className="mb-3 flex justify-center gap-2">
        <button
          onClick={() => setPView("cards")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            pView === "cards" ? "bg-white/15 text-white" : "text-slate-400"
          }`}
        >
          🃏 Карточки
        </button>
        <button
          onClick={() => setPView("grid")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            pView === "grid" ? "bg-white/15 text-white" : "text-slate-400"
          }`}
        >
          ▦ Сетка
        </button>
      </div>

      {/* content */}
      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">Загрузка…</p>
      ) : profiles.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Анкеты не найдены. Измените фильтры или создайте свою первой!
        </p>
      ) : pView === "cards" ? (
        <SwipeDeck
          profiles={profiles}
          onOpen={(p) => {
            setActive(p);
            setView("detail");
          }}
          onLikeSwipe={(p, liked) => {
            if (liked) rate(p, 5);
          }}
          onRate={(p, v) => rate(p, v)}
          onWatch={(p) => {
            if (p.live) {
              setMode("live");
              setView("browse");
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActive(p);
                setView("detail");
              }}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left transition active:scale-[0.98]"
            >
              <div className="relative aspect-square w-full bg-white/5">
                {p.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.photo}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl">
                    {p.gender === "female" ? "👩" : "👨"}
                  </div>
                )}
                <div className="absolute left-1.5 top-1.5 flex gap-1">
                  {p.isTop && (
                    <span className="rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[9px] font-bold text-[#0b1020]">
                      🚀 ТОП
                    </span>
                  )}
                  {p.adult === 1 && (
                    <span className="rounded-full bg-rose-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      18+
                    </span>
                  )}
                </div>
                {p.live && (
                  <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    LIVE
                  </span>
                )}
              </div>
              <div className="p-2">
                <p className="flex items-center gap-1 truncate text-sm font-semibold text-white">
                  {p.name}, {p.age}
                  {p.premium === 1 && <span className="text-xs">👑</span>}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  📍 {p.city || "—"}
                </p>
                {(p.ratingCount ?? 0) > 0 && (
                  <p className="text-[11px] text-amber-300">
                    ⭐ {(p.rating ?? 0).toFixed(1)}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-200">
      {children}
    </span>
  );
}

function PayBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-400/15 to-yellow-500/15 px-3 py-2.5 text-xs font-semibold text-amber-200 transition active:scale-95"
    >
      {children}
    </button>
  );
}
