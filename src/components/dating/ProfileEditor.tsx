"use client";

import { useEffect, useRef, useState } from "react";
import { fileToDataUrl, MAX_ATTACHMENT_BYTES, humanSize } from "@/lib/media";
import { GOALS, HIDEABLE_FIELDS, parseMedia, type DatingProfile } from "@/lib/dating";

export default function ProfileEditor({
  clientId,
  initial,
  onSaved,
}: {
  clientId: string;
  initial: DatingProfile | null;
  onSaved: (p: DatingProfile) => void;
}) {
  const [name, setName] = useState("");
  const [age, setAge] = useState(20);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [orientation, setOrientation] = useState("hetero");
  const [lookingFor, setLookingFor] = useState("female");
  const [city, setCity] = useState("");
  const [goal, setGoal] = useState("Общение");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState("");
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(45);
  const [phone, setPhone] = useState("");
  const [adult, setAdult] = useState(false);
  const [priceTip, setPriceTip] = useState(100);
  const [pricePrivate, setPricePrivate] = useState(300);
  const [priceCall, setPriceCall] = useState(500);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [privates, setPrivates] = useState<string[]>([]);
  const [verified, setVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const privRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setAge(initial.age);
      setGender(initial.gender);
      setOrientation(initial.orientation);
      setLookingFor(initial.lookingFor);
      setCity(initial.city);
      setGoal(initial.goal || "Общение");
      setBio(initial.bio);
      setPhoto(initial.photo);
      setMinAge(initial.minAge);
      setMaxAge(initial.maxAge);
      setPhone(initial.phone || "");
      setAdult(initial.adult === 1);
      setPriceTip(initial.priceTip || 100);
      setPricePrivate(initial.pricePrivate || 300);
      setPriceCall(initial.priceCall || 500);
      setEmail(initial.email || "");
      setVerified(initial.verified === 1);
      try {
        setHidden(JSON.parse(initial.hidden || "[]"));
      } catch {
        setHidden([]);
      }
      setGallery(parseMedia(initial.photos));
      setVideos(parseMedia(initial.videos));
      setPrivates(parseMedia(initial.privatePhotos));
    }
  }, [initial]);

  const addMedia = async (
    files: FileList | null,
    setter: (fn: (p: string[]) => string[]) => void,
    max = 6
  ) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (f.size > MAX_ATTACHMENT_BYTES) continue;
      const url = await fileToDataUrl(f);
      setter((p) => (p.length >= max ? p : [...p, url]));
    }
  };

  const toggleHidden = (key: string) =>
    setHidden((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));

  const sendCode = async () => {
    const contact = (email || phone).trim();
    if (!contact) {
      setErr("Введите телефон или email для подтверждения");
      return;
    }
    try {
      const res = await fetch("/api/dating/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", contact }),
      });
      const json = (await res.json()) as { devCode?: string };
      setCodeSent(true);
      if (json.devCode) setDevCode(json.devCode);
    } catch {
      setErr("Не удалось отправить код");
    }
  };

  const checkCode = async () => {
    const contact = (email || phone).trim();
    try {
      const res = await fetch("/api/dating/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", contact, code }),
      });
      if (res.ok) {
        setVerified(true);
        setCodeSent(false);
      } else {
        setErr("Неверный код");
      }
    } catch {
      setErr("Ошибка проверки");
    }
  };

  const pickPhoto = async (file?: File | null) => {
    setErr("");
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setErr(`Фото слишком большое (макс. ${humanSize(MAX_ATTACHMENT_BYTES)})`);
      return;
    }
    try {
      setPhoto(await fileToDataUrl(file));
    } catch {
      setErr("Не удалось загрузить фото");
    }
  };

  const save = async () => {
    if (!name.trim()) {
      setErr("Укажите имя");
      return;
    }
    if (!phone.trim()) {
      setErr("Телефон обязателен для заполнения");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/dating/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          name,
          age,
          gender,
          orientation,
          lookingFor,
          city,
          goal,
          bio,
          photo,
          minAge,
          maxAge,
          phone,
          adult,
          priceTip,
          pricePrivate,
          priceCall,
          email,
          verified,
          hidden,
          photos: gallery,
          videos,
          privatePhotos: privates,
        }),
      });
      const json = (await res.json()) as { profile?: DatingProfile; error?: string };
      if (json.profile) {
        // сохранить пароль (если задан) — для входа с других устройств
        if (password.trim()) {
          await fetch("/api/dating/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "set-password",
              contact: (email || phone).trim().toLowerCase(),
              password: password.trim(),
            }),
          }).catch(() => {});
        }
        onSaved(json.profile);
      } else setErr(json.error || "Ошибка сохранения");
    } catch {
      setErr("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  const Chip = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? "border-pink-400/60 bg-pink-500/20 text-pink-200"
          : "border-white/10 bg-white/5 text-slate-300"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-4 px-4 pb-28 pt-2">
      <h2 className="text-lg font-bold text-white">Моя анкета</h2>

      {/* photo */}
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void pickPhoto(e.target.files?.[0])}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/5"
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="фото" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-3xl">
              📷
            </span>
          )}
        </button>
        <div className="text-xs text-slate-400">
          Нажмите, чтобы загрузить главное фото анкеты.
        </div>
      </div>

      <Field label="Имя">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-pink-400/50"
          placeholder="Ваше имя"
        />
      </Field>

      <Field label="Телефон * (обязательно, скрыт от других)">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={30}
          inputMode="tel"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-pink-400/50"
          placeholder="+7 900 000-00-00"
        />
      </Field>

      <Field label="Email (для входа/подтверждения)">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={80}
          inputMode="email"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-pink-400/50"
          placeholder="you@mail.ru"
        />
      </Field>

      <Field label="Пароль (для входа с других устройств)">
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          maxLength={60}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-pink-400/50"
          placeholder="Придумайте пароль"
        />
      </Field>

      {/* Подтверждение */}
      <div className="rounded-2xl border border-teal-400/25 bg-teal-400/[0.06] p-3">
        {verified ? (
          <p className="text-sm font-medium text-teal-200">✔️ Аккаунт подтверждён</p>
        ) : !codeSent ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-300">
              Подтвердите телефон или email кодом
            </p>
            <button
              onClick={() => void sendCode()}
              className="rounded-full bg-teal-400 px-3 py-1.5 text-xs font-semibold text-[#0b1020]"
            >
              Получить код
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {devCode && (
              <p className="text-[11px] text-amber-300">
                Демо-код: <b>{devCode}</b> (SMS/email провайдер не настроен)
              </p>
            )}
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Код из 6 цифр"
                inputMode="numeric"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              />
              <button
                onClick={() => void checkCode()}
                className="rounded-full bg-teal-400 px-4 py-1.5 text-xs font-semibold text-[#0b1020]"
              >
                Проверить
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Field label="Возраст" className="w-24">
          <input
            type="number"
            min={18}
            max={99}
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-pink-400/50"
          />
        </Field>
        <Field label="Город" className="flex-1">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={60}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-pink-400/50"
            placeholder="Москва"
          />
        </Field>
      </div>

      <Field label="Я">
        <div className="flex gap-2">
          <Chip active={gender === "male"} onClick={() => setGender("male")}>
            👨 Парень
          </Chip>
          <Chip active={gender === "female"} onClick={() => setGender("female")}>
            👩 Девушка
          </Chip>
        </div>
      </Field>

      <Field label="Ориентация">
        <div className="flex flex-wrap gap-2">
          <Chip active={orientation === "hetero"} onClick={() => setOrientation("hetero")}>
            Гетеро
          </Chip>
          <Chip active={orientation === "homo"} onClick={() => setOrientation("homo")}>
            Гомо
          </Chip>
          <Chip active={orientation === "bi"} onClick={() => setOrientation("bi")}>
            Би
          </Chip>
        </div>
      </Field>

      <Field label="Ищу">
        <div className="flex flex-wrap gap-2">
          <Chip active={lookingFor === "female"} onClick={() => setLookingFor("female")}>
            Девушек
          </Chip>
          <Chip active={lookingFor === "male"} onClick={() => setLookingFor("male")}>
            Парней
          </Chip>
          <Chip active={lookingFor === "any"} onClick={() => setLookingFor("any")}>
            Всех
          </Chip>
        </div>
      </Field>

      <Field label="Цель">
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <Chip key={g} active={goal === g} onClick={() => setGoal(g)}>
              {g}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label={`Возраст партнёра: ${minAge}–${maxAge}`}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={18}
            max={99}
            value={minAge}
            onChange={(e) => setMinAge(Math.min(Number(e.target.value), maxAge))}
            className="flex-1 accent-pink-400"
          />
          <input
            type="range"
            min={18}
            max={99}
            value={maxAge}
            onChange={(e) => setMaxAge(Math.max(Number(e.target.value), minAge))}
            className="flex-1 accent-pink-400"
          />
        </div>
      </Field>

      <Field label="О себе">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={600}
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-pink-400/50 resize-none"
          placeholder="Расскажите о себе, чего хотите…"
        />
      </Field>

      {/* Галерея фото */}
      <MediaBlock
        title="📸 Фотогалерея (для всех)"
        items={gallery}
        onAdd={() => galRef.current?.click()}
        onRemove={(i) => setGallery((p) => p.filter((_, k) => k !== i))}
        inputRef={galRef}
        accept="image/*"
        onFiles={(f) => void addMedia(f, setGallery)}
        kind="image"
      />

      {/* Видео */}
      <MediaBlock
        title="🎬 Видео (для всех)"
        items={videos}
        onAdd={() => vidRef.current?.click()}
        onRemove={(i) => setVideos((p) => p.filter((_, k) => k !== i))}
        inputRef={vidRef}
        accept="video/*"
        onFiles={(f) => void addMedia(f, setVideos, 4)}
        kind="video"
      />

      {/* Приватные 18+ фото */}
      <MediaBlock
        title="🔞 Приватные фото (платно для других)"
        items={privates}
        onAdd={() => privRef.current?.click()}
        onRemove={(i) => setPrivates((p) => p.filter((_, k) => k !== i))}
        inputRef={privRef}
        accept="image/*"
        onFiles={(f) => void addMedia(f, setPrivates)}
        kind="image"
      />

      {/* Скрытые поля */}
      <Field label="Скрыть от других (приватность)">
        <div className="flex flex-wrap gap-2">
          {HIDEABLE_FIELDS.map((f) => (
            <button
              key={f.key}
              onClick={() => toggleHidden(f.key)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                hidden.includes(f.key)
                  ? "border-rose-400/50 bg-rose-500/20 text-rose-200"
                  : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              {hidden.includes(f.key) ? "🙈" : "👁"} {f.label}
            </button>
          ))}
        </div>
      </Field>

      {/* 18+ */}
      <div className="flex items-center justify-between rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-rose-200">🔞 Контент 18+</p>
          <p className="text-xs text-slate-400">
            Анкета содержит материалы для взрослых
          </p>
        </div>
        <button
          onClick={() => setAdult((v) => !v)}
          className={`relative h-7 w-12 rounded-full transition-colors ${
            adult ? "bg-rose-400" : "bg-white/15"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
              adult ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>

      {/* Цены (для приёма оплаты, вы получаете 70%) */}
      <div className="space-y-2 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-3">
        <p className="text-sm font-semibold text-amber-200">
          💰 Платные услуги (вам — 70%)
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Чаевые ₽">
            <input
              type="number"
              min={10}
              value={priceTip}
              onChange={(e) => setPriceTip(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-pink-400/50"
            />
          </Field>
          <Field label="Приват ₽">
            <input
              type="number"
              min={10}
              value={pricePrivate}
              onChange={(e) => setPricePrivate(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-pink-400/50"
            />
          </Field>
          <Field label="Звонок ₽">
            <input
              type="number"
              min={10}
              value={priceCall}
              onChange={(e) => setPriceCall(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-pink-400/50"
            />
          </Field>
        </div>
      </div>

      {err && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {err}
        </p>
      )}

      <button
        onClick={() => void save()}
        disabled={saving}
        className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        {saving ? "Сохранение…" : "Сохранить анкету"}
      </button>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function MediaBlock({
  title,
  items,
  onAdd,
  onRemove,
  inputRef,
  accept,
  onFiles,
  kind,
}: {
  title: string;
  items: string[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  accept: string;
  onFiles: (f: FileList | null) => void;
  kind: "image" | "video";
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-400">{title}</label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <div className="grid grid-cols-3 gap-2">
        {items.map((src, i) => (
          <div key={i} className="relative">
            {kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" className="aspect-square w-full rounded-xl object-cover" />
            ) : (
              <video src={src} className="aspect-square w-full rounded-xl object-cover" />
            )}
            <button
              onClick={() => onRemove(i)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={onAdd}
          className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 text-2xl text-slate-400"
        >
          ＋
        </button>
      </div>
    </div>
  );
}
