import { useEffect, useState } from "react";
import { Flame, Check, Snowflake, Heart, Zap, Settings as SettingsIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  type AppState,
  type HabitCategory,
  computeStreak,
  ensureTodayLog,
  freezesRemaining,
  isOnboarded,
  loadState,
  saveState,
  todayKey,
  weekKey,
  daysSinceStart,
  FREEZES_PER_WEEK,
} from "@/lib/habits";
import { PHASE_META, computeCycle, loadCycle, type CycleSettings } from "@/lib/cycle";
import { Onboarding } from "./Onboarding";
import { startReminderLoop } from "@/lib/reminder";
import { useGender } from "@/lib/useAppData";
import { getCache } from "@/lib/appData";
import { DashboardWidgets } from "./DashboardWidgets";
import { QuickAddFab } from "./QuickAddFab";

const moodEmojis = ["😞", "😕", "😐", "🙂", "😊"];

const categoryStyles: Record<HabitCategory, string> = {
  Kilo: "bg-sage-soft text-foreground",
  Stres: "bg-sky-soft text-foreground",
  Genel: "bg-earth-soft text-foreground",
};

const greetingForHour = (h: number) => {
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
};

const formatDate = (d: Date) =>
  d.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export function TodayScreen() {
  const [state, setState] = useState<AppState | null>(null);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const [pauseMessage, setPauseMessage] = useState<string | null>(null);
  const [cycle, setCycle] = useState<CycleSettings | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const gender = useGender();

  useEffect(() => {
    const s = ensureTodayLog(loadState());
    setState(s);
    saveState(s);
    setCycle(loadCycle());
    const needsOnboarding = !isOnboarded() || !getCache().onboardingComplete;
    if (needsOnboarding) setOnboarding(true);
    const stop = startReminderLoop();
    return stop;
  }, []);

  const update = (next: AppState) => {
    setState(next);
    saveState(next);
  };

  if (!state) return null;

  if (onboarding) {
    return (
      <Onboarding
        state={state}
        onComplete={(next) => {
          const withLog = ensureTodayLog(next);
          setState(withLog);
          saveState(withLog);
          setCycle(loadCycle());
          setOnboarding(false);
        }}
      />
    );
  }

  const today = todayKey();
  const todayLog = state.logs[today]!;
  const remainingFreezes = freezesRemaining(state);

  const completedCount = todayLog.completed.length;
  const totalCount = state.habits.length;
  const dayNum = Math.min(daysSinceStart(state), 66);
  const ringPct = (dayNum / 66) * 100;

  const toggleComplete = (habitId: string) => {
    if (todayLog.completed.includes(habitId)) {
      // uncomplete (allowed before celebrating)
      const next = {
        ...state,
        logs: {
          ...state.logs,
          [today]: {
            ...todayLog,
            completed: todayLog.completed.filter((id) => id !== habitId),
          },
        },
      };
      update(next);
      return;
    }
    const next = {
      ...state,
      logs: {
        ...state.logs,
        [today]: {
          ...todayLog,
          completed: [...todayLog.completed, habitId],
          frozen: todayLog.frozen.filter((id) => id !== habitId),
        },
      },
    };
    update(next);
    setCelebratingId(habitId);
    setTimeout(() => setCelebratingId(null), 800);
  };

  const useFreeze = (habitId: string) => {
    // Toggle off → refund the joker for this week.
    if (todayLog.frozen.includes(habitId)) {
      const wk = weekKey();
      const used = state.weekFreezeUsage[wk] ?? 0;
      const next: AppState = {
        ...state,
        logs: {
          ...state.logs,
          [today]: {
            ...todayLog,
            frozen: todayLog.frozen.filter((id) => id !== habitId),
          },
        },
        weekFreezeUsage: { ...state.weekFreezeUsage, [wk]: Math.max(0, used - 1) },
      };
      update(next);
      return;
    }
    const wk = weekKey();
    const used = state.weekFreezeUsage[wk] ?? 0;
    if (used >= FREEZES_PER_WEEK) {
      setPauseMessage(
        "Duraklatıldı, yarın kaldığın yerden devam et. Bu hafta jokerlerin doldu — hiç sorun değil. 🌱",
      );
      setTimeout(() => setPauseMessage(null), 4500);
      return;
    }
    const next: AppState = {
      ...state,
      logs: {
        ...state.logs,
        [today]: {
          ...todayLog,
          frozen: [...todayLog.frozen, habitId],
        },
      },
      weekFreezeUsage: { ...state.weekFreezeUsage, [wk]: used + 1 },
    };
    update(next);
  };

  const setMood = (m: number) => {
    const newMood = todayLog.mood === m ? undefined : m;
    update({
      ...state,
      logs: { ...state.logs, [today]: { ...todayLog, mood: newMood } },
    });
  };

  const setStress = (s: number) => {
    const newStress = todayLog.stress === s ? undefined : s;
    update({
      ...state,
      logs: { ...state.logs, [today]: { ...todayLog, stress: newStress } },
    });
  };

  const now = new Date();
  const greeting = greetingForHour(now.getHours());

  return (
    <div className="mx-auto max-w-md px-5 pt-8">
      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-primary">DengeOS</p>
          <p className="mt-1 text-sm text-muted-foreground">{formatDate(now)}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{greeting}</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Önce küçük bir adım. Kalanı gün içinde akar.
          </p>
        </div>
        <Link
          to="/ayarlar"
          aria-label="Ayarlar"
          className="mt-1 rounded-full bg-card p-2.5 text-muted-foreground ring-1 ring-border hover:text-foreground"
        >
          <SettingsIcon size={18} />
        </Link>
      </header>

      {/* 66-day ring */}
      <ProgressRing
        day={dayNum}
        pct={ringPct}
        completed={completedCount}
        total={totalCount}
        freezes={remainingFreezes}
      />

      {/* Cycle card — only for users tracking a cycle */}
      {gender === "female" && <CycleCard settings={cycle} />}

      {/* Habits */}
      <section className="mt-5">
        <div className="mb-3 flex items-end justify-between px-1">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Bugünün adımları
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tamamla ya da jokerle duraklat; ikisi de akışın parçası.
            </p>
          </div>
          <Link to="/aliskanliklar" className="text-xs font-medium text-primary">
            Düzenle
          </Link>
        </div>
        <div className="space-y-3">
          {state.habits.map((h) => {
            const done = todayLog.completed.includes(h.id);
            const frozen = todayLog.frozen.includes(h.id);
            const streak = computeStreak(state, h.id);
            const celebrating = celebratingId === h.id;
            return (
              <article
                key={h.id}
                className={`rounded-3xl border border-border bg-card p-4 shadow-sm transition ${
                  celebrating ? "animate-celebrate" : ""
                } ${done ? "opacity-90" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${categoryStyles[h.category]}`}
                      >
                        {h.category}
                      </span>
                      {frozen && !done && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-soft px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                          <Snowflake size={11} /> Bugün duraklatıldı
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1.5 text-lg font-medium leading-snug text-foreground">
                      {h.name}
                    </h3>
                    {h.trigger && (
                      <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                        <Zap size={11} className="mt-[3px] shrink-0 text-primary" />
                        <span>
                          <span className="italic">{h.trigger}</span> → bunu yap
                        </span>
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Flame size={15} className="text-flame" />
                      <span>{streak} günlük zincir</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => toggleComplete(h.id)}
                      data-sound={done ? "tap" : "success"}
                      aria-label="Tamamla"
                      className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition ${
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
                      }`}
                    >
                      <Check size={22} strokeWidth={done ? 3 : 2} />
                    </button>
                    {!done && (
                      <button
                        onClick={() => useFreeze(h.id)}
                        className={`inline-flex items-center gap-1 text-[11px] font-medium hover:text-primary ${
                          frozen ? "text-sky" : "text-muted-foreground"
                        }`}
                      >
                        <Snowflake size={11} /> {frozen ? "Jokeri geri al" : "Joker"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {pauseMessage && (
        <div className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-md rounded-2xl bg-card p-4 text-sm text-foreground shadow-lg ring-1 ring-border">
          {pauseMessage}
        </div>
      )}

      {/* Mood */}
      <section className="mt-8 rounded-3xl bg-card p-5 ring-1 ring-border">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Heart size={16} className="text-primary" /> Bugün nasıl hissediyorsun?
        </h2>
        <div className="mt-3 flex items-center justify-between">
          {moodEmojis.map((emo, i) => {
            const value = i + 1;
            const selected = todayLog.mood === value;
            return (
              <button
                key={emo}
                onClick={() => setMood(value)}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition ${
                  selected ? "scale-110 bg-sage-soft" : "hover:bg-muted"
                }`}
                aria-label={`Ruh hali ${value}`}
              >
                {emo}
              </button>
            );
          })}
        </div>
      </section>

      {/* Stress */}
      <section className="mt-4 rounded-3xl bg-card p-5 ring-1 ring-border">
        <h2 className="text-base font-semibold text-foreground">Stres seviyen</h2>
        <p className="mt-1 text-xs text-muted-foreground">1 = çok sakin · 5 = çok yoğun</p>
        <div className="mt-3 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((v) => {
            const selected = todayLog.stress === v;
            return (
              <button
                key={v}
                onClick={() => setStress(v)}
                className={`h-11 flex-1 rounded-2xl text-sm font-medium transition ${
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-sky-soft"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      </section>

      {/* Customizable home widgets */}
      <DashboardWidgets />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Küçük adımlar büyük değişimler yaratır.
      </p>

      <QuickAddFab />
    </div>
  );
}

function CycleCard({ settings }: { settings: CycleSettings | null }) {
  if (!settings) {
    return (
      <Link
        to="/dongu"
        className="mt-4 flex items-center justify-between rounded-3xl bg-card p-4 ring-1 ring-border"
      >
        <div>
          <p className="text-sm font-medium text-foreground">🌙 Döngünü takip et</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Fazına göre nazik ipuçları al — istersen sonra da ekleyebilirsin.
          </p>
        </div>
        <span className="text-xs font-medium text-primary">Başla →</span>
      </Link>
    );
  }
  const info = computeCycle(settings);
  const meta = PHASE_META[info.phase];
  return (
    <Link to="/dongu" className={`mt-4 block rounded-3xl ${meta.color} p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-foreground/70">
            {meta.emoji} {meta.label}
          </p>
          <p className="mt-0.5 text-base font-semibold text-foreground">
            Döngünün {info.dayOfCycle}. günü
          </p>
          <p className="mt-0.5 text-xs text-foreground/80">{meta.tagline}</p>
        </div>
        <span className="rounded-full bg-card/70 px-3 py-1.5 text-[11px] font-medium text-foreground">
          {info.daysUntilNextPeriod === 0 ? "bugün" : `${info.daysUntilNextPeriod} gün`}
        </span>
      </div>
    </Link>
  );
}

function ProgressRing({
  day,
  pct,
  completed,
  total,
  freezes,
}: {
  day: number;
  pct: number;
  completed: number;
  total: number;
  freezes: number;
}) {
  const size = 132;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <section className="rounded-3xl bg-card p-5 ring-1 ring-border">
      <div className="flex items-center gap-5">
        <div className="relative" style={{ width: size, height: size }}>
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
              stroke="var(--primary)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold text-foreground">{day}</span>
            <span className="text-[11px] text-muted-foreground">/ 66 gün</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-foreground">
            <span className="font-medium">
              {completed}/{total}
            </span>{" "}
            alışkanlık bugün tamamlandı.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Bir alışkanlık ortalama 66 günde otomatikleşir. Acele yok.
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sky-soft px-2.5 py-1 text-[11px] font-medium text-foreground">
            ❄️ {freezes} bağışlama jokerin var
          </p>
        </div>
      </div>
    </section>
  );
}
