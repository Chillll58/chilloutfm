"use client";

export type TabId =
  | "player"
  | "playlist"
  | "news"
  | "chat"
  | "alarm"
  | "contacts";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "player",
    label: "Радио",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <path
          d="M12 3v18M8 7v10M16 7v10M4 10v4M20 10v4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "playlist",
    label: "Плейлист",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <path
          d="M4 6h11M4 12h11M4 18h7M17 17V9l4-1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="17" r="2" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: "news",
    label: "Новости",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <path
          d="M4 5h13v14H6a2 2 0 01-2-2V5zM17 8h2a1 1 0 011 1v8a2 2 0 01-2 2M7 8h7M7 12h7M7 16h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "chat",
    label: "Чат",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <path
          d="M4 5h16v11H9l-4 3V5z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "alarm",
    label: "Будильник",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 9v4l2.5 2M5 3L2 6M19 3l3 3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "contacts",
    label: "Контакты",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <path
          d="M4 5h16v14H4V5zM4 7l8 6 8-6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function BottomNav({
  active,
  onChange,
  badges,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
  badges?: Partial<Record<TabId, boolean>>;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b1020]/90 backdrop-blur-xl">
      <div
        className="mx-auto flex w-full max-w-md items-stretch justify-around px-1 sm:max-w-lg md:max-w-2xl lg:max-w-3xl md:px-8"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TABS.map((t) => {
          const on = active === t.id;
          const accent = false;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 px-0.5 py-2 transition-colors ${
                on
                  ? accent
                    ? "text-pink-400"
                    : "text-teal-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span
                className={`relative transition-transform ${
                  on ? "scale-110" : "scale-100"
                }`}
              >
                {t.icon}
                {badges?.[t.id] && (
                  <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#0b1020] bg-rose-500" />
                )}
              </span>
              <span className="text-[9px] font-medium leading-tight">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
