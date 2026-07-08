"use client";

export type AlarmState = {
  enabled: boolean;
  time: string;
  fade: boolean;
};

function countdown(target: string, enabled: boolean): string {
  if (!enabled) return "";
  const [h, m] = target.split(":").map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(h, m, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  const diff = next.getTime() - now.getTime();
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `через ${hrs} ч ${mins} мин`;
}

export default function AlarmTab({
  alarm,
  onChange,
  ringing,
  onStop,
  onSnooze,
  onTest,
  notificationPermission,
  onRequestNotifications,
  wakeLockActive,
  sleepLeftMs,
  sleepActive,
  onStartSleep,
  onCancelSleep,
}: {
  alarm: AlarmState;
  onChange: (a: AlarmState) => void;
  ringing: boolean;
  onStop: () => void;
  onSnooze: () => void;
  onTest: () => void;
  notificationPermission: NotificationPermission | "unsupported";
  onRequestNotifications: () => void;
  wakeLockActive: boolean;
  sleepLeftMs: number;
  sleepActive: boolean;
  onStartSleep: (minutes: number) => void;
  onCancelSleep: () => void;
}) {
  const sleepPresets = [15, 30, 45, 60, 120];
  const sleepText = (() => {
    const total = Math.max(0, Math.floor(sleepLeftMs / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h} ч ${m} мин`;
    if (m > 0) return `${m} мин ${String(s).padStart(2, "0")} сек`;
    return `${s} сек`;
  })();
  const presets = ["06:30", "07:00", "07:30", "08:00", "09:00"];
  const timeLeft = countdown(alarm.time, alarm.enabled);

  return (
    <div className="px-5 pt-2">
      {ringing && (
        <div className="fade-up mb-5 rounded-2xl border border-teal-400/40 bg-teal-400/15 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-teal-200">⏰ Подъём!</p>
              <p className="text-sm text-teal-100/80">ChilloutFM уже играет</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onSnooze}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white"
              >
                +10 мин
              </button>
              <button
                onClick={onStop}
                className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#0b1020]"
              >
                Стоп
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Таймер сна */}
      <div className="mb-6 rounded-3xl border border-indigo-400/25 bg-indigo-400/[0.07] p-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-lg">😴</span>
          <h3 className="font-semibold text-white">Таймер сна</h3>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          Музыка сама выключится через заданное время — засыпайте спокойно.
        </p>

        {sleepActive ? (
          <div className="flex items-center justify-between rounded-2xl border border-indigo-400/30 bg-indigo-400/10 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-indigo-100">
                Выключится через
              </p>
              <p className="font-mono text-2xl font-bold text-white">
                {sleepText}
              </p>
            </div>
            <button
              onClick={onCancelSleep}
              className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#0b1020]"
            >
              Отменить
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sleepPresets.map((min) => (
              <button
                key={min}
                onClick={() => onStartSleep(min)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95 ${
                  min === 60
                    ? "border-indigo-400/50 bg-indigo-400/20 text-indigo-100"
                    : "border-white/10 bg-white/[0.04] text-slate-300"
                }`}
              >
                {min < 60 ? `${min} мин` : `${min / 60} ч`}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-col items-center rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-6">
        <div className="mb-1 text-center text-6xl font-bold tracking-tight text-white">
          {alarm.time}
        </div>
        <input
          type="time"
          value={alarm.time}
          onChange={(e) => onChange({ ...alarm, time: e.target.value || "07:00" })}
          className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-center text-lg text-white outline-none [color-scheme:dark]"
        />
        <p className="mt-3 h-5 text-sm text-teal-300">
          {alarm.enabled ? timeLeft : "Будильник выключен"}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-slate-300">
          <div className="mb-1 font-semibold text-white">Уведомления</div>
          <div className="text-slate-400">
            {notificationPermission === "granted"
              ? "разрешены"
              : notificationPermission === "denied"
                ? "запрещены"
                : notificationPermission === "default"
                  ? "не запрошены"
                  : "не поддерживаются"}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-slate-300">
          <div className="mb-1 font-semibold text-white">Экран</div>
          <div className="text-slate-400">
            {wakeLockActive ? "не гаснет" : "обычный режим"}
          </div>
        </div>
      </div>

      {notificationPermission !== "granted" &&
        notificationPermission !== "unsupported" && (
          <button
            onClick={onRequestNotifications}
            className="mb-4 w-full rounded-2xl border border-purple-400/30 bg-purple-400/10 px-4 py-3 text-sm font-medium text-purple-100"
          >
            Разрешить push-уведомление будильника
          </button>
        )}

      <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
        <div>
          <p className="font-medium text-white">Будильник</p>
          <p className="text-xs text-slate-400">Запуск ChilloutFM по времени</p>
        </div>
        <button
          onClick={() => onChange({ ...alarm, enabled: !alarm.enabled })}
          className={`relative h-7 w-12 rounded-full transition-colors ${
            alarm.enabled ? "bg-teal-400" : "bg-white/15"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
              alarm.enabled ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
        <div>
          <p className="font-medium text-white">Плавное нарастание</p>
          <p className="text-xs text-slate-400">Громкость увеличивается постепенно</p>
        </div>
        <button
          onClick={() => onChange({ ...alarm, fade: !alarm.fade })}
          className={`relative h-7 w-12 rounded-full transition-colors ${
            alarm.fade ? "bg-purple-400" : "bg-white/15"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
              alarm.fade ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>

      <button
        onClick={onTest}
        className="mb-6 w-full rounded-2xl border border-teal-400/30 bg-teal-400/10 px-4 py-3 text-sm font-medium text-teal-100"
      >
        Проверить будильник сейчас
      </button>

      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Быстрый выбор
      </p>
      <div className="flex flex-wrap gap-2 pb-4">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => onChange({ ...alarm, time: p, enabled: true })}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              alarm.time === p && alarm.enabled
                ? "border-teal-400 bg-teal-400/20 text-teal-200"
                : "border-white/10 bg-white/[0.04] text-slate-300"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <p className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs leading-relaxed text-amber-100/70">
        💡 Для максимальной надёжности добавьте приложение на главный экран,
        разрешите уведомления и не закрывайте вкладку полностью. При активном
        будильнике приложение старается удерживать экран активным.
      </p>

    </div>
  );
}


