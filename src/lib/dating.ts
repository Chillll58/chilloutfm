export type DatingProfile = {
  id: number;
  clientId: string;
  name: string;
  age: number;
  gender: "male" | "female";
  orientation: string;
  lookingFor: string;
  city: string;
  goal: string;
  bio: string;
  photo: string;
  minAge: number;
  maxAge: number;
  premium: number;
  phone: string;
  email: string;
  verified: number;
  hidden: string;
  hiddenFields?: string[];
  adult: number;
  photos: string;
  videos: string;
  privatePhotos: string;
  priceTip: number;
  pricePrivate: number;
  priceCall: number;
  earnings?: number;
  isTop?: boolean;
  live?: boolean;
  streamId?: number;
  rating?: number;
  ratingCount?: number;
};

export function parseMedia(json: string): string[] {
  try {
    const a = JSON.parse(json || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

export type DatingPost = {
  id: number;
  clientId: string;
  text: string;
  image: string;
  likes: number;
  createdAt: string;
};

export const HIDEABLE_FIELDS: { key: string; label: string }[] = [
  { key: "age", label: "Возраст" },
  { key: "city", label: "Город" },
  { key: "bio", label: "О себе" },
];

export async function startPayment(opts: {
  payerClientId: string;
  targetProfileId: number;
  kind: "tip" | "private" | "call" | "top" | "premium";
  amount?: number;
}): Promise<void> {
  try {
    const res = await fetch("/api/dating/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    const json = (await res.json()) as { payUrl?: string; error?: string };
    if (json.payUrl) {
      window.open(json.payUrl, "_blank", "noopener,noreferrer");
    } else {
      window.alert(
        json.error === undefined
          ? "Оплата не настроена. Добавьте YOOMONEY_WALLET на сервере."
          : json.error
      );
    }
  } catch {
    window.alert("Ошибка оплаты");
  }
}

export const GENDER_LABEL: Record<string, string> = {
  male: "Парень",
  female: "Девушка",
};

export const ORIENTATION_LABEL: Record<string, string> = {
  hetero: "Гетеро",
  homo: "Гомо",
  bi: "Би",
};

export const LOOKING_LABEL: Record<string, string> = {
  male: "Парней",
  female: "Девушек",
  any: "Всех",
};

export const GOALS = [
  "Общение",
  "Дружба",
  "Отношения",
  "Свидание",
  "Флирт",
];
