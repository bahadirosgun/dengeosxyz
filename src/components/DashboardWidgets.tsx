import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, Scale, Flame, Moon, Images, Footprints } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCache } from "@/lib/appData";
import { useDashboardWidgets, useGender } from "@/lib/useAppData";
import { computeCycle, loadCycleForGender, PHASE_META } from "@/lib/cycle";

type WidgetData = {
  todaySteps: number;
  weekActiveMin: number;
  lastWeight: number | null;
  weightTrend: number | null; // 7-day avg delta
};

type RingWidgetProps = {
  to: string;
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  progress: number;
  tone?: "sage" | "sky" | "earth" | "accent";
};

const clampPct = (value: number) => Math.max(0, Math.min(100, value));

function startOfWeekKey(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  // Monday as first day
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

export function DashboardWidgets() {
  const widgets = useDashboardWidgets();
  const gender = useGender();
  const [data, setData] = useState<WidgetData | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const userId = getCache().userId;
      if (!userId) return;
      const today = todayDateStr();
      const weekStart = startOfWeekKey();
      const [movRes, wRes] = await Promise.all([
        supabase
          .from("movement_entries")
          .select("date,steps,duration_minutes")
          .eq("user_id", userId)
          .gte("date", weekStart),
        supabase
          .from("weight_entries")
          .select("date,weight_kg")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(14),
      ]);
      const movRows = (movRes.data ?? []) as { date: string; steps: number | null; duration_minutes: number | null }[];
      const wRows = (wRes.data ?? []) as { date: string; weight_kg: number }[];
      const todaySteps = movRows.filter((r) => r.date === today).reduce((a, r) => a + (r.steps ?? 0), 0);
      const weekActiveMin = movRows.reduce((a, r) => a + (r.duration_minutes ?? 0), 0);
      const lastWeight = wRows[0]?.weight_kg ?? null;
      let weightTrend: number | null = null;
      if (wRows.length >= 2) {
        const recent = wRows.slice(0, 7);
        const older = wRows.slice(7, 14);
        if (recent.length && older.length) {
          const avg = (xs: { weight_kg: number }[]) => xs.reduce((s, r) => s + r.weight_kg, 0) / xs.length;
          weightTrend = avg(recent) - avg(older);
        }
      }
      if (active) setData({ todaySteps, weekActiveMin, lastWeight, weightTrend });
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!widgets.length) return null;

  const cards: { key: string; node: React.ReactNode }[] = [];

  for (const w of widgets) {
    if (w === "phase" && gender === "female") {
      const cyc = loadCycleForGender();
      if (cyc) {
        const info = computeCycle(cyc);
        const meta = PHASE_META[info.phase];
        cards.push({
          key: "phase",
          node: (
            <SmartRingWidget
              to="/dongu"
              icon={Moon}
              label="Faz"
              value={meta.label}
              sub={`${info.dayOfCycle}. gün`}
              progress={clampPct((info.dayOfCycle / 28) * 100)}
              tone="accent"
            />
          ),
        });
      }
    }
    if (w === "steps") {
      cards.push({
        key: "steps",
        node: (
          <SmartRingWidget
            to="/araclar/hareket"
            icon={Footprints}
            label="Bugün"
            value={(data?.todaySteps ?? 0).toLocaleString("tr-TR")}
            sub="adım"
            progress={clampPct(((data?.todaySteps ?? 0) / 8000) * 100)}
            tone="sage"
          />
        ),
      });
    }
    if (w === "movement") {
      cards.push({
        key: "movement",
        node: (
          <SmartRingWidget
            to="/araclar/hareket"
            icon={Activity}
            label="Hafta"
            value={`${data?.weekActiveMin ?? 0} dk`}
            sub="aktif zaman"
            progress={clampPct(((data?.weekActiveMin ?? 0) / 150) * 100)}
            tone="sky"
          />
        ),
      });
    }
    if (w === "weight") {
      cards.push({
        key: "weight",
        node: (
          <SmartRingWidget
            to="/araclar/tarti"
            icon={Scale}
            label="Ölçüm"
            value={data?.lastWeight != null ? `${data.lastWeight.toFixed(1)}` : "—"}
            sub={
              data?.weightTrend != null
                ? `${data.weightTrend > 0 ? "+" : ""}${data.weightTrend.toFixed(1)} eğilim`
                : "trend bekliyor"
            }
            progress={data?.lastWeight != null ? 64 : 18}
            tone="earth"
          />
        ),
      });
    }
    if (w === "habits") {
      const c = getCache();
      const today = todayDateStr();
      const log = c.logs[today];
      const done = log?.completed.length ?? 0;
      const total = c.habits.length;
      cards.push({
        key: "habits",
        node: (
          <SmartRingWidget
            to="/aliskanliklar"
            icon={Flame}
            label="Alışkanlık"
            value={`${done}/${total}`}
            sub="bugün"
            progress={total ? clampPct((done / total) * 100) : 0}
            tone="sage"
          />
        ),
      });
    }
    if (w === "journal") {
      cards.push({
        key: "journal",
        node: (
          <SmartRingWidget
            to="/gunce"
            icon={Images}
            label="Günce"
            value="Yeni"
            sub="fotoğraf + not"
            progress={35}
            tone="accent"
          />
        ),
      });
    }
    // "mood" is rendered inline in TodayScreen already (full picker), skip here.
  }

  if (cards.length === 0) return null;

  return (
    <section className="mt-6">
      <div className="mb-3 px-1">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
          Mini göstergeler
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Akıllı saat gibi, sadece bugünün sinyalleri.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.key}>{c.node}</div>
        ))}
      </div>
    </section>
  );
}

function SmartRingWidget({
  to,
  icon: Icon,
  label,
  value,
  sub,
  progress,
  tone = "sage",
}: RingWidgetProps) {
  const size = 76;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = clampPct(progress);
  const offset = c - (pct / 100) * c;
  const toneClass = {
    sage: "text-primary bg-sage-soft",
    sky: "text-sky bg-sky-soft",
    earth: "text-earth bg-earth-soft",
    accent: "text-[var(--tone)] bg-[var(--tone-soft)]",
  }[tone];

  return (
    <Link
      to={to}
      className="block rounded-[30px] bg-white/82 p-4 shadow-[0_16px_42px_rgba(46,74,56,0.09)] ring-1 ring-border transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-xl font-semibold tracking-[-0.04em] text-foreground">
            {value}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>
        </div>
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              className={toneClass.split(" ")[0]}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <span
            className={`absolute inset-[13px] grid place-items-center rounded-full ${toneClass}`}
          >
            <Icon size={18} strokeWidth={2.2} />
          </span>
        </div>
      </div>
    </Link>
  );
}
