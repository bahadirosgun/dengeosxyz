import { useEffect, useState } from "react";
import {
  DEFAULT_WIDGETS,
  getCache,
  subscribe,
  type Gender,
  type WidgetKey,
} from "./appData";

export function useAppCacheTick(): number {
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = subscribe(() => setTick((t) => t + 1));
    return () => {
      unsub();
    };
  }, []);
  return 0;
}

export function useGender(): Gender {
  useAppCacheTick();
  return getCache().gender;
}

export function useDashboardWidgets(): WidgetKey[] {
  useAppCacheTick();
  const w = getCache().dashboardWidgets;
  return w.length ? w : DEFAULT_WIDGETS;
}

export function useOnboardingComplete(): boolean {
  useAppCacheTick();
  return getCache().onboardingComplete;
}

export { DEFAULT_WIDGETS };
export type { Gender, WidgetKey };