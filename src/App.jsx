
import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "https://api.openweathermap.org/data/2.5";
const API_KEY = "e350e0437cdd076d76a7a86f4bc75255"; // sua chave

function iconUrl(icon) {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

async function fetchJSON(url) {
  const res = await fetch(url);
  let data = null;
  try {
    data = await res.json();
  } catch {
    
  }
  if (!res.ok) {
    const msg = data?.message || res.statusText || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [units, setUnits] = useState("metric"); // metric => °C, imperial => °F
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState([]);

  const unitLabel = units === "metric" ? "°C" : "°F";

  function compactDaily(list) {
    const byDate = {};
    for (const item of list) {
      const [date] = item.dt_txt.split(" ");
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(item);
    }

    const days = Object.entries(byDate).map(([date, items]) => {
      let mid = items[0];
      let bestDelta = Math.abs(new Date(items[0].dt_txt).getHours() - 12);
      const temps = [];
      for (const it of items) {
        temps.push(it.main.temp);
        const delta = Math.abs(new Date(it.dt_txt).getHours() - 12);
        if (delta < bestDelta) {
          bestDelta = delta;
          mid = it;
        }
      }
      return {
        date,
        min: Math.round(Math.min(...temps)),
        max: Math.round(Math.max(...temps)),
        icon: mid?.weather?.[0]?.icon,
        desc: mid?.weather?.[0]?.description,
      };
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    return days.filter(d => d.date !== todayStr).slice(0, 5);
  }

  async function fetchWeatherByCoords(lat, lon) {
    setLoading(true);
    setError("");
    try {
      const lang = navigator.language?.split("-")[0] || "pt";
      const q = `lat=${lat}&lon=${lon}&units=${units}&appid=${API_KEY}&lang=${lang}`;
      const [w, f] = await Promise.all([
        fetchJSON(`${API_BASE}/weather?${q}`),
        fetchJSON(`${API_BASE}/forecast?${q}`),
      ]);
      setCurrent(w);
      setForecast(compactDaily(f.list));
    } catch (err) {
      console.error("fetchWeatherByCoords:", err);
      setError(err.message || "Erro ao buscar dados do clima.");
      setCurrent(null);
      setForecast([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchWeatherByCity(city) {
    if (!city) return;
    setLoading(true);
    setError("");
    try {
      const lang = navigator.language?.split("-")[0] || "pt";
      const q = `q=${encodeURIComponent(city)}&units=${units}&appid=${API_KEY}&lang=${lang}`;
      const [w, f] = await Promise.all([
        fetchJSON(`${API_BASE}/weather?${q}`),
        fetchJSON(`${API_BASE}/forecast?${q}`),
      ]);
      setCurrent(w);
      setForecast(compactDaily(f.list));
    } catch (err) {
      console.error("fetchWeatherByCity:", err);
      setError(err.message || "Erro ao buscar dados por cidade.");
      setCurrent(null);
      setForecast([]);
    } finally {
      setLoading(false);
    }
  }

  function detectLocationAndLoad() {
    setError("");
    if (!("geolocation" in navigator)) {
      setError("Geolocalização não suportada pelo navegador.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      err => {
        console.warn("Geolocation error:", err);
        setError("Não foi possível obter localização. Permita o acesso ou use teste manual.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  useEffect(() => {
    detectLocationAndLoad();
  }, [units]); 
  const cityName = useMemo(() => current?.name ?? "—", [current]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-100 p-4">
      <div className="max-w-4xl mx-auto py-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Clima Agora ☁️</h1>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex items-stretch gap-2 w-full">
              <input
                className="flex-1 rounded-2xl bg-slate-700/60 px-4 py-2 outline-none placeholder:text-slate-300"
                placeholder="Buscar cidade (ex: São Paulo)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchWeatherByCity(query)}
              />
              <button
                onClick={() => fetchWeatherByCity(query)}
                className="rounded-2xl px-4 py-2 bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition"
              >
                Buscar
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={detectLocationAndLoad}
                className="rounded-2xl px-4 py-2 bg-slate-700/60 hover:bg-slate-700 active:scale-95 transition"
                title="Detectar localização automaticamente"
              >
                📍 Usar minha localização
              </button>

              <button
                onClick={() => fetchWeatherByCoords(-23.5505, -46.6333)} // São Paulo - fallback de teste
                className="rounded-2xl px-3 py-2 bg-slate-700/60 hover:bg-slate-700 active:scale-95 transition text-sm"
                title="Teste com São Paulo"
              >
                Teste: São Paulo
              </button>

              <div className="flex items-center gap-1 rounded-2xl bg-slate-700/60 px-1">
                <button
                  onClick={() => setUnits("metric")}
                  className={`px-3 py-2 rounded-2xl ${units === "metric" ? "bg-slate-900" : "opacity-70"}`}
                >
                  °C
                </button>
                <button
                  onClick={() => setUnits("imperial")}
                  className={`px-3 py-2 rounded-2xl ${units === "imperial" ? "bg-slate-900" : "opacity-70"}`}
                >
                  °F
                </button>
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-500/20 border border-red-500/40 p-3 text-sm">
            <strong>Erro:</strong> {error}
          </div>
        )}

        {loading && <div className="animate-pulse text-slate-300">Carregando dados do clima…</div>}

        {current && (
          <section className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="md:col-span-2 rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-4 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm uppercase tracking-widest text-slate-300">Agora em</div>
                  <div className="text-2xl font-semibold">{cityName}</div>
                </div>
                {current.weather?.[0]?.icon && (
                  <img alt={current.weather?.[0]?.description} className="w-20 h-20" src={iconUrl(current.weather?.[0]?.icon)} />
                )}
              </div>

              <div className="mt-4 flex items-end gap-6">
                <div className="text-5xl font-bold leading-none">
                  {Math.round(current.main?.temp)}{unitLabel}
                </div>
                <div className="text-slate-300 capitalize">{current.weather?.[0]?.description}</div>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-slate-200">
                <div className="rounded-xl bg-slate-800/60 p-3 border border-white/5">
                  <div className="text-slate-400 text-xs uppercase tracking-widest">Sensação</div>
                  <div className="font-medium">{Math.round(current.main?.feels_like)}{unitLabel}</div>
                </div>
                <div className="rounded-xl bg-slate-800/60 p-3 border border-white/5">
                  <div className="text-slate-400 text-xs uppercase tracking-widest">Humidade</div>
                  <div className="font-medium">{current.main?.humidity}%</div>
                </div>
                <div className="rounded-xl bg-slate-800/60 p-3 border border-white/5">
                  <div className="text-slate-400 text-xs uppercase tracking-widest">Vento</div>
                  <div className="font-medium">{Math.round(current.wind?.speed)} {units === "metric" ? "m/s" : "mph"}</div>
                </div>
                <div className="rounded-xl bg-slate-800/60 p-3 border border-white/5">
                  <div className="text-slate-400 text-xs uppercase tracking-widest">Pressão</div>
                  <div className="font-medium">{current.main?.pressure} hPa</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-4 shadow">
              <h3 className="font-semibold mb-3">Detalhes</h3>
              <ul className="space-y-2 text-sm text-slate-200">
                <li className="flex justify-between"><span>Visibilidade</span><span>{(current.visibility ?? 0) / 1000} km</span></li>
                {current.clouds && <li className="flex justify-between"><span>Nuvens</span><span>{current.clouds.all}%</span></li>}
                {current.coord && <li className="flex justify-between"><span>Coordenadas</span><span>{current.coord.lat.toFixed(2)}, {current.coord.lon.toFixed(2)}</span></li>}
              </ul>
            </div>
          </section>
        )}

        {forecast?.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-3">Próximos 5 dias</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {forecast.map((d) => (
                <div key={d.date} className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-4 text-center">
                  <div className="text-sm text-slate-300 mb-1">{new Date(d.date).toLocaleDateString()}</div>
                  {d.icon && <img alt={d.desc} className="mx-auto w-16 h-16" src={iconUrl(d.icon)} />}
                  <div className="capitalize text-slate-200 mb-2">{d.desc}</div>
                  <div className="font-semibold">{d.max}{unitLabel} <span className="text-slate-400">/ {d.min}{unitLabel}</span></div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-10 text-xs text-slate-400">
          Fonte: OpenWeather • Dica: se quiser previsões em PT-BR, mantenha o idioma do navegador em português.
        </footer>
      </div>
    </div>
  );
}
