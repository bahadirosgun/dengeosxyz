import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, ImagePlus, Settings as SettingsIcon } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import {
  TAG_LABEL,
  type JournalMediaItem,
  type JournalTag,
  deleteJournalMedia,
  getSignedUrl,
  listJournalMedia,
  uploadJournalMedia,
} from "@/lib/journalMedia";

export const Route = createFileRoute("/gunce")({
  head: () => ({
    meta: [
      { title: "Günce — DengeOS" },
      {
        name: "description",
        content:
          "Yemek, hareket, tartı ve günlük hayatından kareleri saklayarak kendi ilerleme defterini oluştur.",
      },
      { property: "og:title", content: "Günce — DengeOS" },
      {
        property: "og:description",
        content: "Kendi ilerleme defterini görsellerle birlikte yaz.",
      },
    ],
  }),
  component: GuncePage,
});

function GuncePage() {
  const [items, setItems] = useState<JournalMediaItem[] | null>(null);
  const [composer, setComposer] = useState(false);

  const load = async () => {
    const data = await listJournalMedia();
    setItems(data);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="mx-auto max-w-md px-5 pt-8">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Günce</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Kendi yolculuğunun ilerleme defteri — yargısız, sıcak ve sana ait.
            </p>
          </div>
          <Link
            to="/ayarlar"
            aria-label="Ayarlar"
            className="mt-1 rounded-full bg-card p-2.5 text-muted-foreground ring-1 ring-border hover:text-foreground"
          >
            <SettingsIcon size={18} />
          </Link>
        </header>

        <button
          onClick={() => setComposer(true)}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
        >
          <ImagePlus size={16} /> Yeni kayıt ekle
        </button>

        {items === null && (
          <p className="text-sm text-muted-foreground">Yükleniyor…</p>
        )}
        {items && items.length === 0 && (
          <div className="rounded-3xl bg-card p-6 text-center ring-1 ring-border">
            <p className="text-4xl">📔</p>
            <p className="mt-3 text-sm text-foreground">
              Henüz hiç kayıt yok. İlk fotoğrafını ekle — yarın bugüne gülümseyerek bakacaksın.
            </p>
          </div>
        )}
        {items && items.length > 0 && (
          <ul className="space-y-4">
            {items.map((it) => (
              <MediaCard key={it.id} item={it} onDeleted={load} />
            ))}
          </ul>
        )}
      </div>
      {composer && (
        <Composer
          onClose={() => setComposer(false)}
          onDone={() => {
            setComposer(false);
            void load();
          }}
        />
      )}
      <BottomNav />
    </div>
  );
}

function MediaCard({
  item,
  onDeleted,
}: {
  item: JournalMediaItem;
  onDeleted: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getSignedUrl(item.storagePath).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [item.storagePath]);

  const onDelete = async () => {
    if (!confirm("Bu kayıt silinsin mi?")) return;
    await deleteJournalMedia(item);
    onDeleted();
  };

  const date = new Date(item.takenAt).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li className="overflow-hidden rounded-3xl bg-card ring-1 ring-border">
      <div className="flex items-center justify-between px-4 pt-3 text-[11px] text-muted-foreground">
        <span>{date}</span>
        <span className="rounded-full bg-accent px-2 py-0.5 text-foreground">
          {TAG_LABEL[item.tag]}
        </span>
      </div>
      {url ? (
        <img
          src={url}
          alt={item.caption ?? "Günce kaydı"}
          className="mt-3 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="mt-3 aspect-square w-full animate-pulse bg-muted" />
      )}
      {item.caption && (
        <p className="px-4 pt-3 text-sm leading-relaxed text-foreground">{item.caption}</p>
      )}
      <div className="flex justify-end px-2 pb-2">
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-full p-2 text-xs text-muted-foreground hover:bg-muted hover:text-destructive"
        >
          <Trash2 size={14} /> Sil
        </button>
      </div>
    </li>
  );
}

function Composer({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [tag, setTag] = useState<JournalTag>("general");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const submit = async () => {
    if (!file) {
      setErr("Lütfen bir fotoğraf seç.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await uploadJournalMedia({ file, caption, tag });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Yükleme başarısız.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-card p-5 ring-1 ring-border sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Yeni Günce Kaydı</h2>
          <button onClick={onClose} className="text-sm text-muted-foreground">
            Kapat
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f);
            e.target.value = "";
          }}
        />
        {preview ? (
          <img
            src={preview}
            alt=""
            className="aspect-square w-full rounded-2xl object-cover"
          />
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl bg-muted text-muted-foreground"
          >
            <Plus size={28} />
            <span className="text-sm">Fotoğraf seç</span>
          </button>
        )}
        {preview && (
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-2 text-xs text-muted-foreground underline"
          >
            Başka fotoğraf seç
          </button>
        )}
        <label className="mt-4 block">
          <span className="text-xs font-medium text-muted-foreground">Not (isteğe bağlı)</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            placeholder="Bugünün hikâyesi…"
            className="mt-1 w-full rounded-2xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
        <div className="mt-3">
          <span className="text-xs font-medium text-muted-foreground">Etiket</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(TAG_LABEL) as JournalTag[]).map((t) => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className={`rounded-full px-3 py-1.5 text-xs ring-1 transition ${
                  tag === t
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-background text-foreground ring-border"
                }`}
              >
                {TAG_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
        {err && (
          <p className="mt-3 rounded-2xl bg-destructive/10 p-3 text-xs text-destructive">{err}</p>
        )}
        <button
          onClick={submit}
          disabled={busy}
          className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Yükleniyor…" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}