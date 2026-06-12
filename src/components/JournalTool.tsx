import { useEffect, useMemo, useState } from "react";
import { Trash2, Send, History, ChevronDown, Search } from "lucide-react";
import {
  JOURNAL_PROMPTS,
  type JournalEntry,
  addEntry,
  deleteEntry,
  formatEntryDate,
  loadJournal,
  promptOfTheDay,
} from "@/lib/journal";

export function JournalTool() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [text, setText] = useState("");
  const [prompt, setPrompt] = useState<string>(() => promptOfTheDay());
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setEntries(loadJournal());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.text.toLowerCase().includes(q) ||
        e.prompt.toLowerCase().includes(q) ||
        formatEntryDate(e.date).toLowerCase().includes(q),
    );
  }, [entries, query]);

  const submit = () => {
    if (!text.trim()) return;
    setEntries(addEntry(prompt, text));
    setText("");
    setPrompt(promptOfTheDay());
  };

  return (
    <div className="mt-4">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">1 dakikalık günlük</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Tek bir soru. Tek bir cümle bile yeter. Doğru cevap diye bir şey yok.
      </p>

      <section className="mt-5 rounded-3xl bg-card p-5 ring-1 ring-border">
        <button
          onClick={() => setShowPromptPicker((v) => !v)}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Bugünün sorusu
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">{prompt}</h2>
          </div>
          <ChevronDown
            size={18}
            className={`mt-2 shrink-0 text-muted-foreground transition ${showPromptPicker ? "rotate-180" : ""}`}
          />
        </button>

        {showPromptPicker && (
          <div className="mt-3 flex flex-wrap gap-2">
            {JOURNAL_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPrompt(p);
                  setShowPromptPicker(false);
                }}
                className={`rounded-full px-3 py-1.5 text-xs ring-1 transition ${
                  p === prompt
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-background text-foreground ring-border hover:bg-sage-soft"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={1000}
          placeholder="Aklından geçen ilk şeyi yaz. Düzeltmeye gerek yok…"
          className="mt-4 w-full resize-none rounded-2xl border border-border bg-background p-4 text-base leading-relaxed text-foreground outline-none focus:border-primary"
        />

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{text.length}/1000</span>
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Send size={15} /> Kaydet
          </button>
        </div>
      </section>

      <section className="mt-6">
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-2xl bg-card p-4 ring-1 ring-border"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <History size={16} /> Geçmiş ({entries.length})
          </span>
          <ChevronDown
            size={18}
            className={`text-muted-foreground transition ${showHistory ? "rotate-180" : ""}`}
          />
        </button>

        {showHistory && (
          <div className="mt-3 space-y-3">
            {entries.length > 0 && (
              <label className="flex items-center gap-2 rounded-2xl bg-card px-3 py-2 ring-1 ring-border">
                <Search size={14} className="text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ara: bir kelime ya da tarih…"
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Temizle
                  </button>
                )}
              </label>
            )}
            {entries.length === 0 ? (
              <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
                Henüz kayıt yok. İlk düşünceni yazdığında burada görünür.
              </p>
            ) : filtered.length === 0 ? (
              <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
                Bu aramaya uyan kayıt yok.
              </p>
            ) : (
              filtered.map((e) => (
                <article
                  key={e.id}
                  className="rounded-2xl bg-card p-4 ring-1 ring-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {formatEntryDate(e.date)}
                      </p>
                      <p className="mt-1 text-xs italic text-muted-foreground">{e.prompt}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm("Bu kayıt silinsin mi?")) {
                          setEntries(deleteEntry(e.id));
                        }
                      }}
                      aria-label="Sil"
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {e.text}
                  </p>
                </article>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}