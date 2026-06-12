import { getCache, persistCycle } from "./appData";
import type { CycleSettings } from "./cycle-types";
export type { CycleSettings };

export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal";

export interface CycleInfo {
  dayOfCycle: number; // 1-based
  phase: CyclePhase;
  nextPeriodDate: Date;
  daysUntilNextPeriod: number;
  cycleLength: number;
}

export const loadCycle = (): CycleSettings | null => getCache().cycle;
/** Returns cycle only if user tracks one (female). Hidden for male users. */
export const loadCycleForGender = (): CycleSettings | null => {
  const c = getCache();
  if (c.gender === "male") return null;
  return c.cycle;
};
export const saveCycle = (s: CycleSettings) => persistCycle(s);
export const clearCycle = () => persistCycle(null);

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const computeCycle = (settings: CycleSettings, now: Date = new Date()): CycleInfo => {
  const today = startOfDay(now);
  const start = startOfDay(new Date(settings.lastPeriodStart + "T00:00:00"));
  const len = Math.max(20, Math.min(45, Math.round(settings.cycleLength) || 28));

  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000);
  // If user logged a future "last period start", fall back to day 1
  const positiveDiff = diffDays < 0 ? 0 : diffDays;
  const dayOfCycle = (positiveDiff % len) + 1; // 1..len

  const phase: CyclePhase = phaseForDay(dayOfCycle, len);

  const cyclesElapsed = Math.floor(positiveDiff / len);
  const nextPeriodDate = new Date(start);
  nextPeriodDate.setDate(start.getDate() + (cyclesElapsed + 1) * len);
  const daysUntilNextPeriod = Math.ceil(
    (nextPeriodDate.getTime() - today.getTime()) / 86400000,
  );

  return { dayOfCycle, phase, nextPeriodDate, daysUntilNextPeriod, cycleLength: len };
};

/**
 * Phase boundaries are scaled from the canonical 28-day model so users with
 * shorter or longer cycles still get sensible guidance.
 *  - Menstrual: days 1..~7
 *  - Follicular: ~8..(ovulation-1)
 *  - Ovulation: 2 days centered on cycleLength - 14 (luteal phase ~14 days)
 *  - Luteal: rest until cycleLength
 */
export const phaseForDay = (day: number, cycleLength: number): CyclePhase => {
  const menstrualEnd = Math.max(4, Math.round((7 / 28) * cycleLength));
  const ovulationDay = Math.max(menstrualEnd + 2, cycleLength - 14);
  const ovulationStart = ovulationDay;
  const ovulationEnd = ovulationDay + 1;

  if (day <= menstrualEnd) return "menstrual";
  if (day < ovulationStart) return "follicular";
  if (day <= ovulationEnd) return "ovulation";
  return "luteal";
};

export const PHASE_META: Record<
  CyclePhase,
  { label: string; emoji: string; tagline: string; color: string; tips: string[] }
> = {
  menstrual: {
    label: "Menstrüel",
    emoji: "🌑",
    tagline: "Dinlenme ve yumuşaklık zamanı",
    color: "bg-earth-soft",
    tips: [
      "Enerji düşük olabilir, bu çok normal. Kendine alan tanı.",
      "Hafif yürüyüş ya da esneme dene; zorlamaya gerek yok.",
      "Demir açısından zengin besinler: yeşil yapraklılar, baklagiller.",
      "Demirin emilimi için yanına C vitamini ekle (limon, biber, portakal).",
    ],
  },
  follicular: {
    label: "Folliküler",
    emoji: "🌒",
    tagline: "Enerji yavaşça yükseliyor",
    color: "bg-sage-soft",
    tips: [
      "Yeni şeyler denemek, plan yapmak için iyi bir dönem.",
      "Daha yoğun antrenmanlar bu haftalarda daha iyi hissettirebilir.",
      "Proteine odaklan: yumurta, yoğurt, balık, baklagiller.",
      "Kendine küçük bir hedef koyabilirsin — büyük olmasına gerek yok.",
    ],
  },
  ovulation: {
    label: "Ovulasyon",
    emoji: "🌕",
    tagline: "Enerji ve ruh hali zirvede",
    color: "bg-sky-soft",
    tips: [
      "Sosyalleşmek ve hareket etmek için harika günler.",
      "Dengeli, besleyici beslen — renkli tabaklar dene.",
      "Bol su iç, lifli sebze ve meyveye yer aç.",
      "Bu enerjiyi kendine de ayır; küçük bir keyif planı yap.",
    ],
  },
  luteal: {
    label: "Luteal",
    emoji: "🌘",
    tagline: "Şefkat günleri — kendine yüklenme",
    color: "bg-accent",
    tips: [
      "İştah artışı, su tutma, ruh hali dalgalanmaları çok normal. Suçlu hissetme.",
      "Kompleks karbonhidrat: tam tahıllar, tatlı patates, yulaf.",
      "Magnezyumdan zengin besinler: balkabağı çekirdeği, koyu yeşillikler, bitter çikolata.",
      "Bol su ve hafif egzersiz — yoga ve yürüyüş çok iyi gelir.",
      "Erken yatmak bu dönemde özellikle değerli.",
    ],
  },
};

export const formatTrDate = (d: Date): string =>
  d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });