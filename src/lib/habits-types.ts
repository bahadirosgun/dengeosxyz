export type HabitCategory = "Kilo" | "Stres" | "Genel";

export interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  createdAt: string;
  trigger?: string;
}

export interface DayLog {
  date: string;
  completed: string[];
  frozen: string[];
  mood?: number;
  stress?: number;
}

export interface AppState {
  habits: Habit[];
  logs: Record<string, DayLog>;
  weekFreezeUsage: Record<string, number>;
  startDate: string;
}