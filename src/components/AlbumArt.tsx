"use client";

import { useEffect, useState } from "react";

type Props = {
  src?: string;
  alt: string;
  className?: string;
  rounded?: string;
  spinning?: boolean;
};

const isPlaceholder = (s?: string) =>
  !s || s.includes("nocover") || s.trim() === "";

export default function AlbumArt({
  src,
  alt,
  className = "",
  rounded = "rounded-3xl",
  spinning = false,
}: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showFallback = failed || isPlaceholder(src);

  return (
    <div
      className={`relative overflow-hidden ${rounded} ${className} bg-gradient-to-br from-teal-500/30 via-purple-500/30 to-pink-500/30`}
    >
      {showFallback ? (
        <div
          className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-600/40 via-indigo-600/40 to-pink-600/40 ${
            spinning ? "spin-slow" : ""
          }`}
        >
          <span className="text-5xl opacity-80">🎧</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`h-full w-full object-cover ${spinning ? "spin-slow" : ""}`}
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
