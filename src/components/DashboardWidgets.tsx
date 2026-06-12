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
            <Link
              to="/dongu"
              className={`rounded-2xl ${meta.color} p-3 ring-1 ring-border`}
            >
              <p className="text-[11px] text-foreground/70">
                <Moon size={11} className="-mt-0.5 mr-1 inline" /> Faz
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {meta.emoji} {meta.label}
              </p>
              <p className="text-[11px] text-foreground/70">{info.dayOfCycle}. gün</p>
            </Link>
          ),
        });
      }
    }
    if (w === "steps") {
      cards.push({
        key: "steps",
        node: (
          <Link to="/araclar/hareket" className="rounded-2xl bg-sage-soft p-3 ring-1 ring-border">
            <p className="text-[11px] text-foreground/70">
              <Footprints size={11} className="-mt-0.5 mr-1 inline" /> Bugün
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {data?.todaySteps?.toLocaleString("tr-TR") ?? "—"}
            </p>
            <p className="text-[11px] text-foreground/70">adım</p>
          </Link>
        ),
      });
    }
    if (w === "movement") {
      cards.push({
        key: "movement",
        node: (
          <Link to="/araclar/hareket" className="rounded-2xl bg-sky-soft p-3 ring-1 ring-border">
            <p className="text-[11px] text-foreground/70">
              <Activity size={11} className="-mt-0.5 mr-1 inline" /> Hafta
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {data?.weekActiveMin ?? 0} dk
            </p>
            <p className="text-[11px] text-foreground/70">aktif zaman</p>
          </Link>
        ),
      });
    }
    if (w === "weight") {
      cards.push({
        key: "weight",
        node: (
          <Link to="/araclar/tarti" className="rounded-2xl bg-earth-soft p-3 ring-1 ring-border">
            <p className="text-[11px] text-foreground/70">
              <Scale size={11} className="-mt-0.5 mr-1 inline" /> Tartı
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {data?.lastWeight != null ? `${data.lastWeight.toFixed(1)}` : "—"}
              <span className="ml-1 text-xs font-normal text-foreground/70">kg</span>
            </p>
            <p className="text-[11px] text-foreground/70">
              {data?.weightTrend != null
                ? `${data.weightTrend > 0 ? "+" : ""}${data.weightTrend.toFixed(1)} eğilim`
                : "trend bekliyor"}
            </p>
          </Link>
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
          <Link to="/aliskanliklar" className="rounded-2xl bg-card p-3 ring-1 ring-border">
            <p className="text-[11px] text-foreground/70">
              <Flame size={11} className="-mt-0.5 mr-1 inline text-flame" /> Alışkanlık
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {done}/{total}
            </p>
            <p className="text-[11px] text-foreground/70">bugün</p>
          </Link>
        ),
      });
    }
    if (w === "journal") {
      cards.push({
        key: "journal",
        node: (
          <Link to="/gunce" className="rounded-2xl bg-accent p-3 ring-1 ring-border">
            <p className="text-[11px] text-foreground/70">
              <Images size={11} className="-mt-0.5 mr-1 inline" /> Günce
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">Yeni kayıt</p>
            <p className="text-[11px] text-foreground/70">fotoğraf + not</p>
          </Link>
        ),
      });
    }
    // "mood" is rendered inline in TodayScreen already (full picker), skip here.
  }

  if (cards.length === 0) return null;

  return (
    <section className="mt-4">
      <div className="grid grid-cols-2 gap-2">
        {cards.map((c) => (
          <div key={c.key}>{c.node}</div>
        ))}
      </div>
    </section>
  );
}