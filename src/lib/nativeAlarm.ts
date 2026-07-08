/**
 * Нативный будильник через @capacitor/local-notifications.
 * Уведомление срабатывает даже когда приложение закрыто (Android AlarmManager).
 * На web плагин работает только пока вкладка открыта — это нормальный фолбэк.
 */

const ALARM_ID = 777;

type LN = {
  requestPermissions: () => Promise<unknown>;
  schedule: (opts: unknown) => Promise<unknown>;
  cancel: (opts: unknown) => Promise<unknown>;
};

async function getPlugin(): Promise<LN | null> {
  try {
    const mod = await import("@capacitor/local-notifications");
    return mod.LocalNotifications as unknown as LN;
  } catch {
    return null;
  }
}

/** Ближайшая дата для времени HH:MM (сегодня или завтра). */
function nextOccurrence(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(h || 0, m || 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

export async function scheduleNativeAlarm(time: string) {
  const LN = await getPlugin();
  if (!LN) return;
  try {
    await LN.requestPermissions();
    await LN.cancel({ notifications: [{ id: ALARM_ID }] });
    await LN.schedule({
      notifications: [
        {
          id: ALARM_ID,
          title: "⏰ ChilloutFM — будильник",
          body: "Пора вставать! Нажмите, чтобы включить радио 🎶",
          schedule: { at: nextOccurrence(time), allowWhileIdle: true },
          sound: undefined, // системный звук уведомления
          smallIcon: "ic_launcher",
        },
      ],
    });
  } catch {
    /* ignore */
  }
}

export async function cancelNativeAlarm() {
  const LN = await getPlugin();
  if (!LN) return;
  try {
    await LN.cancel({ notifications: [{ id: ALARM_ID }] });
  } catch {
    /* ignore */
  }
}

/** Регистрирует обработчик нажатия на уведомление будильника. */
export async function onAlarmTapped(cb: () => void) {
  try {
    const mod = await import("@capacitor/local-notifications");
    const LN = mod.LocalNotifications as unknown as {
      addListener: (
        event: string,
        handler: (e: unknown) => void
      ) => Promise<unknown>;
    };
    await LN.addListener("localNotificationActionPerformed", () => cb());
  } catch {
    /* ignore */
  }
}
