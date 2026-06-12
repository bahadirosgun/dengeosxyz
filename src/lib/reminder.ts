import { getCache, persistReminder } from "./appData";
import type { ReminderSettings } from "./reminder-types";
export type { ReminderSettings };

const LAST_FIRED_KEY = "zincir-reminder-last-v1";

export const defaultReminder: ReminderSettings = { enabled: false, time: "20:00" };

export const loadReminder = (): ReminderSettings => getCache().reminder;
export const saveReminder = (s: ReminderSettings) => persistReminder(s);

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
};

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Starts an interval that fires a single notification per day at the
 * configured time, only while the app tab is open. Returns a cleanup fn.
 * (A full background push system needs a service worker — this is a
 * lightweight first step that works while the user has DengeOS open.)
 */
export const startReminderLoop = (): (() => void) => {
  if (typeof window === "undefined") return () => undefined;
  const tick = () => {
    const s = loadReminder();
    if (!s.enabled) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const [h, m] = s.time.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    const now = new Date();
    if (now.getHours() !== h || now.getMinutes() !== m) return;
    const today = todayKey();
    if (window.localStorage.getItem(LAST_FIRED_KEY) === today) return;
    try {
      new Notification("DengeOS 🌿", {
        body: "Bugün küçük bir adım için kısa bir an. Hazır olduğunda burada olacağız.",
        tag: "zincir-daily",
      });
      window.localStorage.setItem(LAST_FIRED_KEY, today);
    } catch {
      // ignore
    }
  };
  const id = window.setInterval(tick, 30 * 1000);
  tick();
  return () => window.clearInterval(id);
};