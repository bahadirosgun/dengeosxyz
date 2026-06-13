import { useEffect, useMemo, useState } from "react";
import { CloudRain, CloudSun, LocateFixed, RefreshCw, Sun, Wind } from "lucide-react";

type WeatherState = "idle" | "loading" | "ready" | "error" | "denied";

type WeatherData = {
  temperature: number;
  apparent: number;
  wind: number;
  rain: number;
  code: number;
  fetchedAt: number;
};

const CACHE_KEY = "dengeos.weather.v1";
const CACHE_TTL = 45 * 60 * 1000;

export function WeatherCard() {
  const [status, setStatus] = useState<WeatherState>("idle");
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const cached = readCachedWeather();
    if (cached) {
      setWeather(cached);
      setStatus("ready");
    }
  }, []);

  const meta = useMemo(() => (weather ? weatherMeta(weather) : null), [weather]);

  const loadWeather = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const params = new URLSearchParams({
            latitude: String(latitude),
            longitude: String(longitude),
            current: "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
            timezone: "auto",
          });
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
          if (!res.ok) throw new Error("weather failed");
          const json = (await res.json()) as {
            current?: {
              temperature_2m?: number;
              apparent_temperature?: number;
              precipitation?: number;
              weather_code?: number;
              wind_speed_10m?: number;
            };
          };
          const current = json.current;
          if (!current) throw new Error("weather empty");
          const next: WeatherData = {
            temperature: Number(current.temperature_2m ?? 0),
            apparent: Number(current.apparent_temperature ?? current.temperature_2m ?? 0),
            wind: Number(current.wind_speed_10m ?? 0),
            rain: Number(current.precipitation ?? 0),
            code: Number(current.weather_code ?? 0),
            fetchedAt: Date.now(),
          };
          setWeather(next);
          setStatus("ready");
          writeCachedWeather(next);
        } catch {
          setStatus(weather ? "ready" : "error");
        }
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: CACHE_TTL },
    );
  };

  if (status === "idle" && !weather) {
    return (
      <section className="mt-4 rounded-[28px] bg-white/80 p-4 shadow-[0_14px_36px_rgba(46,74,56,0.08)] ring-1 ring-border">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-soft text-sky">
            <CloudSun size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">Hava ritmi</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Konuma göre yürüyüş, nefes ve gün planı için küçük bir hava sinyali al.
            </p>
          </div>
        </div>
        <button
          onClick={loadWeather}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
        >
          <LocateFixed size={16} /> Hava durumunu aç
        </button>
      </section>
    );
  }

  if ((status === "error" || status === "denied") && !weather) {
    return (
      <section className="mt-4 rounded-[28px] bg-card p-4 ring-1 ring-border">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-soft text-sky">
            <CloudSun size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">Hava ritmi</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {status === "denied"
                ? "Konum izni kapalı. İstersen tarayıcı ayarlarından açabilirsin."
                : "Hava bilgisi alınamadı. Biraz sonra tekrar deneyebilirsin."}
            </p>
          </div>
          <button
            onClick={loadWeather}
            aria-label="Tekrar dene"
            className="rounded-full bg-background p-2 text-muted-foreground ring-1 ring-border"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </section>
    );
  }

  if (!weather || !meta) return null;

  const Icon = meta.icon;

  return (
    <section className="mt-4 overflow-hidden rounded-[30px] bg-white/80 shadow-[0_16px_42px_rgba(46,74,56,0.09)] ring-1 ring-border">
      <div className={`flex items-start gap-4 p-4 ${meta.bg}`}>
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[22px] bg-white/75 text-foreground shadow-sm ring-1 ring-white/80">
          <Icon size={25} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-foreground/65">Hava ritmi</p>
              <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
                {meta.title}
              </h2>
            </div>
            <button
              onClick={loadWeather}
              aria-label="Yenile"
              className="rounded-full bg-white/70 p-2 text-foreground/60 ring-1 ring-white/80"
            >
              <RefreshCw size={14} className={status === "loading" ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-foreground/70">
            <span className="rounded-full bg-white/65 px-2.5 py-1">
              {Math.round(weather.temperature)}°C
            </span>
            <span className="rounded-full bg-white/65 px-2.5 py-1">
              Hissedilen {Math.round(weather.apparent)}°C
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/65 px-2.5 py-1">
              <Wind size={11} /> {Math.round(weather.wind)} km/s
            </span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-foreground/75">{meta.copy}</p>
        </div>
      </div>
    </section>
  );
}

function readCachedWeather(): WeatherData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherData;
    if (!parsed.fetchedAt || Date.now() - parsed.fetchedAt > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedWeather(data: WeatherData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

function weatherMeta(data: WeatherData) {
  if (data.rain > 0 || [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(data.code)) {
    return {
      icon: CloudRain,
      bg: "bg-sky-soft",
      title: "Dışarısı ıslak olabilir.",
      copy:
        "Bugün yürüyüşü kısa tutabilir, evde esneme veya nefes molasıyla ritmini koruyabilirsin.",
    };
  }
  if (data.temperature >= 30 || data.apparent >= 32) {
    return {
      icon: Sun,
      bg: "bg-earth-soft",
      title: "Sıcak bir gün.",
      copy:
        "Hareketi sabah/akşam saatlerine almak, suyu görünür yerde tutmak bugün iyi gelebilir.",
    };
  }
  if (data.wind >= 28) {
    return {
      icon: Wind,
      bg: "bg-sky-soft",
      title: "Rüzgar belirgin.",
      copy:
        "Açık hava iyi gelebilir ama kendini zorlamadan; kısa yürüyüş veya içeride aktif mola yeter.",
    };
  }
  return {
    icon: CloudSun,
    bg: "bg-sage-soft",
    title: "Dışarıya çıkmak için uygun.",
    copy:
      "Kısa bir yürüyüş, gün ışığı ve birkaç derin nefes bugünün ritmini yumuşatabilir.",
  };
}
