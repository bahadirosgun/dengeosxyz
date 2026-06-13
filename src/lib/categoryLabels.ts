import type { HabitCategory } from "./habits-types";

export const habitCategoryLabels: Record<HabitCategory, string> = {
  Kilo: "Beslenme",
  Stres: "Sakinlik",
  Genel: "Rutin",
};

export const habitCategoryDescriptions: Record<HabitCategory, string> = {
  Kilo: "Dengeli öğün, su ve sürdürülebilir seçimler",
  Stres: "Nefes, gevşeme ve kendine alan açma",
  Genel: "Uyku, su ve günlük temel bakım",
};

export const habitCategoryLabel = (category: HabitCategory) => habitCategoryLabels[category];
