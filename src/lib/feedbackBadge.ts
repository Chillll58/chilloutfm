import { getClientId } from "./clientId";

const SEEN_KEY = "chillout_feedback_seen";

// Количество ответов, которые пользователь уже видел
export function getSeenReplies(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(SEEN_KEY) || "0");
}

export function markRepliesSeen(count: number) {
  localStorage.setItem(SEEN_KEY, String(count));
  window.dispatchEvent(new Event("chillout-feedback-seen"));
}

// Проверяет сервер: сколько ответов у пользователя есть сейчас
export async function countMyReplies(): Promise<number> {
  try {
    const id = getClientId();
    const res = await fetch(`/api/feedback?client=${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    const json = (await res.json()) as {
      messages?: { reply?: string }[];
    };
    return (json.messages ?? []).filter((m) => m.reply && m.reply.trim()).length;
  } catch {
    return 0;
  }
}
