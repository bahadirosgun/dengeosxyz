import { type AppState, type Habit, dateKey, todayKey } from "./habits";
import { type CycleSettings, type CyclePhase, computeCycle, phaseForDay, PHASE_META } from "./cycle";

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Completion % over the last N days across all habits. */
export const weeklyCompletion = (state: AppState, days = 7): number => {
  if (state.habits.length === 0) return 0;
  const today = startOfDay(new Date());
  let possible = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dateKey(d);
    const log = state.logs[key];
    for (const h of state.habits) {
      const created = startOfDay(new Date(h.createdAt));
      if (d < created) continue;
      possible += 1;
      if (log?.completed.includes(h.id)) done += 1;
      else if (log?.frozen.includes(h.id)) {
        // joker: doesn't count for or against
        possible -= 1;
      }
    }
  }
  if (possible === 0) return 0;
  return Math.round((done / possible) * 100);
};

export interface HabitRate {
  habit: Habit;
  rate: number; // 0..100
  days: number; // how many days were possible
}

/** Per-habit completion rate over the lookback window. */
export const habitRates = (state: AppState, days = 14): HabitRate[] => {
  const today = startOfDay(new Date());
  return state.habits.map((h) => {
    let possible = 0;
    let done = 0;
    const created = startOfDay(new Date(h.createdAt));
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (d < created) continue;
      possible += 1;
      const log = state.logs[dateKey(d)];
      if (log?.completed.includes(h.id)) done += 1;
      else if (log?.frozen.includes(h.id)) possible -= 1;
    }
    return { habit: h, rate: possible === 0 ? 0 : Math.round((done / possible) * 100), days: possible };
  });
};

export interface PhaseAggregate {
  phase: CyclePhase;
  moodAvg: number | null;
  stressAvg: number | null;
  samples: number;
}

/**
 * Group historical mood/stress entries by the cycle phase they occurred in.
 * Requires CycleSettings; phase is computed by mapping each log date back
 * onto the user's cycle.
 */
export const moodByPhase = (
  state: AppState,
  cycle: CycleSettings,
): PhaseAggregate[] => {
  const start = startOfDay(new Date(cycle.lastPeriodStart + "T00:00:00"));
  const len = computeCycle(cycle).cycleLength;
  const buckets: Record<CyclePhase, { moods: number[]; stresses: number[] }> = {
    menstrual: { moods: [], stresses: [] },
    follicular: { moods: [], stresses: [] },
    ovulation: { moods: [], stresses: [] },
    luteal: { moods: [], stresses: [] },
  };
  for (const [key, log] of Object.entries(state.logs)) {
    if (log.mood === undefined && log.stress === undefined) continue;
    const d = startOfDay(new Date(key + "T00:00:00"));
    const diff = Math.floor((d.getTime() - start.getTime()) / 86400000);
    if (diff < 0) continue;
    const day = (diff % len) + 1;
    const phase = phaseForDay(day, len);
    if (log.mood !== undefined) buckets[phase].moods.push(log.mood);
    if (log.stress !== undefined) buckets[phase].stresses.push(log.stress);
  }
  return (Object.keys(buckets) as CyclePhase[]).map((p) => ({
    phase: p,
    moodAvg: buckets[p].moods.length ? avg(buckets[p].moods) : null,
    stressAvg: buckets[p].stresses.length ? avg(buckets[p].stresses) : null,
    samples: Math.max(buckets[p].moods.length, buckets[p].stresses.length),
  }));
};

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Pick a gentle insight sentence based on phase aggregates. */
export const phaseInsightMessage = (aggs: PhaseAggregate[]): string | null => {
  const withSamples = aggs.filter((a) => a.samples >= 2);
  if (withSamples.length < 2) return null;
  const stresses = withSamples.filter((a) => a.stressAvg !== null);
  if (stresses.length >= 2) {
    const highest = stresses.reduce((a, b) => ((b.stressAvg ?? 0) > (a.stressAvg ?? 0) ? b : a));
    if ((highest.stressAvg ?? 0) >= 3) {
      return `${PHASE_META[highest.phase].label} fazında stres seviyen genelde yükseliyor — bu çok yaygın. Kendine şefkat göster.`;
    }
  }
  const moods = withSamples.filter((a) => a.moodAvg !== null);
  if (moods.length >= 2) {
    const lowest = moods.reduce((a, b) => ((b.moodAvg ?? 5) < (a.moodAvg ?? 5) ? b : a));
    if ((lowest.moodAvg ?? 5) <= 3) {
      return `${PHASE_META[lowest.phase].label} fazında ruh halin biraz daha düşük seyrediyor. Bedenin yumuşaklığa hakkı var.`;
    }
  }
  return null;
};

/** Days in a row with at least one habit completed (any). */
export const activeDayStreak = (state: AppState): number => {
  let streak = 0;
  const today = startOfDay(new Date());
  for (let i = 0; i < 400; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const log = state.logs[dateKey(d)];
    if (log && log.completed.length > 0) streak += 1;
    else if (i === 0) continue;
    else break;
  }
  return streak;
};

export { todayKey };