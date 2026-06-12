import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sifre-sifirla")({
  head: () => ({
    meta: [
      { title: "Şifre Sıfırla — DengeOS" },
      { name: "description", content: "Yeni bir şifre belirle." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase auto-consumes the recovery hash and creates a session.
    const check = () => {
      supabase.auth.getSession().then(({ data }) => {
        setHasSession(!!data.session);
      });
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") check();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    void navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-md rounded-3xl bg-card p-6 ring-1 ring-border">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Yeni şifre belirle</h1>
        {hasSession === false ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Sıfırlama bağlantısı geçersiz ya da süresi dolmuş görünüyor. Lütfen tekrar deneyin.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Yeni şifre</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Tekrar yaz</span>
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-primary"
              />
            </label>
            {error && (
              <p className="rounded-2xl bg-destructive/10 p-3 text-xs text-destructive">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Kaydediliyor…" : "Şifreyi güncelle"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}