import {
  getCache,
  persistJournalAdd,
  persistJournalDelete,
} from "./appData";
import type { JournalEntry } from "./journal-types";
export type { JournalEntry };

export const JOURNAL_PROMPTS = [
  "Bugün seni ne yordu?",
  "Bugün küçük bir iyi şey neydi?",
  "Şu an bedeninde ne hissediyorsun?",
  "Bugün kendine nasıl iyi davrandın?",
  "Şu an zihninde dolanan bir düşünce neydi?",
  "Bugün için minnettar olduğun küçük bir şey?",
  "Yarın için kendine vereceğin nazik bir söz?",
];

export const promptOfTheDay = (): string => {
  const d = new Date();
  const day = Math.floor(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000,
  );
  return JOURNAL_PROMPTS[day % JOURNAL_PROMPTS.length]!;
};

export const loadJournal = (): JournalEntry[] => getCache().journal;

export const addEntry = (prompt: string, text: string): JournalEntry[] => {
  const entry: JournalEntry = {
    id: `j_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
    prompt,
    text: text.trim(),
  };
  persistJournalAdd(entry);
  return getCache().journal;
};

export const deleteEntry = (id: string): JournalEntry[] => {
  persistJournalDelete(id);
  return getCache().journal;
};

export const formatEntryDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });