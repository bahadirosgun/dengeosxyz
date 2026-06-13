import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Trophy, Snowflake, Check, X, Settings as SettingsIcon, Leaf } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  type AppState,
  computeLongestStreak,
  computeStreak,
  dateKey,
  dayStatusForHabit,
  loadState,
  todayKey,
} from "@/lib/habits";
import { type CycleSettings, computeCycle, loadCycle } from "@/lib/cycle";
import { getPhilosophyRitualsForDay, loadPhilosophyRituals } from "@/lib/philosophyRituals";
import { useGender } from "@/lib/useAppData";

const monthNames = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export function CalendarScreen() {
  const [state, setState] = useState<AppState | null>(null);
  const [habitId, setHabitId] = useState<string | null>(null);
  const [cycle, setCycle] = useState<CycleSettings | null>(null);
  const gender = useGender();
  const [view, setView] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    const s = loadState();
    setState(s);
    if (s.habits[0]) setHabitId(s.habits[0].id);
    setCycle(loadCycle());
  }, []);

  if (!state) return null;

  if (state.habits.length === 0) {
    return (
      <div className="mx-auto max-w-md px-5 pt-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Takvim</h1>
        <p className="mt-4 rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
          Henüz hiç alışkanlığın yok. Önce "Alışkanlıklar" sekmesinden bir tane ekle.
        </p>
      </div>
    );
  }

  const habit = state.habits.find((h) => h.id === habitId) ?? state.habits[0];
  const currentStreak = computeStreak(state, habit.id);
  const longestStreak = computeLongestStreak(state, habit.id);

  const goPrev = () =>
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }));
  const goNext = () =>
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }));

  const cells = buildMonthGrid(view.year, view.month);
  const cycleMap =
    cycle && gender === "female"
      ? cycleMarksForMonth(cycle, view.year, view.month)
      : {};
  const ritualMap = loadPhilosophyRituals();

  const tk = todayKey();

  return (
    <div className="mx-auto max-w-md px-5 pt-8">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Takvim</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Zincirini koru — kaçırdığın bir gün ilerlemeni silmez.
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

      {/* Habit selector */}
      <div className="mb-4 -mx-1 overflow-x-auto">
        <div className="flex gap-2 px-1 pb-1">
          {state.habits.map((h) => (
            <button
              key={h.id}
              onClick={() => {
                setHabitId(h.id);
                setSelectedDay(null);
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                h.id === habit.id
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card text-foreground ring-border"
              }`}
            >
              {h.name}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <section className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-card p-4 ring-1 ring-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame size={13} className="text-flame" /> Mevcut zincir
          </div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {currentStreak} <span className="text-sm font-normal text-muted-foreground">gün</span>
          </div>
        </div>
        <div className="rounded-3xl bg-card p-4 ring-1 ring-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Trophy size={13} className="text-primary" /> En uzun zincir
          </div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {longestStreak} <span className="text-sm font-normal text-muted-foreground">gün</span>
          </div>
        </div>
      </section>

      {/* Month nav */}
      <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={goPrev}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Önceki ay"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-base font-semibold text-foreground">
            {monthNames[view.month]} {view.year}
          </h2>
          <button
            onClick={goNext}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Sonraki ay"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
          {weekDays.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} />;
            const status = dayStatusForHabit(state, habit.id, cell);
            const key = dateKey(cell);
            const isToday = key === tk;
            const isSelected = key === selectedDay;
            const cycleMark = cycleMap[key];
            const hasRitual = (ritualMap[key]?.length ?? 0) > 0;
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(key)}
                className={`relative aspect-square rounded-xl text-sm transition ${
                  status === "completed"
                    ? "bg-primary text-primary-foreground"
                    : status === "frozen"
                      ? "bg-sky-soft text-foreground"
                      : status === "pending"
                        ? "bg-card text-foreground ring-1 ring-primary/40"
                        : status === "missed"
                          ? "bg-background text-muted-foreground ring-1 ring-border"
                          : "bg-muted/40 text-muted-foreground/40"
                } ${isToday ? "ring-2 ring-primary" : ""} ${
                  isSelected ? "scale-105 outline outline-2 outline-foreground/30" : ""
                }`}
                disabled={status === "future" || status === "before"}
              >
                <span>{cell.getDate()}</span>
                {status === "frozen" && (
                  <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-sky" />
                )}
                {hasRitual && (
                  <span
                    className="absolute bottom-1 right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-sage-soft text-primary ring-1 ring-white/80"
                    title="Ritim günü"
                  >
                    <Leaf size={9} />
                  </span>
                )}
                {cycleMark && (
                  <span
                    className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${
                      cycleMark === "period" ? "bg-destructive" : "bg-destructive/40"
                    }`}
                    title={cycleMark === "period" ? "Adet" : "Tahmini adet"}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-primary" /> Tamamlandı
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-card ring-1 ring-primary/40" /> Bugün — bekleniyor
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-background ring-1 ring-border" /> Boş
          </span>
          <span className="flex items-center gap-1.5">
            <span className="relative h-3 w-3 rounded-md bg-sky-soft">
              <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-sky" />
            </span>
            Joker
          </span>
          <span className="flex items-center gap-1.5">
            <span className="grid h-3 w-3 place-items-center rounded-full bg-sage-soft text-primary">
              <Leaf size={8} />
            </span>
            Ritim kartı
          </span>
          {cycle && gender === "female" && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-destructive" /> Adet
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-destructive/40" /> Tahmini
              </span>
            </>
          )}
        </div>
      </section>

      {/* Day detail */}
      {selectedDay && (
        <DayDetail
          state={state}
          dayKey={selectedDay}
          onClose={() => setSelectedDay(null)}
        />
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Boş günler bir başarısızlık değil. Yarın yeni bir gün. 🌿
      </p>
    </div>
  );
}

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const firstWeekday = (first.getDay() + 6) % 7; // 0 = Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Returns dateKey -> "period" | "predicted" for the given month, derived
 * from the user's cycle settings. Past period weeks are marked "period";
 * future occurrences within the month are marked "predicted".
 */
function cycleMarksForMonth(
  cycle: CycleSettings,
  year: number,
  month: number,
): Record<string, "period" | "predicted"> {
  const out: Record<string, "period" | "predicted"> = {};
  const info = computeCycle(cycle);
  const len = info.cycleLength;
  const periodLen = Math.max(4, Math.round((7 / 28) * len));
  const start = new Date(cycle.lastPeriodStart + "T00:00:00");
  start.setHours(0, 0, 0, 0);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find first cycle start <= monthStart
  const diffDays = Math.floor((monthStart.getTime() - start.getTime()) / 86400000);
  let cycleIdx = Math.floor(diffDays / len);
  if (cycleIdx < 0) cycleIdx = 0;

  for (let i = cycleIdx; i < cycleIdx + 3; i++) {
    const periodStart = new Date(start);
    periodStart.setDate(start.getDate() + i * len);
    for (let d = 0; d < periodLen; d++) {
      const day = new Date(periodStart);
      day.setDate(periodStart.getDate() + d);
      if (day < monthStart || day > monthEnd) continue;
      const k = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      out[k] = day > today ? "predicted" : "period";
    }
  }
  return out;
}

function DayDetail({
  state,
  dayKey,
  onClose,
}: {
  state: AppState;
  dayKey: string;
  onClose: () => void;
}) {
  const log = state.logs[dayKey];
  const rituals = getPhilosophyRitualsForDay(dayKey);
  const date = new Date(dayKey + "T00:00:00");
  const label = date.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const rows = useMemo(() => {
    return state.habits.map((h) => {
      const completed = log?.completed.includes(h.id) ?? false;
      const frozen = log?.frozen.includes(h.id) ?? false;
      const created = new Date(h.createdAt);
      created.setHours(0, 0, 0, 0);
      const beforeStart = date < created;
      return { h, completed, frozen, beforeStart };
    });
  }, [state, log, date]);

  return (
    <section className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-border">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">{label}</h3>
          {log?.mood !== undefined && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ruh hali: {["😞","😕","😐","🙂","😊"][log.mood - 1]} · Stres: {log.stress ?? "—"}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Kapat"
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X size={16} />
        </button>
      </div>

      {rituals.length > 0 && (
        <div className="mb-3 rounded-2xl bg-sage-soft p-3 ring-1 ring-border">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Leaf size={14} className="text-primary" />
            {rituals.map((r) => r.title).join(" + ")} günü
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground/70">
            Bu gün bir felsefe kartı ritme çevrildi. Alışkanlıklar ve günlük notu o kartın
            hikayesinden beslendi.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {rows.map(({ h, completed, frozen, beforeStart }) => (
          <li
            key={h.id}
            className="flex items-center gap-3 rounded-2xl bg-background p-3 ring-1 ring-border"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full ${
                completed
                  ? "bg-primary text-primary-foreground"
                  : frozen
                    ? "bg-sky-soft text-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {completed ? <Check size={14} /> : frozen ? <Snowflake size={14} /> : <X size={12} />}
            </span>
            <span className="flex-1 text-sm text-foreground">{h.name}</span>
            <span className="text-[11px] text-muted-foreground">
              {beforeStart
                ? "henüz eklenmemişti"
                : completed
                  ? "tamamlandı"
                  : frozen
                    ? "joker"
                    : "atlandı"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
