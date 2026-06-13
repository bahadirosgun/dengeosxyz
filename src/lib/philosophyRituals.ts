const STORAGE_KEY = "dengeos.philosophy.days.v1";

export type PhilosophyRitualDay = {
  id: string;
  title: string;
  origin: "Japon" | "Çin";
  date: string;
};

const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function loadPhilosophyRituals(): Record<string, PhilosophyRitualDay[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PhilosophyRitualDay[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getPhilosophyRitualsForDay(day: string): PhilosophyRitualDay[] {
  return loadPhilosophyRituals()[day] ?? [];
}

export function getTodayPhilosophyRituals(): PhilosophyRitualDay[] {
  return getPhilosophyRitualsForDay(dateKey());
}

export function recordPhilosophyRitual(input: {
  id: string;
  title: string;
  origin: "Japon" | "Çin";
  date?: string;
}): { ok: true } | { ok: false; existing: PhilosophyRitualDay } {
  if (typeof window === "undefined") return { ok: true };
  const day = input.date ?? dateKey();
  const all = loadPhilosophyRituals();
  const prev = all[day] ?? [];
  const existing = prev[0];
  if (existing) return { ok: false, existing };
  all[day] = [{ ...input, date: day }];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return { ok: true };
}
