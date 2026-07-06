export function isPremiumUser(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("chillout_premium") === "premium";
}

export function setPremiumUser(on: boolean) {
  if (on) localStorage.setItem("chillout_premium", "premium");
  else localStorage.removeItem("chillout_premium");
  window.dispatchEvent(new Event("chillout-premium-changed"));
}

export function onPremiumChanged(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("chillout-premium-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("chillout-premium-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

// Единый сценарий активации премиума (VK Donut авто или код)
export async function unlockPremiumFlow(): Promise<boolean> {
  const input = window.prompt(
    "Введите ваш VK ID (число из vk.com/idХХХ) — после поддержки через VK Donut премиум откроется автоматически.\n\nЕсли у вас есть код — введите его здесь же."
  );
  if (!input) return false;
  const value = input.trim();
  const digits = value.replace(/\D/g, "");
  const looksLikeVkId = digits.length >= 4 && !/[a-zA-Z]/.test(value);

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
      setPremiumUser(true);
      if (digits) localStorage.setItem("chillout_vk_id", digits);
      window.alert("🎉 Премиум активирован! 👑");
      return true;
    }
    window.alert(
      json.error ||
        "Подписка не найдена. Оформите поддержку через VK Donut и попробуйте снова."
    );
    return false;
  } catch {
    window.alert("Ошибка проверки");
    return false;
  }
}

// Ссылки поиска трека
export function youtubeSearch(artist: string, title: string): string {
  const q = encodeURIComponent(`${artist} ${title}`.trim());
  return `https://www.youtube.com/results?search_query=${q}`;
}

export function vkSearch(artist: string, title: string): string {
  const q = encodeURIComponent(`${artist} ${title}`.trim());
  return `https://vk.com/audio?q=${q}`;
}
