import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ShieldAlert,
  RefreshCw,
  ChevronRight,
  Heart,
  Download,
  Upload,
  Bell,
  Sparkles,
  LogOut,
} from "lucide-react";
import { resetOnboarding } from "@/lib/habits";
import {
  loadReminder,
  requestNotificationPermission,
  saveReminder,
  type ReminderSettings,
} from "@/lib/reminder";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_WIDGETS,
  getCache,
  persistDashboardWidgets,
  persistGender,
  persistPersonalProfile,
  resetCache,
  type Gender,
  type WidgetKey,
} from "@/lib/appData";
import { useDashboardWidgets, useGender } from "@/lib/useAppData";

const WIDGET_META: Record<WidgetKey, { label: string; desc: string }> = {
  steps: { label: "Adım", desc: "Bugünkü adım özeti" },
  movement: { label: "Hareket", desc: "Haftalık aktif zaman" },
  weight: { label: "Ölçüm", desc: "Son değer + eğilim" },
  habits: { label: "Alışkanlık", desc: "Bugün tamamlanan/oran" },
  phase: { label: "Döngü fazı", desc: "Sadece kadın profiller" },
  mood: { label: "Ruh hali", desc: "Hızlı erişim (yakında)" },
  journal: { label: "Günce", desc: "Yeni kayıt kısayolu" },
};

const EXPORT_KEYS = [
  "zincir-state-v1",
  "zincir-cycle-v1",
  "zincir-journal-v1",
  "zincir-reminder-v1",
];

export function SettingsScreen() {
  const [reminder, setReminder] = useState<ReminderSettings>({ enabled: false, time: "20:00" });
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("default");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState("");
  const [initialWeightKg, setInitialWeightKg] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const gender = useGender();
  const widgets = useDashboardWidgets();

  const toggleWidget = (k: WidgetKey) => {
    const has = widgets.includes(k);
    const next = has ? widgets.filter((w) => w !== k) : [...widgets, k];
    persistDashboardWidgets(next);
  };

  useEffect(() => {
    setReminder(loadReminder());
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPerm(Notification.permission);
    } else {
      setNotifPerm("unsupported");
    }
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const personal = getCache().personal;
    setHeightCm(personal.heightCm ? String(personal.heightCm) : "");
    setInitialWeightKg(personal.initialWeightKg ? String(personal.initialWeightKg) : "");
    setBirthDate(personal.birthDate ?? "");
  }, []);

  const flash = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 3000);
  };

  const resetEverything = async () => {
    if (
      !confirm(
        "Tüm alışkanlıkların, kayıtların, döngü bilgin ve günlüklerin silinecek. Devam edilsin mi?\n\n(Hesabın silinmez — sadece içerik temizlenir.)",
      )
    )
      return;
    const userId = getCache().userId;
    if (!userId) return;
    await Promise.all([
      supabase.from("habits").delete().eq("user_id", userId),
      supabase.from("day_logs").delete().eq("user_id", userId),
      supabase.from("week_freeze_usage").delete().eq("user_id", userId),
      supabase.from("cycle_settings").delete().eq("user_id", userId),
      supabase.from("journal_entries").delete().eq("user_id", userId),
      supabase
        .from("profiles")
        .update({ onboarded: false, reminder_enabled: false })
        .eq("id", userId),
    ]);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const restartOnboarding = () => {
    if (!confirm("Karşılama akışı tekrar gösterilsin mi? Verilerin korunur.")) return;
    resetOnboarding();
    if (typeof window !== "undefined") window.location.href = "/";
  };

  const signOut = async () => {
    if (!confirm("Çıkış yapılsın mı?")) return;
    await supabase.auth.signOut();
    resetCache();
    void navigate({ to: "/" });
  };

  const exportJson = () => {
    if (typeof window === "undefined") return;
    const c = getCache();
    const payload = {
      _exportedAt: new Date().toISOString(),
      _version: 2,
      "zincir-state-v1": {
        habits: c.habits,
        logs: c.logs,
        weekFreezeUsage: c.weekFreezeUsage,
        startDate: c.startDate,
      },
      "zincir-cycle-v1": c.cycle,
      "zincir-journal-v1": c.journal,
      "zincir-reminder-v1": c.reminder,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zincir-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash("Yedek dosyası indirildi.");
  };

  const savePersonal = () => {
    const height = parseDecimal(heightCm);
    const weight = parseDecimal(initialWeightKg);
    persistPersonalProfile({
      heightCm: height && height >= 100 && height <= 240 ? height : null,
      initialWeightKg: weight && weight >= 30 && weight <= 250 ? weight : null,
      birthDate: birthDate || null,
    });
    flash("Kişisel bilgiler kaydedildi.");
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(String(reader.result)) as Record<string, unknown>;
        if (!confirm("Mevcut verilerin yedektekiyle değiştirilecek. Devam edilsin mi?")) return;
        // Stage to localStorage, then run the same import-to-cloud routine.
        for (const k of EXPORT_KEYS) {
          if (k in data) {
            window.localStorage.setItem(k, JSON.stringify(data[k]));
          }
        }
        const { importLocalToCloud } = await import("@/lib/appData");
        await importLocalToCloud();
        flash("Yedek yüklendi — sayfa yenileniyor…");
        window.setTimeout(() => (window.location.href = "/"), 800);
      } catch {
        alert("Bu dosya okunamadı. Geçerli bir DengeOS yedeği olduğundan emin ol.");
      }
    };
    reader.readAsText(file);
  };

  const updateReminder = async (next: ReminderSettings) => {
    if (next.enabled && notifPerm !== "granted" && notifPerm !== "unsupported") {
      const perm = await requestNotificationPermission();
      setNotifPerm(perm);
      if (perm !== "granted") {
        flash("Bildirim izni verilmedi. Hatırlatıcılar açılamaz.");
        return;
      }
    }
    setReminder(next);
    saveReminder(next);
  };

  return (
    <div className="mx-auto max-w-md px-5 pt-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Ayarlar</h1>
      </header>

      <section className="rounded-3xl bg-accent p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldAlert size={16} /> Sorumluluk notu
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">
          Bu uygulama tıbbi bir araç değildir. Kilo, stres veya adet düzeninle ilgili sürekli
          endişen varsa bir hekim ya da diyetisyene danışman değerlidir.
        </p>
      </section>

      <section className="mt-5 rounded-3xl bg-card p-5 ring-1 ring-border">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Heart size={15} className="text-primary" /> Felsefemiz
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/80">
          <li>• Mükemmellik değil tutarlılık.</li>
          <li>• Kaçırılan bir gün başarısızlık değildir.</li>
          <li>• Kısıtlama değil, küçük ve sürdürülebilir adımlar.</li>
          <li>• Sayı değil davranış değişimi.</li>
        </ul>
      </section>

      {/* Reminders */}
      <section className="mt-5 rounded-3xl bg-card p-5 ring-1 ring-border">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bell size={15} className="text-primary" /> Nazik hatırlatıcı
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Günde bir kez, seçtiğin saatte DengeOS kibarca seslenir. (Tarayıcı açıkken çalışır.)
        </p>
        {notifPerm === "unsupported" ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Bu tarayıcı bildirimleri desteklemiyor.
          </p>
        ) : (
          <div className="mt-3 flex items-center gap-3">
            <label className="flex flex-1 items-center gap-2 rounded-2xl bg-background p-3 ring-1 ring-border">
              <input
                type="checkbox"
                checked={reminder.enabled}
                onChange={(e) => updateReminder({ ...reminder, enabled: e.target.checked })}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              <span className="text-sm text-foreground">Hatırlat</span>
            </label>
            <input
              type="time"
              value={reminder.time}
              onChange={(e) => updateReminder({ ...reminder, time: e.target.value })}
              className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
        )}
        {notifPerm === "denied" && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Bildirim izni reddedildi. Tarayıcı ayarlarından açabilirsin.
          </p>
        )}
      </section>

      <section className="mt-5 space-y-2">
        {email && (
          <div className="rounded-2xl bg-card p-4 text-xs text-muted-foreground ring-1 ring-border">
            Giriş yapan: <span className="font-medium text-foreground">{email}</span>
          </div>
        )}
        <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
          <p className="text-xs font-medium text-muted-foreground">Cinsiyet</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Kadın seçilirse döngü takibi ve faza göre öneriler etkin olur.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["female", "male"] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => persistGender(g)}
                className={`rounded-2xl px-3 py-2.5 text-sm font-medium ring-1 transition ${
                  gender === g
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-background text-foreground ring-border"
                }`}
              >
                {g === "female" ? "Kadın" : "Erkek"}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
          <p className="text-sm font-semibold text-foreground">Kişisel bilgiler</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Önerileri daha tutarlı yapmak ve özel günlerini hatırlamak için kullanılır.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="rounded-2xl bg-background p-3 ring-1 ring-border">
              <span className="text-[11px] text-muted-foreground">Boy</span>
              <div className="mt-1 flex items-end gap-1">
                <input
                  inputMode="decimal"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="165"
                  className="w-full bg-transparent text-xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/35"
                />
                <span className="pb-0.5 text-xs text-muted-foreground">cm</span>
              </div>
            </label>
            <label className="rounded-2xl bg-background p-3 ring-1 ring-border">
              <span className="text-[11px] text-muted-foreground">Başlangıç</span>
              <div className="mt-1 flex items-end gap-1">
                <input
                  inputMode="decimal"
                  value={initialWeightKg}
                  onChange={(e) => setInitialWeightKg(e.target.value)}
                  placeholder="68"
                  className="w-full bg-transparent text-xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/35"
                />
                <span className="pb-0.5 text-xs text-muted-foreground">kg</span>
              </div>
            </label>
          </div>
          <label className="mt-2 block rounded-2xl bg-background p-3 ring-1 ring-border">
            <span className="text-[11px] text-muted-foreground">Doğum günü</span>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="mt-1 w-full bg-transparent text-sm font-medium text-foreground outline-none"
            />
          </label>
          <button
            onClick={savePersonal}
            className="mt-3 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
          >
            Kaydet
          </button>
        </div>
        {gender === "female" && (
        <Link
          to="/dongu"
          className="flex items-center justify-between rounded-2xl bg-card p-4 ring-1 ring-border"
        >
          <span className="text-sm font-medium text-foreground">Döngü bilgilerin</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>
        )}
        <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
          <p className="text-sm font-semibold text-foreground">Ana sayfa widget'ları</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Bugün ekranında hangi özetlerin görüneceğini sen seç.
          </p>
          <div className="mt-3 space-y-2">
            {(Object.keys(WIDGET_META) as WidgetKey[]).map((k) => {
              const meta = WIDGET_META[k];
              const on = widgets.includes(k);
              const disabled = k === "phase" && gender === "male";
              return (
                <label
                  key={k}
                  className={`flex items-center justify-between rounded-2xl bg-background p-3 ring-1 ring-border ${
                    disabled ? "opacity-50" : ""
                  }`}
                >
                  <span>
                    <span className="block text-sm text-foreground">{meta.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{meta.desc}</span>
                  </span>
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={on}
                    onChange={() => toggleWidget(k)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                </label>
              );
            })}
          </div>
          <button
            onClick={() => persistDashboardWidgets([...DEFAULT_WIDGETS])}
            className="mt-3 text-[11px] text-muted-foreground underline"
          >
            Varsayılana döndür
          </button>
        </div>
        <Link
          to="/aliskanliklar"
          className="flex items-center justify-between rounded-2xl bg-card p-4 ring-1 ring-border"
        >
          <span className="text-sm font-medium text-foreground">Alışkanlıklarını düzenle</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>
        <button
          onClick={exportJson}
          className="flex w-full items-center justify-between rounded-2xl bg-card p-4 text-left ring-1 ring-border hover:bg-muted"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Download size={15} /> Yedek indir (JSON)
          </span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-between rounded-2xl bg-card p-4 text-left ring-1 ring-border hover:bg-muted"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Upload size={15} /> Yedekten geri yükle
          </span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importJson(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={restartOnboarding}
          className="flex w-full items-center justify-between rounded-2xl bg-card p-4 text-left ring-1 ring-border hover:bg-muted"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles size={15} /> Karşılamayı tekrar göster
          </span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
        <button
          onClick={signOut}
          className="flex w-full items-center justify-between rounded-2xl bg-card p-4 text-left ring-1 ring-border hover:bg-muted"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <LogOut size={15} /> Çıkış yap
          </span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
        <button
          onClick={resetEverything}
          className="flex w-full items-center justify-between rounded-2xl bg-card p-4 text-left ring-1 ring-border hover:bg-muted"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-destructive">
            <RefreshCw size={15} /> Her şeyi sıfırla
          </span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
      </section>

      {feedback && (
        <div className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-md rounded-2xl bg-card p-4 text-sm text-foreground shadow-lg ring-1 ring-border">
          {feedback}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Verilerin güvenli bir şekilde hesabına bağlı tutulur; yalnızca sen erişebilirsin.
      </p>
    </div>
  );
}

function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
