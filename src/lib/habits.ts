import {
  getCache,
  persistAppState,
  persistOnboarded,
} from "./appData";
import type { AppState, DayLog, Habit, HabitCategory } from "./habits-types";

export type { AppState, DayLog, Habit, HabitCategory };

export const FREEZES_PER_WEEK = 2;

export const todayKey = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const dateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const weekKey = (d: Date = new Date()): string => {
  // ISO-ish week key based on Monday
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // 0 = Monday
  date.setUTCDate(date.getUTCDate() - dayNum);
  return dateKey(date);
};

export const HABIT_SUGGESTIONS: Record<HabitCategory, string[]> = {
  Kilo: [
    "Her öğüne protein ekle",
    "Günde 30 dk yürü",
    "Tabağın yarısı sebze olsun",
    "Şekerli içecek yerine su",
    "Yavaş ve farkında ye",
  ],
  Stres: [
    "5 dk nefes egzersizi",
    "1 dakikalık günlük yaz",
    "10 dk esneme/yoga",
    "Ekransız 15 dk dışarı",
    "Uyumadan önce telefonu bırak",
  ],
  Genel: [
    "8 bardak su",
    "7+ saat uyu",
    "Magnezyumdan zengin besin",
  ],
};

export const addHabit = (
  state: AppState,
  data: { name: string; category: HabitCategory; trigger?: string },
): AppState => ({
  ...state,
  habits: [
    ...state.habits,
    {
      id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: data.name.trim(),
      category: data.category,
      trigger: data.trigger?.trim() || undefined,
      createdAt: new Date().toISOString(),
    },
  ],
});

export const updateHabit = (
  state: AppState,
  id: string,
  data: Partial<Pick<Habit, "name" | "category" | "trigger">>,
): AppState => ({
  ...state,
  habits: state.habits.map((h) =>
    h.id === id
      ? {
          ...h,
          ...data,
          trigger: data.trigger === "" ? undefined : (data.trigger ?? h.trigger),
        }
      : h,
  ),
});

export const deleteHabit = (state: AppState, id: string): AppState => ({
  ...state,
  habits: state.habits.filter((h) => h.id !== id),
  logs: Object.fromEntries(
    Object.entries(state.logs).map(([k, log]) => [
      k,
      {
        ...log,
        completed: log.completed.filter((x) => x !== id),
        frozen: log.frozen.filter((x) => x !== id),
      },
    ]),
  ),
});

export const isOnboarded = (): boolean => {
  return getCache().onboarded;
};

export const markOnboarded = () => {
  persistOnboarded(true);
};

export const resetOnboarding = () => {
  persistOnboarded(false);
};

export const replaceHabits = (
  state: AppState,
  picks: { name: string; category: HabitCategory }[],
): AppState => {
  const now = new Date().toISOString();
  return {
    ...state,
    habits: picks.map((p, i) => ({
      id: `h_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      name: p.name.trim(),
      category: p.category,
      createdAt: now,
    })),
    logs: {},
  };
};

export const loadState = (): AppState => {
  const c = getCache();
  return {
    habits: c.habits,
    logs: c.logs,
    weekFreezeUsage: c.weekFreezeUsage,
    startDate: c.startDate,
  };
};

export const saveState = (s: AppState) => {
  persistAppState(s);
};

/**
 * Forgiving streak.
 * Walk back day by day from today. For each day:
 *  - completed -> increment
 *  - frozen    -> skip (chain pauses, doesn't break)
 *  - missed    -> stop
 * Today doesn't have to be completed to keep the chain alive.
 */
export const computeStreak = (state: AppState, habitId: string): number => {
  let streak = 0;
  const today = new Date();
  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit) return 0;
  const habitStart = new Date(habit.createdAt);
  habitStart.setHours(0, 0, 0, 0);

  for (let i = 0; i < 400; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    if (d < habitStart) break;
    const key = dateKey(d);
    const log = state.logs[key];
    const completed = log?.completed.includes(habitId);
    const frozen = log?.frozen.includes(habitId);
    if (completed) {
      streak += 1;
      continue;
    }
    if (frozen) {
      // pause: no break, no increment
      continue;
    }
    // Today not yet done -> skip without breaking
    if (i === 0) continue;
    break;
  }
  return streak;
};

export const ensureTodayLog = (state: AppState): AppState => {
  const key = todayKey();
  if (state.logs[key]) return state;
  return {
    ...state,
    logs: {
      ...state.logs,
      [key]: { date: key, completed: [], frozen: [] },
    },
  };
};

export const freezesRemaining = (state: AppState): number => {
  const used = state.weekFreezeUsage[weekKey()] ?? 0;
  return Math.max(0, FREEZES_PER_WEEK - used);
};

export const daysSinceStart = (state: AppState): number => {
  const start = new Date(state.startDate);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return Math.max(1, diff + 1);
};

/**
 * Longest streak for a habit. Iterates only logged days, treating gaps
 * between consecutive logs as missed runs. O(L log L) where L = #log days.
 * Forgiving: frozen pauses (no break, no increment); today missing is OK.
 */
export const computeLongestStreak = (state: AppState, habitId: string): number => {
  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit) return 0;
  const startDay = new Date(habit.createdAt);
  startDay.setHours(0, 0, 0, 0);
  const startMs = startDay.getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const tk = todayKey();

  const keys = Object.keys(state.logs)
    .filter((k) => {
      const t = new Date(k + "T00:00:00").getTime();
      return t >= startMs && t <= todayMs;
    })
    .sort();

  let best = 0;
  let current = 0;
  let lastMs: number | null = null;
  for (const k of keys) {
    const dayMs = new Date(k + "T00:00:00").getTime();
    if (lastMs !== null && dayMs - lastMs > 86400000) {
      current = 0;
    }
    const log = state.logs[k]!;
    if (log.completed.includes(habitId)) {
      current += 1;
      if (current > best) best = current;
    } else if (log.frozen.includes(habitId)) {
      // pause: keep current
    } else if (k !== tk) {
      current = 0;
    }
    lastMs = dayMs;
  }
  return best;
};

export type DayStatus = "completed" | "frozen" | "missed" | "pending" | "future" | "before";

export const dayStatusForHabit = (
  state: AppState,
  habitId: string,
  d: Date,
): DayStatus => {
  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit) return "before";
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(habit.createdAt);
  start.setHours(0, 0, 0, 0);
  if (day > today) return "future";
  if (day < start) return "before";
  const log = state.logs[dateKey(day)];
  if (log?.completed.includes(habitId)) return "completed";
  if (log?.frozen.includes(habitId)) return "frozen";
  if (day.getTime() === today.getTime()) return "pending";
  return "missed";
};