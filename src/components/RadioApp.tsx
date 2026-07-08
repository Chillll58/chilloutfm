"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NowPlaying } from "@/lib/types";
import AlarmTab, { type AlarmState } from "./AlarmTab";
import { applyTheme, getStoredTheme, type Theme } from "./ThemeManager";
import {
  isPremiumUser,
  onPremiumChanged,
  setPremiumUser,
} from "@/lib/premium";
import AlbumArt from "./AlbumArt";
import BottomNav, { type TabId } from "./BottomNav";
import ChatTab from "./ChatTab";
import PlayerTab from "./PlayerTab";
import PlaylistTab from "./PlaylistTab";
import SplashScreen from "./SplashScreen";
import ReactiveBackground from "./ReactiveBackground";
import PremiumModal from "./PremiumModal";
import NewsTab from "./NewsTab";
import ContactsTab from "./ContactsTab";
import UpdateBanner from "./UpdateBanner";
import {
  countMyReplies,
  getSeenReplies,
  markRepliesSeen,
} from "@/lib/feedbackBadge";
import {
  scheduleNativeAlarm,
  cancelNativeAlarm,
  onAlarmTapped,
} from "@/lib/nativeAlarm";

import {
  getFavorites,
  isFavorite as isFavArtist,
  onFavoritesChanged,
  toggleFavorite as toggleFavArtist,
} from "@/lib/favorites";

const STREAM_BASE = "https://myradio24.org/8795";
// 320 kbps — рабочий основной поток (премиум)
const STREAM_HQ = STREAM_BASE;
// 128 kbps — включается владельцем в панели myradio24; иначе откат на основной
const STREAM_SD = "https://myradio24.org/8795_128";
const POLL_MS = 15000;
const DEFAULT_ALARM: AlarmState = {
  enabled: false,
  time: "07:00",
  fade: true,
};

type NotificationState = NotificationPermission | "unsupported";
type WakeLockHandle = {
  release: () => Promise<void>;
  addEventListener?: (type: string, listener: () => void) => void;
};

function parseTab(input: string | null): TabId {
  if (
    input === "playlist" ||
    input === "news" ||
    input === "contacts" ||
    input === "chat" ||
    input === "alarm"
  ) {
    return input;
  }
  return "player";
}

function fmtLeft(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function inTenMinutes(): string {
  const next = new Date(Date.now() + 10 * 60 * 1000);
  return `${String(next.getHours()).padStart(2, "0")}:${String(
    next.getMinutes()
  ).padStart(2, "0")}`;
}

export default function RadioApp() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const lastAlarmKey = useRef<string>("");
  const wakeLockRef = useRef<WakeLockHandle | null>(null);

  const [tab, setTab] = useState<TabId>("player");
  const [feedbackBadge, setFeedbackBadge] = useState(false);
  const [data, setData] = useState<NowPlaying | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(1);
  const [alarm, setAlarm] = useState<AlarmState>(DEFAULT_ALARM);
  const [ringing, setRinging] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationState>("unsupported");
  const [minSplashPassed, setMinSplashPassed] = useState(false);
  const [maxSplashPassed, setMaxSplashPassed] = useState(false);
  const [currentIsFav, setCurrentIsFav] = useState(false);
  const [favVersion, setFavVersion] = useState(0);
  const [theme, setTheme] = useState<Theme>("dark");
  const [premium, setPremium] = useState(false);
  const [quality, setQuality] = useState<"sd" | "hq">("sd");
  const [premiumModal, setPremiumModal] = useState(false);

  const streamTriedFallback = useRef(false);
  const [sleepEndsAt, setSleepEndsAt] = useState<number | null>(null);
  const [sleepLeft, setSleepLeft] = useState<number>(0);
  const lastFavNotifyRef = useRef<string>("");
  // playback intent + reconnection (keep alive in background)
  const shouldPlayRef = useRef(false);
  const reconnectRef = useRef<number | null>(null);
  const reconnectingRef = useRef(false);

  const splashReady = useMemo(
    () => minSplashPassed && (Boolean(data) || maxSplashPassed),
    [data, maxSplashPassed, minSplashPassed]
  );

  useEffect(() => {
    const applyTabFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setTab(parseTab(params.get("tab")));
    };

    applyTabFromUrl();
    window.addEventListener("popstate", applyTabFromUrl);
    return () => window.removeEventListener("popstate", applyTabFromUrl);
  }, []);

  useEffect(() => {
    const minTimer = window.setTimeout(() => setMinSplashPassed(true), 1200);
    const maxTimer = window.setTimeout(() => setMaxSplashPassed(true), 3200);
    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
    };
  }, []);

  useEffect(() => {
    const v = localStorage.getItem("chillout_volume");
    if (v !== null) setVolume(Number(v));
    const a = localStorage.getItem("chillout_alarm");
    if (a) {
      try {
        setAlarm({ ...DEFAULT_ALARM, ...JSON.parse(a) });
      } catch {
        /* ignore */
      }
    }
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // проверка новых ответов на обращения (бейдж на вкладке Контакты)
  useEffect(() => {
    const check = async () => {
      const total = await countMyReplies();
      setFeedbackBadge(total > getSeenReplies());
    };
    check();
    const id = window.setInterval(check, 30000);
    return () => window.clearInterval(id);
  }, []);

  // при открытии вкладки Контакты — отмечаем ответы просмотренными
  useEffect(() => {
    if (tab === "contacts") {
      void countMyReplies().then((total) => {
        markRepliesSeen(total);
        setFeedbackBadge(false);
      });
    }
  }, [tab]);

  useEffect(() => {
    localStorage.setItem("chillout_alarm", JSON.stringify(alarm));
    // нативный будильник: срабатывает даже при закрытом приложении
    if (alarm.enabled) {
      void scheduleNativeAlarm(alarm.time);
    } else {
      void cancelNativeAlarm();
    }
  }, [alarm]);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await fetch("/api/nowplaying", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as NowPlaying;
      setData(json);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void fetchNowPlaying();
    const id = window.setInterval(() => void fetchNowPlaying(), POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchNowPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    localStorage.setItem("chillout_volume", String(volume));
  }, [volume]);

  const clearFade = useCallback(() => {
    if (fadeRef.current) {
      window.clearInterval(fadeRef.current);
      fadeRef.current = null;
    }
  }, []);

  const streamUrl = useCallback(() => {
    // единый рабочий поток
    return STREAM_HQ;
  }, []);

  const play = useCallback(
    async (fade = false) => {
      const audio = audioRef.current;
      if (!audio) return false;

      shouldPlayRef.current = true;
      streamTriedFallback.current = false;
      clearFade();
      audio.src = `${streamUrl()}?_=${Date.now()}`;
      audio.load();
      setIsLoading(true);
      if (fade) audio.volume = 0.02;

      try {
        await audio.play();
        setIsPlaying(true);
        if (fade) {
          const target = volume;
          if (target <= 0.02) {
            audio.volume = target;
          } else {
            const step = target / 30;
            fadeRef.current = window.setInterval(() => {
              const current = audioRef.current;
              if (!current) {
                clearFade();
                return;
              }
              const nextVolume = Math.min(target, current.volume + step);
              current.volume = nextVolume;
              if (nextVolume >= target) clearFade();
            }, 1000);
          }
        } else {
          audio.volume = volume;
        }
        return true;
      } catch {
        setIsPlaying(false);
        setIsLoading(false);
        return false;
      }
    },
    [clearFade, volume, streamUrl]
  );

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    shouldPlayRef.current = false;
    if (reconnectRef.current) {
      window.clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
    clearFade();
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setIsPlaying(false);
    setIsLoading(false);
  }, [clearFade]);

  /* ---- auto-reconnect: keeps the stream alive in the background ---- */
  const reconnect = useCallback(() => {
    if (!shouldPlayRef.current || reconnectingRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;

    reconnectingRef.current = true;
    setIsLoading(true);
    try {
      audio.src = `${streamUrl()}?_=${Date.now()}`;
      audio.load();
      audio
        .play()
        .then(() => {
          audio.volume = volume;
          setIsPlaying(true);
          setIsLoading(false);
          reconnectingRef.current = false;
        })
        .catch(() => {
          reconnectingRef.current = false;
          // retry shortly if we still intend to play
          if (shouldPlayRef.current) {
            reconnectRef.current = window.setTimeout(reconnect, 3000);
          }
        });
    } catch {
      reconnectingRef.current = false;
      if (shouldPlayRef.current) {
        reconnectRef.current = window.setTimeout(reconnect, 3000);
      }
    }
  }, [volume, streamUrl, premium, quality]);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else void play(false);
  }, [isPlaying, pause, play]);

  const requestNotifications = useCallback(async () => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }, []);

  const fireAlarmNotice = useCallback(() => {
    if (typeof window === "undefined") return;
    navigator.vibrate?.([300, 140, 300, 140, 600]);
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const title = data?.current.artist || "ChilloutFM";
    const body = data?.current.title
      ? `Будильник: ${data.current.title}`
      : "Пора просыпаться вместе с ChilloutFM";
    const notice = new Notification(`⏰ ${title}`, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "chilloutfm-alarm",
    });
    notice.onclick = () => window.focus();
  }, [data]);

  const triggerAlarm = useCallback(
    async (fromSchedule: boolean) => {
      setRinging(true);
      setTab("player");
      fireAlarmNotice();
      if (fromSchedule) {
        await play(alarm.fade);
      } else {
        await play(alarm.fade);
      }
    },
    [alarm.fade, fireAlarmNotice, play]
  );

  const stopAlarm = useCallback(() => {
    setRinging(false);
    pause();
  }, [pause]);

  // запуск радио при нажатии на нативное уведомление будильника
  useEffect(() => {
    void onAlarmTapped(() => {
      setTab("player");
      setRinging(true);
      void play(false);
      // перепланировать на следующий день
      if (alarm.enabled) void scheduleNativeAlarm(alarm.time);
    });
  }, [play, alarm.enabled, alarm.time]);

  const snoozeAlarm = useCallback(() => {
    setRinging(false);
    pause();
    setAlarm((prev) => ({ ...prev, enabled: true, time: inTenMinutes() }));
  }, [pause]);

  const requestWakeLock = useCallback(async () => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockHandle> };
    };

    if (!nav.wakeLock || document.hidden) {
      setWakeLockActive(false);
      return;
    }

    try {
      const lock = await nav.wakeLock.request("screen");
      wakeLockRef.current = lock;
      setWakeLockActive(true);
      lock.addEventListener?.("release", () => setWakeLockActive(false));
    } catch {
      setWakeLockActive(false);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (!wakeLockRef.current) return;
    try {
      await wakeLockRef.current.release();
    } catch {
      /* ignore */
    } finally {
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  useEffect(() => {
    const shouldHold = alarm.enabled || isPlaying || ringing;
    if (shouldHold) void requestWakeLock();
    else void releaseWakeLock();
  }, [alarm.enabled, isPlaying, releaseWakeLock, requestWakeLock, ringing]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        void releaseWakeLock();
      } else if (alarm.enabled || isPlaying || ringing) {
        void requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [alarm.enabled, isPlaying, releaseWakeLock, requestWakeLock, ringing]);

  useEffect(() => {
    return () => {
      void releaseWakeLock();
      clearFade();
    };
  }, [clearFade, releaseWakeLock]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
      reconnectingRef.current = false;
    };
    const onWaiting = () => setIsLoading(true);
    const onPause = () => setIsPlaying(false);
    const scheduleReconnect = () => {
      if (!shouldPlayRef.current) return;
      setIsPlaying(false);
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
      reconnectRef.current = window.setTimeout(reconnect, 1500);
    };
    const onError = () => {
      setIsLoading(false);
      scheduleReconnect();
    };
    // stream dropped (network switch / background) -> reconnect
    const onEnded = () => scheduleReconnect();
    const onStalled = () => scheduleReconnect();

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("stalled", onStalled);
    return () => {
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("stalled", onStalled);
    };
  }, [reconnect]);

  /* ---- reconnect when network returns or app comes back to foreground ---- */
  useEffect(() => {
    const onOnline = () => {
      if (shouldPlayRef.current) reconnect();
    };
    const onVisible = () => {
      if (
        !document.hidden &&
        shouldPlayRef.current &&
        audioRef.current &&
        audioRef.current.paused
      ) {
        reconnect();
      }
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reconnect]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    // Multiple artwork sizes help HyperOS "Hyper Island" and other
    // system media islands render a crisp cover.
    const cover =
      data?.current.img && !data.current.img.includes("nocover")
        ? data.current.img
        : null;

    const artwork = cover
      ? [
          { src: cover, sizes: "96x96", type: "image/jpeg" },
          { src: cover, sizes: "192x192", type: "image/jpeg" },
          { src: cover, sizes: "256x256", type: "image/jpeg" },
          { src: cover, sizes: "384x384", type: "image/jpeg" },
          { src: cover, sizes: "512x512", type: "image/jpeg" },
        ]
      : [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: data?.current.title || data?.current.song || "ChilloutFM",
      artist: data?.current.artist || "ChilloutFM",
      album: "ChilloutFM • Интернет радио",
      artwork,
    });

    try {
      navigator.mediaSession.setActionHandler("play", () => void play(false));
      navigator.mediaSession.setActionHandler("pause", () => pause());
      navigator.mediaSession.setActionHandler("stop", () => pause());
      // Some islands show prev/next; map them to a fresh reconnect / no-op.
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("seekto", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
    } catch {
      /* ignore */
    }
  }, [data, pause, play]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

    // Live radio: declare "infinite" duration so the island treats it
    // as a continuous stream and keeps the island pinned while playing.
    try {
      navigator.mediaSession.setPositionState?.({
        duration: Number.POSITIVE_INFINITY,
        playbackRate: 1,
        position: 0,
      });
    } catch {
      /* some engines reject Infinity — safe to ignore */
    }
  }, [isPlaying]);

  useEffect(() => {
    const check = () => {
      if (!alarm.enabled) return;
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const current = `${hh}:${mm}`;
      const key = `${now.toDateString()} ${current}`;

      if (current === alarm.time && lastAlarmKey.current !== key) {
        lastAlarmKey.current = key;
        void triggerAlarm(true);
      }
    };

    check();
    const id = window.setInterval(check, 5000);
    return () => window.clearInterval(id);
  }, [alarm.enabled, alarm.time, triggerAlarm]);

  /* ---- favorites: keep current-artist flag in sync ---- */
  useEffect(() => {
    const artist = data?.current.artist ?? "";
    setCurrentIsFav(isFavArtist(artist));
  }, [data, favVersion]);

  useEffect(() => {
    return onFavoritesChanged(() => setFavVersion((v) => v + 1));
  }, []);

  /* ---- theme ---- */
  useEffect(() => {
    const t = getStoredTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  /* ---- premium + quality ---- */
  useEffect(() => {
    const sync = () => {
      const p = isPremiumUser();
      setPremium(p);
      // premium defaults to HQ, free forced to SD
      setQuality((q) => (p ? q : "sd"));
    };
    sync();
    const savedQ = localStorage.getItem("chillout_quality");
    if (savedQ === "hq" && isPremiumUser()) setQuality("hq");
    return onPremiumChanged(sync);
  }, []);

  useEffect(() => {
    localStorage.setItem("chillout_quality", quality);
  }, [quality]);

  const selectProfile = useCallback((target: "free" | "premium") => {
    if (target === "free") {
      setPremiumUser(false);
      setQuality("sd");
      return;
    }
    if (isPremiumUser()) {
      setPremium(true);
      setQuality("hq");
      return;
    }
    setPremiumModal(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  /* ---- sleep timer ---- */
  const startSleepTimer = useCallback((minutes: number) => {
    if (minutes <= 0) {
      setSleepEndsAt(null);
      return;
    }
    setSleepEndsAt(Date.now() + minutes * 60 * 1000);
    navigator.vibrate?.(20);
  }, []);

  const cancelSleepTimer = useCallback(() => setSleepEndsAt(null), []);

  useEffect(() => {
    if (!sleepEndsAt) {
      setSleepLeft(0);
      return;
    }
    const tick = () => {
      const left = sleepEndsAt - Date.now();
      if (left <= 0) {
        setSleepEndsAt(null);
        setSleepLeft(0);
        pause();
      } else {
        setSleepLeft(left);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [sleepEndsAt, pause]);

  const toggleCurrentFavorite = useCallback(() => {
    const artist = data?.current.artist ?? "";
    if (!artist) return;
    const nowFav = toggleFavArtist(artist);
    setCurrentIsFav(nowFav);
    navigator.vibrate?.(20);
  }, [data]);

  /* ---- push notification when a favorite artist starts playing ---- */
  useEffect(() => {
    if (!data?.current.artist) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const favs = getFavorites();
    const artist = data.current.artist;
    const isFav = favs.some(
      (a) => a.toLowerCase() === artist.toLowerCase()
    );
    if (!isFav) return;

    const key = data.current.song || `${artist} - ${data.current.title}`;
    if (lastFavNotifyRef.current === key) return;
    lastFavNotifyRef.current = key;

    // don't notify on the very first load
    if (document.visibilityState === "visible") return;

    const notice = new Notification(`⭐ Играет ${artist}`, {
      body: data.current.title
        ? `Сейчас: ${data.current.title}`
        : "Ваш любимый артист в эфире ChilloutFM",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "chilloutfm-favorite",
    });
    notice.onclick = () => window.focus();
    navigator.vibrate?.([200, 100, 200]);
  }, [data]);

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-[#0b1020] shadow-2xl shadow-black/40 sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
      <SplashScreen ready={splashReady} />

      <ReactiveBackground active={isPlaying && !isLoading} />

      <header
        className="relative z-10 flex items-center gap-3 px-5 pb-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt="ChilloutFM"
          className="h-9 w-9 rounded-xl ring-1 ring-white/10"
        />
        <div className="leading-tight">
          <h1 className="text-base font-extrabold tracking-tight text-white">
            Chillout<span className="text-teal-300">FM</span>
          </h1>
          <p className="text-[11px] text-slate-400">
            {data?.genre ? data.genre : "интернет радио"}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {sleepEndsAt && (
            <span className="flex items-center gap-1 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-2 py-1 text-[10px] font-medium text-indigo-200">
              😴 {fmtLeft(sleepLeft)}
            </span>
          )}
          <button
            onClick={toggleTheme}
            aria-label="Сменить тему"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300"
          >
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
                <path
                  d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          {wakeLockActive && (
            <span className="hidden rounded-full border border-teal-400/20 bg-teal-400/10 px-2 py-1 text-[10px] font-medium text-teal-200 sm:inline">
              экран активен
            </span>
          )}
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isPlaying ? "animate-pulse bg-emerald-400" : "bg-slate-500"
              }`}
            />
            <span className="text-[10px] font-medium text-slate-300">
              {isPlaying ? "live" : "•"}
            </span>
          </div>
        </div>
      </header>

      <UpdateBanner />

      <main
        className={
          tab === "chat"
            ? "relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden pb-2 pt-1"
            : "no-scrollbar relative z-10 flex-1 overflow-y-auto pb-3 pt-1"
        }
      >
        {tab === "player" && (
          <PlayerTab
            data={data}
            isPlaying={isPlaying}
            isLoading={isLoading}
            onToggle={toggle}
            volume={volume}
            onVolume={setVolume}
            isFavorite={currentIsFav}
            onToggleFavorite={toggleCurrentFavorite}
            premium={premium}
            quality={quality}
            onQualityChange={(q) => {
              if (q === "hq" && !premium) return;
              setQuality(q);
              if (isPlaying) void play(false);
            }}
            onSelectProfile={selectProfile}
          />
        )}
        {tab === "playlist" && <PlaylistTab data={data} premium={premium} />}
        {tab === "news" && <NewsTab />}
        {tab === "chat" && <ChatTab active={tab === "chat"} />}
        {tab === "alarm" && (
          <AlarmTab
            alarm={alarm}
            onChange={setAlarm}
            ringing={ringing}
            onStop={stopAlarm}
            onSnooze={snoozeAlarm}
            onTest={() => void triggerAlarm(false)}
            notificationPermission={notificationPermission}
            onRequestNotifications={() => void requestNotifications()}
            wakeLockActive={wakeLockActive}
            sleepLeftMs={sleepLeft}
            sleepActive={sleepEndsAt !== null}
            onStartSleep={startSleepTimer}
            onCancelSleep={cancelSleepTimer}
          />
        )}
        {tab === "contacts" && <ContactsTab />}
      </main>

      {tab !== "player" && (
        <button
          onClick={() => setTab("player")}
          className="relative z-10 mx-3 mb-1 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-2 backdrop-blur-xl"
        >
          <AlbumArt
            src={data?.current.img}
            alt={data?.current.artist ?? "ChilloutFM"}
            className="h-11 w-11 flex-shrink-0"
            rounded="rounded-xl"
            spinning={isPlaying}
          />
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold text-white">
              {data?.current.artist || "ChilloutFM"}
            </p>
            <p className="truncate text-xs text-slate-400">
              {data?.current.title || "интернет радио"}
            </p>
          </div>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                toggle();
              }
            }}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-purple-500 text-[#0b1020]"
          >
            {isLoading ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="44"
                  strokeDashoffset="14"
                />
              </svg>
            ) : isPlaying ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1.5" />
                <rect x="14" y="5" width="4" height="14" rx="1.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor">
                <path d="M7 5.5v13a1 1 0 001.53.85l10-6.5a1 1 0 000-1.7l-10-6.5A1 1 0 007 5.5z" />
              </svg>
            )}
          </span>
        </button>
      )}

      <BottomNav
        active={tab}
        onChange={setTab}
        badges={{ contacts: feedbackBadge }}
      />

      <PremiumModal
        open={premiumModal}
        onClose={() => setPremiumModal(false)}
        onActivated={() => {
          setPremium(true);
          setQuality("hq");
        }}
      />

      <audio ref={audioRef} preload="none" crossOrigin="anonymous" />
    </div>
  );
}
