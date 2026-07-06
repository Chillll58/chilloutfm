export type VkUser = {
  id: string;
  name: string;
  photo?: string;
};

export function getVkUser(): VkUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("chillout_vk_user");
    return raw ? (JSON.parse(raw) as VkUser) : null;
  } catch {
    return null;
  }
}

export function setVkUser(user: VkUser | null) {
  if (user) localStorage.setItem("chillout_vk_user", JSON.stringify(user));
  else localStorage.removeItem("chillout_vk_user");
  window.dispatchEvent(new Event("chillout-vk-changed"));
}

export function onVkChanged(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("chillout-vk-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("chillout-vk-changed", cb);
    window.removeEventListener("storage", cb);
  };
}
