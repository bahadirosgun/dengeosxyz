import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

type Mode = "signin" | "signup" | "forgot";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41 35 44 30 44 24c0-1.3-.1-2.4-.4-3.5z"/>
  </svg>
);

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const reset = () => {
    setError(null);
    setInfo(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setInfo("Hesabın oluşturuldu — sana hoş geldin 🌿");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/sifre-sifirla`,
        });
        if (error) throw error;
        setInfo("Sıfırlama bağlantısı e-postana gönderildi.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bir şeyler ters gitti.";
      setError(translateError(msg));
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    reset();
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        const msg = result.error instanceof Error ? result.error.message : String(result.error);
        setError(translateError(msg));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-12 pb-10">
        <div className="text-center">
          <p className="text-5xl">🌿</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">DengeOS</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Mükemmellik değil, tutarlılık. Kendine nazik davranarak sağlıklı alışkanlıklar inşa et.
          </p>
        </div>

        <div className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-border">
          {mode !== "forgot" && (
            <div className="mb-5 flex gap-1 rounded-2xl bg-muted p-1">
              <button
                type="button"
                onClick={() => { setMode("signin"); reset(); }}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  mode === "signin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Giriş yap
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); reset(); }}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Kayıt ol
              </button>
            </div>
          )}

          {mode === "forgot" && (
            <h2 className="mb-4 text-lg font-semibold text-foreground">Şifreni sıfırla</h2>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">E-posta</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-primary"
              />
            </label>
            {mode !== "forgot" && (
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Şifre</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-primary"
                />
              </label>
            )}

            {error && (
              <p className="rounded-2xl bg-destructive/10 p-3 text-xs text-destructive">{error}</p>
            )}
            {info && (
              <p className="rounded-2xl bg-accent p-3 text-xs text-foreground">{info}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading
                ? "Bir saniye…"
                : mode === "signin"
                  ? "Giriş yap"
                  : mode === "signup"
                    ? "Hesap oluştur"
                    : "Sıfırlama bağlantısı gönder"}
            </button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                veya
                <div className="h-px flex-1 bg-border" />
              </div>
              <button
                type="button"
                onClick={onGoogle}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm font-medium text-foreground ring-1 ring-border hover:bg-muted disabled:opacity-50"
              >
                <GoogleIcon /> Google ile devam et
              </button>
            </>
          )}

          <div className="mt-4 text-center">
            {mode === "signin" && (
              <button
                type="button"
                onClick={() => { setMode("forgot"); reset(); }}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Şifremi unuttum
              </button>
            )}
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => { setMode("signin"); reset(); }}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Geri dön
              </button>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
          Verilerin yalnızca senin için saklanır ve sadece sen erişebilirsin. 🌿
        </p>
      </div>
    </div>
  );
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-posta veya şifre hatalı.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Bu e-posta zaten kayıtlı. Giriş yapmayı dene.";
  if (m.includes("password should be")) return "Şifre en az 6 karakter olmalı.";
  if (m.includes("pwned") || m.includes("compromised")) return "Bu şifre çok yaygın — daha güçlü bir şifre seç.";
  if (m.includes("email")) return "E-posta geçersiz görünüyor.";
  return msg;
}