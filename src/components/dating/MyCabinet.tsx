"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fileToDataUrl, MAX_ATTACHMENT_BYTES } from "@/lib/media";
import { parseMedia, type DatingProfile, type DatingPost } from "@/lib/dating";

export default function MyCabinet({
  clientId,
  profile,
  onEdit,
  onBack,
}: {
  clientId: string;
  profile: DatingProfile;
  onEdit: () => void;
  onBack: () => void;
}) {
  const [posts, setPosts] = useState<DatingPost[]>([]);
  const [postText, setPostText] = useState("");
  const [postImg, setPostImg] = useState("");
  const [friends, setFriends] = useState<string[]>([]);
  const [incoming, setIncoming] = useState<string[]>([]);
  const postImgRef = useRef<HTMLInputElement>(null);

  const gallery = parseMedia(profile.photos);
  const videos = parseMedia(profile.videos);
  const privates = parseMedia(profile.privatePhotos);
  const earningsRub = Math.round((profile.earnings ?? 0));

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/dating/posts?client=${encodeURIComponent(clientId)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as { posts: DatingPost[] };
      setPosts(json.posts ?? []);
    } catch {
      /* ignore */
    }
  }, [clientId]);

  const loadFriends = useCallback(async () => {
    try {
      const res = await fetch(`/api/dating/friends?me=${encodeURIComponent(clientId)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as { friends: string[]; incoming: string[] };
      setFriends(json.friends ?? []);
      setIncoming(json.incoming ?? []);
    } catch {
      /* ignore */
    }
  }, [clientId]);

  useEffect(() => {
    loadPosts();
    loadFriends();
  }, [loadPosts, loadFriends]);

  const pickPostImg = async (f?: File | null) => {
    if (!f || f.size > MAX_ATTACHMENT_BYTES) return;
    setPostImg(await fileToDataUrl(f));
  };

  const publish = async () => {
    if (!postText.trim() && !postImg) return;
    try {
      const res = await fetch("/api/dating/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, text: postText.trim(), image: postImg }),
      });
      const json = (await res.json()) as { post?: DatingPost };
      if (json.post) setPosts((p) => [json.post!, ...p]);
      setPostText("");
      setPostImg("");
    } catch {
      /* ignore */
    }
  };

  const likePost = async (id: number) => {
    setPosts((p) => p.map((x) => (x.id === id ? { ...x, likes: x.likes + 1 } : x)));
    try {
      await fetch("/api/dating/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      /* ignore */
    }
  };

  const acceptFriend = async (from: string) => {
    await fetch("/api/dating/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: clientId, to: from, action: "accept" }),
    });
    loadFriends();
  };

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-28 pt-2">
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-300"
        >
          ←
        </button>
        <h2 className="text-lg font-bold text-white">Личный кабинет</h2>
        <button
          onClick={onEdit}
          className="ml-auto rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-3 py-1.5 text-xs font-semibold text-white"
        >
          ✏️ Редактировать
        </button>
      </div>

      {/* header card */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        {profile.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.photo} alt="" className="h-16 w-16 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl">
            {profile.gender === "female" ? "👩" : "👨"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-base font-bold text-white">
            {profile.name}, {profile.age}
            {profile.verified === 1 && <span title="Подтверждён">✔️</span>}
            {profile.premium === 1 && <span>👑</span>}
          </p>
          <p className="text-xs text-slate-400">📍 {profile.city || "—"}</p>
        </div>
      </div>

      {/* earnings */}
      <div className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-3">
        <p className="text-xs text-slate-400">Заработано (к выплате, 70%)</p>
        <p className="text-2xl font-bold text-amber-300">{earningsRub} ₽</p>
      </div>

      {/* gallery */}
      <Section title="📸 Мои фото">
        {gallery.length === 0 ? (
          <Empty>Добавьте фото в редакторе анкеты</Empty>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {gallery.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="aspect-square w-full rounded-xl object-cover" />
            ))}
          </div>
        )}
      </Section>

      {/* private 18+ */}
      {privates.length > 0 && (
        <Section title="🔞 Приватные фото (платно для других)">
          <div className="grid grid-cols-3 gap-2">
            {privates.map((src, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="aspect-square w-full rounded-xl object-cover" />
                <span className="absolute right-1 top-1 rounded-full bg-rose-500/90 px-1.5 text-[9px] font-bold text-white">
                  18+
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* videos */}
      {videos.length > 0 && (
        <Section title="🎬 Мои видео">
          <div className="space-y-2">
            {videos.map((src, i) => (
              <video key={i} src={src} controls className="w-full rounded-xl" preload="metadata" />
            ))}
          </div>
        </Section>
      )}

      {/* friends */}
      <Section title={`👥 Друзья (${friends.length})`}>
        {incoming.length > 0 && (
          <div className="mb-2 space-y-1">
            <p className="text-xs text-slate-400">Заявки в друзья:</p>
            {incoming.map((f) => (
              <div key={f} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5">
                <span className="flex-1 truncate text-sm text-slate-200">{f.slice(0, 12)}…</span>
                <button
                  onClick={() => acceptFriend(f)}
                  className="rounded-full bg-teal-400 px-3 py-1 text-xs font-semibold text-[#0b1020]"
                >
                  Принять
                </button>
              </div>
            ))}
          </div>
        )}
        {friends.length === 0 ? (
          <Empty>Пока нет друзей</Empty>
        ) : (
          <div className="flex flex-wrap gap-2">
            {friends.map((f) => (
              <span key={f} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                🤝 {f.slice(0, 10)}…
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* microblog */}
      <Section title="📝 Мой блог">
        <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-2.5">
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Поделитесь мыслями…"
            className="no-scrollbar w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
          {postImg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={postImg} alt="" className="mt-2 max-h-40 rounded-lg object-cover" />
          )}
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={postImgRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void pickPostImg(e.target.files?.[0])}
            />
            <button
              onClick={() => postImgRef.current?.click()}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-slate-200"
            >
              🖼️ Фото
            </button>
            <button
              onClick={() => void publish()}
              disabled={!postText.trim() && !postImg}
              className="ml-auto rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              Опубликовать
            </button>
          </div>
        </div>

        {posts.length === 0 ? (
          <Empty>Пока нет записей</Empty>
        ) : (
          <div className="space-y-2">
            {posts.map((p) => (
              <div key={p.id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                {p.text && (
                  <p className="whitespace-pre-wrap break-words text-sm text-slate-200">{p.text}</p>
                )}
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="mt-2 max-h-60 w-full rounded-lg object-cover" />
                )}
                <button
                  onClick={() => likePost(p.id)}
                  className="mt-2 flex items-center gap-1 text-xs text-pink-300"
                >
                  ❤️ {p.likes}
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 text-sm font-bold text-white">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-center text-xs text-slate-500">{children}</p>;
}
