"use client";

import { useCallback, useEffect, useState } from "react";

type Payment = {
  id: number;
  payerClientId: string;
  targetProfileId: number;
  kind: string;
  amount: number;
  earnerShare: number;
  platformShare: number;
  status: string;
  createdAt: string;
};

type Earner = {
  id: number;
  name: string;
  photo: string;
  earned: number;
  paidOut: number;
  balance: number;
};

type Summary = {
  totalGross: number;
  totalPlatform: number;
  totalEarner: number;
  totalPaidOut: number;
  toPayOut: number;
};

const KIND_LABEL: Record<string, string> = {
  tip: "💝 Чаевые",
  private: "🔒 Приват",
  call: "📞 Телефон",
  top: "🚀 Топ",
  premium: "👑 Премиум",
};

export default function AdminPanel({
  adminKey,
  onBack,
}: {
  adminKey: string;
  onBack: () => void;
}) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [earners, setEarners] = useState<Earner[]>([]);
  const [tab, setTab] = useState<"stats" | "payments" | "payouts">("stats");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dating/admin", {
        headers: { "x-admin-key": adminKey },
        cache: "no-store",
      });
      const json = await res.json();
      if (json.ok) {
        setSummary(json.summary);
        setPayments(json.payments ?? []);
        setEarners(json.earners ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    load();
  }, [load]);

  const payout = async (e: Earner) => {
    const val = window.prompt(
      `Выплата для ${e.name}. К выплате: ${e.balance}₽.\nСумма выплаты:`,
      String(e.balance)
    );
    const amount = Number(val);
    if (!amount || amount < 1) return;
    await fetch("/api/dating/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({ profileId: e.id, amount, note: "выплата" }),
    });
    window.alert(
      `Отметил выплату ${amount}₽ для ${e.name}.\nПереведите деньги на её/его реквизиты вручную через YooMoney.`
    );
    load();
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
        <h2 className="text-lg font-bold text-white">🛡 Админ-панель</h2>
        <button
          onClick={load}
          className="ml-auto rounded-full bg-white/5 px-3 py-1.5 text-xs text-slate-300"
        >
          ⟳ Обновить
        </button>
      </div>

      {/* tabs */}
      <div className="mb-3 flex gap-1.5 rounded-full border border-white/10 bg-white/5 p-1 text-sm">
        {[
          ["stats", "📊 Сводка"],
          ["payments", "💰 Платежи"],
          ["payouts", "💸 Выплаты"],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k as typeof tab)}
            className={`flex-1 rounded-full py-1.5 font-medium transition ${
              tab === k
                ? "bg-gradient-to-r from-teal-400 to-purple-500 text-[#0b1020]"
                : "text-slate-300"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">Загрузка…</p>
      ) : tab === "stats" && summary ? (
        <div className="space-y-3">
          <Stat label="💵 Всего получено" value={summary.totalGross} big />
          <div className="grid grid-cols-2 gap-3">
            <Stat label="🏦 Моя прибыль" value={summary.totalPlatform} accent="teal" />
            <Stat label="👥 Исполнителям (70%)" value={summary.totalEarner} accent="pink" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="✅ Выплачено" value={summary.totalPaidOut} accent="slate" />
            <Stat label="⏳ К выплате" value={summary.toPayOut} accent="amber" />
          </div>
          <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
            Все платежи поступают на ваш кошелёк YooMoney. «Моя прибыль» — ваша
            доля (30% с услуг + 100% с продвижения/премиума). «К выплате» —
            сколько нужно перевести исполнителям.
          </p>
        </div>
      ) : tab === "payments" ? (
        <div className="space-y-2">
          {payments.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Платежей пока нет</p>
          ) : (
            payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    {KIND_LABEL[p.kind] ?? p.kind} · {p.amount}₽
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    от {p.payerClientId.slice(0, 12)}… ·{" "}
                    {new Date(p.createdAt).toLocaleString("ru-RU")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    p.status === "paid"
                      ? "bg-emerald-400/20 text-emerald-300"
                      : "bg-amber-400/20 text-amber-300"
                  }`}
                >
                  {p.status === "paid" ? "оплачен" : "ожидание"}
                </span>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {earners.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Нет заработков для выплаты
            </p>
          ) : (
            earners.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5"
              >
                {e.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.photo} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                    👤
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{e.name}</p>
                  <p className="text-[11px] text-slate-400">
                    Заработано {e.earned}₽ · выплачено {e.paidOut}₽
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-300">{e.balance}₽</p>
                  <button
                    onClick={() => payout(e)}
                    disabled={e.balance < 1}
                    className="mt-1 rounded-full bg-gradient-to-r from-teal-400 to-purple-500 px-3 py-1 text-[11px] font-semibold text-[#0b1020] disabled:opacity-40"
                  >
                    Выплатить
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  big,
  accent = "white",
}: {
  label: string;
  value: number;
  big?: boolean;
  accent?: string;
}) {
  const color =
    accent === "teal"
      ? "text-teal-300"
      : accent === "pink"
        ? "text-pink-300"
        : accent === "amber"
          ? "text-amber-300"
          : accent === "slate"
            ? "text-slate-300"
            : "text-white";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`font-bold ${big ? "text-3xl" : "text-xl"} ${color}`}>
        {value.toLocaleString("ru-RU")} ₽
      </p>
    </div>
  );
}
