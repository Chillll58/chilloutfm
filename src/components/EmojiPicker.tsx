"use client";

import { useState } from "react";

const CATEGORIES: { id: string; icon: string; emojis: string[] }[] = [
  {
    id: "smileys",
    icon: "😀",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","💩","🤡","👻","👽","🤖",
    ],
  },
  {
    id: "gestures",
    icon: "👍",
    emojis: [
      "👍","👎","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","✋","🤚","🖐️","🖖","👋","🤝","👏","🙌","👐","🤲","🙏","✍️","💪","🦾","👑","💅","🤳","💋","👀","👁️","🫶","🫰","🫵",
    ],
  },
  {
    id: "hearts",
    icon: "❤️",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️","💌","💯","💢","💥","💫","💦","💨","🔥","✨","⭐","🌟","💫","🌈",
    ],
  },
  {
    id: "music",
    icon: "🎵",
    emojis: [
      "🎵","🎶","🎼","🎧","🎤","🎸","🎹","🥁","🎷","🎺","🎻","🪕","📻","🔊","🔉","🔈","🔇","📢","📣","🎙️","🎚️","🎛️","💿","📀","🕺","💃","🪩","🎉","🎊","🥳",
    ],
  },
  {
    id: "nature",
    icon: "🌙",
    emojis: [
      "🌙","⭐","🌛","🌜","🌚","🌝","🌞","☀️","⛅","☁️","🌧️","⛈️","🌩️","❄️","☃️","🌊","🔥","🌸","🌼","🌺","🌷","🌹","🥀","🌻","🌴","🌲","🍀","🍃","🌿","🪴","🌍","🌌","🌠","🎆","🎇",
    ],
  },
  {
    id: "food",
    icon: "☕",
    emojis: [
      "☕","🍵","🧃","🥤","🍹","🍸","🍷","🍺","🍻","🥂","🍾","🥃","🍶","🧉","🍫","🍩","🍪","🎂","🍰","🧁","🍕","🍔","🍟","🌮","🍿","🍦","🍓","🍑","🍒","🍇","🍉","🍊",
    ],
  },
];

export default function EmojiPicker({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const [cat, setCat] = useState(CATEGORIES[0].id);
  const active = CATEGORIES.find((c) => c.id === cat) ?? CATEGORIES[0];

  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#131a30]">
      {/* category tabs */}
      <div className="flex items-center justify-between border-b border-white/10 px-2 py-1.5">
        <div className="flex gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg transition ${
                cat === c.id ? "bg-white/10" : "hover:bg-white/5"
              }`}
              aria-label={c.id}
            >
              {c.icon}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white/10"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>

      {/* emoji grid */}
      <div className="no-scrollbar grid max-h-44 grid-cols-8 gap-0.5 overflow-y-auto p-2">
        {active.emojis.map((e, i) => (
          <button
            key={`${e}-${i}`}
            onClick={() => onPick(e)}
            className="flex h-9 items-center justify-center rounded-lg text-xl transition hover:bg-white/10 active:scale-90"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
