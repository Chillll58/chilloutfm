"use client";

type Props = {
  type: string;
  url: string;
  name?: string | null;
};

export default function AttachmentView({ type, url, name }: Props) {
  if (type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name || "изображение"}
        className="mt-2 max-h-64 w-auto max-w-full rounded-xl object-cover"
      />
    );
  }

  if (type === "audio") {
    return (
      <audio
        controls
        src={url}
        className="mt-2 w-full max-w-[260px]"
        preload="metadata"
      />
    );
  }

  if (type === "video") {
    return (
      <video
        controls
        src={url}
        className="mt-2 max-h-72 w-full max-w-full rounded-xl"
        preload="metadata"
      />
    );
  }

  // generic file
  return (
    <a
      href={url}
      download={name || "file"}
      className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0 text-teal-300" fill="none">
        <path
          d="M14 3v5h5M14 3l5 5v11a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1h8z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      <span className="truncate">{name || "Файл"}</span>
      <svg viewBox="0 0 24 24" className="ml-auto h-4 w-4 flex-shrink-0 text-slate-400" fill="none">
        <path
          d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
