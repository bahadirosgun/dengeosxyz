import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  clearLocalData,
  hasLocalData,
  importLocalToCloud,
  isCacheLoaded,
  loadAllForUser,
  resetCache,
} from "@/lib/appData";
import { AuthScreen } from "./AuthScreen";

type Status = "init" | "signedOut" | "loading" | "ready";

const PUBLIC_PATHS = ["/sifre-sifirla"];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("init");
  const [askMigrate, setAskMigrate] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const handleSession = async (userId: string | null) => {
      if (!mounted) return;
      if (!userId) {
        resetCache();
        setStatus("signedOut");
        return;
      }
      setStatus("loading");
      try {
        await loadAllForUser(userId);
      } catch (err) {
        console.error("[AuthGate] load failed", err);
      }
      if (!mounted) return;
      if (hasLocalData() && !sessionStorage.getItem("zincir-migration-asked")) {
        setAskMigrate(true);
      }
      setStatus("ready");
    };

    supabase.auth.getSession().then(({ data }) => {
      void handleSession(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void handleSession(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Allow the password-reset page through without a session.
  if (PUBLIC_PATHS.includes(location.pathname)) {
    return <>{children}</>;
  }

  if (status === "init" || status === "loading") return <FullScreenLoader />;
  if (status === "signedOut") return <AuthScreen />;

  if (askMigrate) {
    return (
      <MigrationPrompt
        loading={migrating}
        onAccept={async () => {
          setMigrating(true);
          try {
            await importLocalToCloud();
          } catch (err) {
            console.error("[AuthGate] migration failed", err);
          }
          sessionStorage.setItem("zincir-migration-asked", "1");
          setMigrating(false);
          setAskMigrate(false);
        }}
        onDecline={() => {
          clearLocalData();
          sessionStorage.setItem("zincir-migration-asked", "1");
          setAskMigrate(false);
        }}
      />
    );
  }

  if (!isCacheLoaded()) return <FullScreenLoader />;

  return <>{children}</>;
}

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <p className="text-xs text-muted-foreground">Yükleniyor…</p>
      </div>
    </div>
  );
}

function MigrationPrompt({
  loading,
  onAccept,
  onDecline,
}: {
  loading: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-md rounded-3xl bg-card p-6 ring-1 ring-border">
        <p className="text-3xl">📦</p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
          Bu tarayıcıda eski verilerin var
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Daha önce giriş yapmadan kullanmaya başlamışsın. Alışkanlıklarını, geçmiş kayıtlarını,
          döngü bilgini ve günlük yazılarını yeni hesabına aktaralım mı?
        </p>
        <div className="mt-6 space-y-2">
          <button
            disabled={loading}
            onClick={onAccept}
            className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Aktarılıyor…" : "Verilerimi aktar"}
          </button>
          <button
            disabled={loading}
            onClick={onDecline}
            className="w-full rounded-2xl bg-muted px-4 py-3 text-sm font-medium text-foreground disabled:opacity-50"
          >
            Hayır, sıfırdan başlayayım
          </button>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Aktarımdan sonra eski yerel kopyalar bu cihazdan temizlenir.
        </p>
      </div>
    </div>
  );
}