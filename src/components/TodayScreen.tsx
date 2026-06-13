import { type CSSProperties, useEffect, useState } from "react";
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
  Kilo: "bg-[var(--tone-soft)] text-foreground",
  Stres: "bg-sky-soft text-foreground",
  Genel: "bg-sage-soft text-foreground",
};

const toneByGender = {
  female: {
    heroImage: "/assets/wellness/women-wellness.png",
    accent: "#d98591",
    accentSoft: "#f7dee1",
    accentTint: "#fff3f4",
    accentDeep: "#9f5661",
    kicker: "Kadın modu",
    title: "Nazik bir ritim kur.",
    copy: "Bugün bedenini dinleyen küçük bir adım yeter. Yemek, stres ve günce tek akışta.",
    nextTitle: "Nefes",
    nextText: "Akşamdan önce 4 dakika yavaşlama",
    flowTitle: "Nazik program",
    flowText: "Döngü, enerji ve alışkanlıklar aynı gün akışında birleşir.",
    sectionLead: "Tamamla ya da jokerle duraklat; ikisi de akışın parçası.",
  },
  male: {
    heroImage: "/assets/wellness/men-wellness.png",
    accent: "#5b95c2",
    accentSoft: "#dcecf7",
    accentTint: "#f1f8fd",
    accentDeep: "#386b91",
    kicker: "Erkek modu",
    title: "Güne net akış ver.",
    copy: "Su, yürüyüş, yemek ve odak molası sade bir planda birleşsin.",
    nextTitle: "Yürüyüş",
    nextText: "Öğleden sonra 20 dakika açık hava",
    flowTitle: "Net program",
    flowText: "Enerji, odak ve toparlanma tek ekranda sadeleşir.",
    sectionLead: "Günün temposuna göre seç, tamamla ya da nazikçe duraklat.",
  },
} as const;

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
  const tone = toneByGender[gender];
  const toneStyle = {
    "--tone": tone.accent,
    "--tone-soft": tone.accentSoft,
    "--tone-tint": tone.accentTint,
    "--tone-deep": tone.accentDeep,
  } as CSSProperties;

  return (
    <div
      className="mx-auto min-h-dvh max-w-md px-4 pt-5"
      style={toneStyle}
      data-gender={gender}
    >
      <header className="mb-5 flex min-h-14 items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative grid h-11 w-11 place-items-center rounded-[18px] bg-white shadow-[0_14px_34px_rgba(46,74,56,0.12)] ring-1 ring-white/80">
            <span className="absolute left-[19px] top-[10px] h-6 w-3 rotate-[18deg] rounded-[100%_0_100%_0] bg-primary" />
            <span className="absolute left-[12px] top-[19px] h-5 w-3 -rotate-[62deg] rounded-[100%_0_100%_0] bg-[var(--primary-dark)]" />
          </div>
          <div>
            <p className="text-lg font-semibold leading-none tracking-tight text-foreground">
              DengeOS
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDate(now)}</p>
          </div>
        </div>
        <Link
          to="/ayarlar"
          aria-label="Ayarlar"
          className="grid h-11 w-11 place-items-center rounded-[18px] bg-white/80 text-muted-foreground shadow-[0_12px_34px_rgba(46,74,56,0.08)] ring-1 ring-border transition hover:text-foreground"
        >
          <SettingsIcon size={18} />
        </Link>
      </header>

      <section className="rounded-[34px] bg-white/75 p-3 shadow-[0_26px_70px_rgba(46,74,56,0.14)] ring-1 ring-border">
        <div className="relative min-h-[314px] overflow-hidden rounded-[28px] bg-[var(--tone-tint)]">
          <img
            src={tone.heroImage}
            alt="DengeOS günlük yaşam görseli"
            className="absolute inset-0 h-full w-full scale-[1.02] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.02] via-foreground/20 to-foreground/75" />
          <div className="absolute inset-x-5 bottom-5 text-white">
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-white/20 px-3 text-xs font-semibold backdrop-blur-md before:h-2 before:w-2 before:rounded-full before:bg-[var(--tone-soft)] before:content-['']">
              {tone.kicker}
            </span>
            <h1 className="mt-3 max-w-[9.5ch] text-[42px] font-semibold leading-[0.92] tracking-[-0.055em]">
              {tone.title}
            </h1>
            <p className="mt-3 max-w-[30ch] text-sm leading-relaxed text-white/90">
              {tone.copy}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-[1.05fr_0.95fr] gap-2.5">
          <div className="rounded-[26px] bg-sage-soft p-4 ring-1 ring-border">
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {completedCount}/{totalCount}
            </p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              Bugünkü alışkanlıklar tamamlandı
            </p>
          </div>
          <div className="rounded-[26px] bg-sage-soft p-4 ring-1 ring-border">
            <p className="text-xl font-semibold tracking-tight text-foreground">
              {tone.nextTitle}
            </p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              {tone.nextText}
            </p>
          </div>
        </div>
      </section>

      {/* Cycle card — only for users tracking a cycle */}
      {gender === "female" && <CycleCard settings={cycle} />}

      {/* Habits */}
      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between px-1">
          <div>
            <h2 className="text-2xl font-semibold leading-none tracking-[-0.04em] text-foreground">
              Bugün ne iyi gelir?
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{tone.sectionLead}</p>
          </div>
          <Link to="/aliskanliklar" className="text-xs font-medium text-primary">
            Düzenle
          </Link>
        </div>
        <div className="space-y-2.5">
          {state.habits.map((h) => {
            const done = todayLog.completed.includes(h.id);
            const frozen = todayLog.frozen.includes(h.id);
            const streak = computeStreak(state, h.id);
            const celebrating = celebratingId === h.id;
            return (
              <article
                key={h.id}
                className={`rounded-[28px] border border-border bg-white/80 p-2.5 shadow-[0_14px_36px_rgba(46,74,56,0.08)] transition ${
                  celebrating ? "animate-celebrate" : ""
                } ${done ? "opacity-90" : ""}`}
              >
                <div className="grid grid-cols-[84px_1fr_auto] items-center gap-3">
                  <HabitVisual category={h.category} done={done} frozen={frozen} />
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
                    <h3 className="mt-1.5 text-base font-semibold leading-snug text-foreground">
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
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Flame size={14} className="text-[var(--tone)]" />
                      <span>{streak} günlük zincir</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 pr-1">
                    <button
                      onClick={() => toggleComplete(h.id)}
                      data-sound={done ? "tap" : "success"}
                      aria-label="Tamamla"
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-[var(--tone-soft)] bg-background text-muted-foreground hover:border-[var(--tone)] hover:text-[var(--tone)]"
                      }`}
                    >
                      <Check size={19} strokeWidth={done ? 3 : 2} />
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

      <ProgressRing
        day={dayNum}
        pct={ringPct}
        completed={completedCount}
        total={totalCount}
        freezes={remainingFreezes}
        title={tone.flowTitle}
        text={tone.flowText}
      />

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

function HabitVisual({
  category,
  done,
  frozen,
}: {
  category: HabitCategory;
  done: boolean;
  frozen: boolean;
}) {
  const kind = category === "Kilo" ? "meal" : category === "Stres" ? "breathe" : "story";
  return (
    <div
      className={`relative h-[84px] overflow-hidden rounded-[22px] bg-[var(--tone-tint)] ring-1 ring-white/80 ${
        done ? "bg-sage-soft" : ""
      }`}
      aria-hidden="true"
    >
      {kind === "meal" && (
        <>
          <span className="absolute left-4 top-8 h-9 w-[58px] rounded-b-[32px] rounded-t-xl border-[5px] border-white/80 bg-[#fff7ea] shadow-[0_13px_24px_rgba(46,74,56,0.12)]" />
          <span className="absolute left-[38px] top-6 h-4 w-4 rounded-full bg-[var(--tone)] shadow-[-16px_8px_0_var(--sage),16px_9px_0_#e7c774]" />
        </>
      )}
      {kind === "breathe" && (
        <>
          <span className="absolute left-5 top-4 h-[52px] w-[52px] animate-[breathe_4.8s_ease-in-out_infinite] rounded-full border-[9px] border-[var(--tone)]/60" />
          <span className="absolute left-3 right-3 top-[42px] h-0.5 bg-foreground/20" />
        </>
      )}
      {kind === "story" && (
        <>
          <span className="absolute left-3.5 top-3.5 h-[58px] w-12 -rotate-[7deg] rounded-2xl bg-white shadow-[22px_8px_0_rgba(255,255,255,0.78),0_12px_26px_rgba(46,74,56,0.12)]" />
          <span className="absolute left-[31px] top-[34px] h-[18px] w-[18px] rounded-full bg-[var(--tone)] shadow-[26px_7px_0_var(--sage)]" />
        </>
      )}
      {frozen && (
        <span className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-sky shadow-sm">
          <Snowflake size={14} />
        </span>
      )}
      {done && (
        <span className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-primary text-white shadow-sm">
          <Check size={14} strokeWidth={3} />
        </span>
      )}
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
  title,
  text,
}: {
  day: number;
  pct: number;
  completed: number;
  total: number;
  freezes: number;
  title: string;
  text: string;
}) {
  const size = 58;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <section className="mt-8 rounded-[32px] bg-[var(--primary-dark)] p-5 text-white shadow-[0_24px_60px_rgba(46,74,56,0.2)]">
      <div className="grid grid-cols-[1fr_auto] items-start gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.04em]">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/70">{text}</p>
        </div>
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--tone-soft)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-semibold text-white">{day}</span>
            <span className="text-[9px] text-white/65">/66</span>
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <div className="grid grid-cols-[58px_1fr] items-center gap-3">
          <span className="rounded-full bg-white/12 px-2 py-1.5 text-center text-xs font-semibold text-white/75">
            şimdi
          </span>
          <div>
            <p className="text-sm font-semibold">{completed}/{total} alışkanlık</p>
            <p className="mt-0.5 text-xs text-white/65">Bugünkü küçük adımlar</p>
          </div>
        </div>
        <div className="grid grid-cols-[58px_1fr] items-center gap-3">
          <span className="rounded-full bg-white/12 px-2 py-1.5 text-center text-xs font-semibold text-white/75">
            66
          </span>
          <div>
            <p className="text-sm font-semibold">Acele yok</p>
            <p className="mt-0.5 text-xs text-white/65">
              Bir alışkanlık ortalama 66 günde otomatikleşir
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[58px_1fr] items-center gap-3">
          <span className="rounded-full bg-white/12 px-2 py-1.5 text-center text-xs font-semibold text-white/75">
            {freezes}
          </span>
          <div>
            <p className="text-sm font-semibold">Bağışlama jokeri</p>
            <p className="mt-0.5 text-xs text-white/65">Durmak da akışın parçası</p>
          </div>
        </div>
      </div>
    </section>
  );
}
