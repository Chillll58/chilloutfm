"use client";

export default function SplashScreen({ ready }: { ready: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-[#0b1020] transition-all duration-700 ${
        ready ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden={ready}
    >
      <div className="relative flex flex-col items-center">
        <div className="absolute h-40 w-40 rounded-full bg-teal-500/20 blur-3xl" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt="ChilloutFM"
          className="relative h-24 w-24 rounded-[28px] shadow-2xl shadow-purple-500/20 ring-1 ring-white/10"
        />
        <h1 className="mt-5 text-2xl font-black tracking-tight text-white">
          Chillout<span className="text-teal-300">FM</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">интернет радио для настроения</p>
        <div className="mt-6 flex items-end gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="eq-bar h-6 w-1 rounded-full bg-teal-300"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
