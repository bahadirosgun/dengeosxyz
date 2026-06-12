import { supabase } from "@/integrations/supabase/client";
import type { Habit, AppState, HabitCategory, DayLog } from "./habits-types";
import type { CycleSettings } from "./cycle-types";
import type { JournalEntry } from "./journal-types";
import type { ReminderSettings } from "./reminder-types";

/**
 * Central in-memory mirror of all user data. Everything is loaded once after
 * sign-in by AuthGate, then components read/write through the legacy sync
 * APIs (loadState/saveState/loadCycle/...). Mutations diff against the cache
 * and fire async Supabase writes; reads return cached data synchronously so
 * existing components don't need to be rewritten as async.
 */

const initialReminder: ReminderSettings = { enabled: false, time: "20:00" };

export type Gender = "female" | "male";
export type WidgetKey =
  | "steps"
  | "movement"
  | "weight"
  | "habits"
  | "phase"
  | "mood"
  | "journal";
export const DEFAULT_WIDGETS: WidgetKey[] = [
  "steps",
  "movement",
  "weight",
  "habits",
  "phase",
  "mood",
  "journal",
];

interface Cache {
  loaded: boolean;
  userId: string | null;
  habits: Habit[];
  logs: Record<string, DayLog>;
  weekFreezeUsage: Record<string, number>;
  startDate: string;
  onboarded: boolean;
  onboardingComplete: boolean;
  gender: Gender;
  dashboardWidgets: WidgetKey[];
  cycle: CycleSettings | null;
  reminder: ReminderSettings;
  journal: JournalEntry[];
}

const cache: Cache = {
  loaded: false,
  userId: null,
  habits: [],
  logs: {},
  weekFreezeUsage: {},
  startDate: new Date().toISOString(),
  onboarded: false,
  onboardingComplete: false,
  gender: "female",
  dashboardWidgets: [...DEFAULT_WIDGETS],
  cycle: null,
  reminder: { ...initialReminder },
  journal: [],
};

const listeners = new Set<() => void>();
export const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const emit = () => listeners.forEach((l) => l());

export const getCache = () => cache;
export const isCacheLoaded = () => cache.loaded;

export const resetCache = () => {
  cache.loaded = false;
  cache.userId = null;
  cache.habits = [];
  cache.logs = {};
  cache.weekFreezeUsage = {};
  cache.startDate = new Date().toISOString();
  cache.onboarded = false;
  cache.onboardingComplete = false;
  cache.gender = "female";
  cache.dashboardWidgets = [...DEFAULT_WIDGETS];
  cache.cycle = null;
  cache.reminder = { ...initialReminder };
  cache.journal = [];
  emit();
};

const swallow = (label: string) => (res: unknown) => {
  if (
    res &&
    typeof res === "object" &&
    "error" in res &&
    (res as { error: unknown }).error
  ) {
    console.error(`[appData] ${label}`, (res as { error: unknown }).error);
  }
};

export async function loadAllForUser(userId: string): Promise<void> {
  cache.userId = userId;
  const [profRes, habitsRes, logsRes, weeksRes, cycRes, journalRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("habits").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("day_logs").select("*").eq("user_id", userId),
    supabase.from("week_freeze_usage").select("*").eq("user_id", userId),
    supabase.from("cycle_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("journal_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);

  // Ensure profile exists (in case trigger missed for some reason).
  let prof = profRes.data;
  if (!prof) {
    const { data } = await supabase
      .from("profiles")
      .insert({ id: userId })
      .select("*")
      .maybeSingle();
    prof = data;
  }

  cache.habits = (habitsRes.data ?? []).map((h) => ({
    id: h.id,
    name: h.name,
    category: h.category as HabitCategory,
    trigger: h.trigger ?? undefined,
    createdAt: h.created_at,
  }));
  cache.logs = {};
  for (const l of logsRes.data ?? []) {
    cache.logs[l.date] = {
      date: l.date,
      completed: Array.isArray(l.completed) ? (l.completed as string[]) : [],
      frozen: Array.isArray(l.frozen) ? (l.frozen as string[]) : [],
      mood: l.mood ?? undefined,
      stress: l.stress ?? undefined,
    };
  }
  cache.weekFreezeUsage = {};
  for (const w of weeksRes.data ?? []) cache.weekFreezeUsage[w.week_key] = w.used;
  cache.startDate = prof?.start_date ?? new Date().toISOString();
  cache.onboarded = prof?.onboarded ?? false;
  cache.onboardingComplete = prof?.onboarding_complete ?? false;
  cache.gender = (prof?.gender as Gender | undefined) ?? "female";
  const widgets = prof?.dashboard_widgets;
  cache.dashboardWidgets = Array.isArray(widgets)
    ? (widgets as WidgetKey[]).filter((w): w is WidgetKey =>
        DEFAULT_WIDGETS.includes(w as WidgetKey),
      )
    : [...DEFAULT_WIDGETS];
  cache.reminder = {
    enabled: prof?.reminder_enabled ?? false,
    time: prof?.reminder_time ?? "20:00",
  };
  cache.cycle = cycRes.data
    ? {
        lastPeriodStart: cycRes.data.last_period_start,
        cycleLength: cycRes.data.cycle_length,
      }
    : null;
  cache.journal = (journalRes.data ?? []).map((e) => ({
    id: e.id,
    date: e.created_at,
    prompt: e.prompt,
    text: e.text,
  }));
  cache.loaded = true;
  emit();
}

// ---------------- Habits ----------------

const habitDiff = (a: Habit, b: Habit) =>
  a.name !== b.name || a.category !== b.category || (a.trigger ?? null) !== (b.trigger ?? null);

export function persistAppState(next: AppState): void {
  const userId = cache.userId;
  if (!userId) return;
  const prevHabitsById = new Map(cache.habits.map((h) => [h.id, h]));
  const nextHabitsById = new Map(next.habits.map((h) => [h.id, h]));

  // upsert new / changed habits
  for (const h of next.habits) {
    const prev = prevHabitsById.get(h.id);
    if (!prev || habitDiff(prev, h)) {
      supabase
        .from("habits")
        .upsert({
          id: h.id,
          user_id: userId,
          name: h.name,
          category: h.category,
          trigger: h.trigger ?? null,
          created_at: h.createdAt,
        })
        .then(swallow("upsert habit"));
    }
  }
  // delete removed habits
  for (const h of cache.habits) {
    if (!nextHabitsById.has(h.id)) {
      supabase.from("habits").delete().eq("id", h.id).then(swallow("delete habit"));
    }
  }

  // day logs diff
  for (const [date, log] of Object.entries(next.logs)) {
    const prev = cache.logs[date];
    const changed =
      !prev ||
      JSON.stringify(prev.completed) !== JSON.stringify(log.completed) ||
      JSON.stringify(prev.frozen) !== JSON.stringify(log.frozen) ||
      prev.mood !== log.mood ||
      prev.stress !== log.stress;
    // skip pushing brand-new empty logs (the "ensureTodayLog" placeholder)
    const empty =
      log.completed.length === 0 &&
      log.frozen.length === 0 &&
      log.mood === undefined &&
      log.stress === undefined;
    if (changed && !(empty && !prev)) {
      supabase
        .from("day_logs")
        .upsert({
          user_id: userId,
          date,
          completed: log.completed,
          frozen: log.frozen,
          mood: log.mood ?? null,
          stress: log.stress ?? null,
        })
        .then(swallow("upsert day_log"));
    }
  }

  // week freeze diff
  for (const [wk, used] of Object.entries(next.weekFreezeUsage)) {
    if (cache.weekFreezeUsage[wk] !== used) {
      supabase
        .from("week_freeze_usage")
        .upsert({ user_id: userId, week_key: wk, used })
        .then(swallow("upsert week_freeze"));
    }
  }

  cache.habits = next.habits;
  cache.logs = next.logs;
  cache.weekFreezeUsage = next.weekFreezeUsage;
  cache.startDate = next.startDate;
  emit();
}

// ---------------- Onboarding ----------------

export function persistOnboarded(value: boolean): void {
  cache.onboarded = value;
  const userId = cache.userId;
  if (!userId) return;
  supabase
    .from("profiles")
    .update({ onboarded: value, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .then(swallow("update onboarded"));
  emit();
}

// ---------------- Gender / Onboarding-complete / Widgets ----------------

export function persistGender(value: Gender): void {
  cache.gender = value;
  const userId = cache.userId;
  if (!userId) return;
  supabase
    .from("profiles")
    .update({ gender: value, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .then(swallow("update gender"));
  emit();
}

export function persistOnboardingComplete(value: boolean): void {
  cache.onboardingComplete = value;
  const userId = cache.userId;
  if (!userId) return;
  supabase
    .from("profiles")
    .update({ onboarding_complete: value, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .then(swallow("update onboarding_complete"));
  emit();
}

export function persistDashboardWidgets(value: WidgetKey[]): void {
  cache.dashboardWidgets = value;
  const userId = cache.userId;
  if (!userId) return;
  supabase
    .from("profiles")
    .update({ dashboard_widgets: value, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .then(swallow("update dashboard_widgets"));
  emit();
}

// ---------------- Cycle ----------------

export function persistCycle(value: CycleSettings | null): void {
  cache.cycle = value;
  const userId = cache.userId;
  if (!userId) return;
  if (value) {
    supabase
      .from("cycle_settings")
      .upsert({
        user_id: userId,
        last_period_start: value.lastPeriodStart,
        cycle_length: value.cycleLength,
        updated_at: new Date().toISOString(),
      })
      .then(swallow("upsert cycle"));
  } else {
    supabase
      .from("cycle_settings")
      .delete()
      .eq("user_id", userId)
      .then(swallow("delete cycle"));
  }
  emit();
}

// ---------------- Reminder ----------------

export function persistReminder(value: ReminderSettings): void {
  cache.reminder = value;
  const userId = cache.userId;
  if (!userId) return;
  supabase
    .from("profiles")
    .update({
      reminder_enabled: value.enabled,
      reminder_time: value.time,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .then(swallow("update reminder"));
  emit();
}

// ---------------- Journal ----------------

export function persistJournalAdd(entry: JournalEntry): void {
  cache.journal = [entry, ...cache.journal];
  const userId = cache.userId;
  if (!userId) return;
  supabase
    .from("journal_entries")
    .insert({
      id: entry.id,
      user_id: userId,
      prompt: entry.prompt,
      text: entry.text,
      created_at: entry.date,
    })
    .then(swallow("insert journal"));
  emit();
}

export function persistJournalDelete(id: string): void {
  cache.journal = cache.journal.filter((e) => e.id !== id);
  const userId = cache.userId;
  if (userId) {
    supabase.from("journal_entries").delete().eq("id", id).then(swallow("delete journal"));
  }
  emit();
}

// ---------------- Migration from localStorage ----------------

export interface LocalDataSnapshot {
  state: AppState | null;
  cycle: CycleSettings | null;
  journal: JournalEntry[];
  reminder: ReminderSettings | null;
}

const LS_KEYS = {
  state: "zincir-state-v1",
  cycle: "zincir-cycle-v1",
  journal: "zincir-journal-v1",
  reminder: "zincir-reminder-v1",
  onboarded: "zincir-onboarding-v1",
};

export function readLocalSnapshot(): LocalDataSnapshot {
  const snap: LocalDataSnapshot = { state: null, cycle: null, journal: [], reminder: null };
  if (typeof window === "undefined") return snap;
  try {
    const s = window.localStorage.getItem(LS_KEYS.state);
    if (s) snap.state = JSON.parse(s);
  } catch {}
  try {
    const c = window.localStorage.getItem(LS_KEYS.cycle);
    if (c) snap.cycle = JSON.parse(c);
  } catch {}
  try {
    const j = window.localStorage.getItem(LS_KEYS.journal);
    if (j) snap.journal = JSON.parse(j);
  } catch {}
  try {
    const r = window.localStorage.getItem(LS_KEYS.reminder);
    if (r) snap.reminder = JSON.parse(r);
  } catch {}
  return snap;
}

export function hasLocalData(): boolean {
  const s = readLocalSnapshot();
  return !!(s.state?.habits?.length || s.cycle || s.journal.length || s.reminder);
}

export function clearLocalData(): void {
  if (typeof window === "undefined") return;
  for (const k of Object.values(LS_KEYS)) window.localStorage.removeItem(k);
  window.localStorage.removeItem("zincir-reminder-last-v1");
}

export async function importLocalToCloud(): Promise<void> {
  const userId = cache.userId;
  if (!userId) return;
  const snap = readLocalSnapshot();

  if (snap.state) {
    if (snap.state.habits?.length) {
      await supabase.from("habits").upsert(
        snap.state.habits.map((h) => ({
          id: h.id,
          user_id: userId,
          name: h.name,
          category: h.category,
          trigger: h.trigger ?? null,
          created_at: h.createdAt,
        })),
      );
    }
    const logEntries = Object.values(snap.state.logs ?? {});
    if (logEntries.length) {
      await supabase.from("day_logs").upsert(
        logEntries.map((l) => ({
          user_id: userId,
          date: l.date,
          completed: l.completed ?? [],
          frozen: l.frozen ?? [],
          mood: l.mood ?? null,
          stress: l.stress ?? null,
        })),
      );
    }
    const weekRows = Object.entries(snap.state.weekFreezeUsage ?? {}).map(([week_key, used]) => ({
      user_id: userId,
      week_key,
      used: used as number,
    }));
    if (weekRows.length) {
      await supabase.from("week_freeze_usage").upsert(weekRows);
    }
    if (snap.state.startDate) {
      await supabase
        .from("profiles")
        .update({ start_date: snap.state.startDate, updated_at: new Date().toISOString() })
        .eq("id", userId);
    }
  }
  if (snap.cycle) {
    await supabase.from("cycle_settings").upsert({
      user_id: userId,
      last_period_start: snap.cycle.lastPeriodStart,
      cycle_length: snap.cycle.cycleLength,
      updated_at: new Date().toISOString(),
    });
  }
  if (snap.journal.length) {
    await supabase.from("journal_entries").upsert(
      snap.journal.map((e) => ({
        id: e.id,
        user_id: userId,
        prompt: e.prompt,
        text: e.text,
        created_at: e.date,
      })),
    );
  }
  if (snap.reminder) {
    await supabase
      .from("profiles")
      .update({
        reminder_enabled: snap.reminder.enabled,
        reminder_time: snap.reminder.time,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  }

  // mark onboarded if local data had habits — user has been using the app
  if (snap.state?.habits?.length) {
    await supabase
      .from("profiles")
      .update({ onboarded: true, updated_at: new Date().toISOString() })
      .eq("id", userId);
  }

  await loadAllForUser(userId);
  clearLocalData();
}