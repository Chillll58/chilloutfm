const KEY = "chillout_fav_artists";
const EVENT = "chillout-fav-changed";

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as string[]) : [];
  } catch {
    return [];
  }
}

function save(list: string[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
}

export function isFavorite(artist: string): boolean {
  if (!artist) return false;
  return getFavorites().some(
    (a) => a.toLowerCase() === artist.toLowerCase()
  );
}

export function toggleFavorite(artist: string): boolean {
  const clean = artist.trim();
  if (!clean) return false;
  const list = getFavorites();
  const exists = list.some((a) => a.toLowerCase() === clean.toLowerCase());
  const next = exists
    ? list.filter((a) => a.toLowerCase() !== clean.toLowerCase())
    : [...list, clean];
  save(next);
  return !exists;
}

export function removeFavorite(artist: string) {
  const list = getFavorites().filter(
    (a) => a.toLowerCase() !== artist.toLowerCase()
  );
  save(list);
}

export function onFavoritesChanged(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
