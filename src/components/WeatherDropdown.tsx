import { useState, useEffect, useRef, useCallback, type RefObject } from 'react';
import {
  MapPin, Droplets, Wind, Thermometer, CloudRain,
  Loader2, RefreshCw, AlertTriangle, X, Search, LocateFixed,
} from 'lucide-react';
import {
  fetchWeather,
  getWeatherInfo,
  isRainyWeather,
  requestGeolocation,
  reverseGeocode,
  searchCity,
  loadPersistedLocation,
  saveLocation,
  DEFAULT_LOCATION,
  type WeatherData,
  type DayForecast,
  type CityResult,
  type LocationStatus,
} from '@/services/weather';

interface WeatherDropdownProps {
  /** Optional forwarded ref — element that toggles the dropdown */
  containerRef?: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

type PanelState = 'location-prompt' | 'loading' | 'error' | 'data' | 'city-search';

export default function WeatherDropdown({ onClose }: WeatherDropdownProps) {
  const [panelState, setPanelState] = useState<PanelState>('loading');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationName, setLocationName] = useState('');

  // City search state
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const cityDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load weather on mount ────────────────────────────────────────────────

  const loadWeather = useCallback(async (lat: number, lon: number, name: string) => {
    setPanelState('loading');
    setError(null);
    try {
      const data = await fetchWeather(lat, lon, name);
      setWeather(data);
      setLocationName(data.locationName);
      setPanelState('data');
      // Update navbar badge
      const info = getWeatherInfo(data.current.weatherCode);
      window.dispatchEvent(
        new CustomEvent('saathi:weather-updated', {
          detail: { temp: data.current.temperature, icon: info.icon },
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load weather.');
      setPanelState('error');
    }
  }, []);

  useEffect(() => {
    const persisted = loadPersistedLocation();

    if (persisted) {
      // We already have a location — just fetch
      setLocationStatus(persisted.status);
      loadWeather(persisted.latitude, persisted.longitude, persisted.name);
      return;
    }

    // First time — ask for GPS permission
    setPanelState('location-prompt');
    setLocationStatus('idle');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── GPS permission request ───────────────────────────────────────────────

  const handleRequestGPS = useCallback(async () => {
    setPanelState('loading');
    const coords = await requestGeolocation();

    if (coords) {
      const name = await reverseGeocode(coords.latitude, coords.longitude);
      const loc = { ...coords, name, status: 'granted' as LocationStatus, savedAt: Date.now() };
      saveLocation(loc);
      setLocationStatus('granted');
      loadWeather(coords.latitude, coords.longitude, name);
    } else {
      // Denied — persist that choice, fall back to default
      const loc = { ...DEFAULT_LOCATION, status: 'denied' as LocationStatus, savedAt: Date.now() };
      saveLocation(loc);
      setLocationStatus('denied');
      loadWeather(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude, DEFAULT_LOCATION.name);
    }
  }, [loadWeather]);

  const handleUseFaisalabad = useCallback(() => {
    const loc = { ...DEFAULT_LOCATION, status: 'denied' as LocationStatus, savedAt: Date.now() };
    saveLocation(loc);
    setLocationStatus('denied');
    loadWeather(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude, DEFAULT_LOCATION.name);
  }, [loadWeather]);

  // ── City search ──────────────────────────────────────────────────────────

  const handleCityQueryChange = (q: string) => {
    setCityQuery(q);
    if (cityDebounce.current) clearTimeout(cityDebounce.current);
    if (q.trim().length < 2) { setCityResults([]); return; }
    cityDebounce.current = setTimeout(async () => {
      setCitySearching(true);
      const results = await searchCity(q);
      setCityResults(results);
      setCitySearching(false);
    }, 350);
  };

  const handleCitySelect = useCallback((city: CityResult) => {
    const loc = {
      latitude: city.latitude,
      longitude: city.longitude,
      name: city.name,
      status: 'manual' as LocationStatus,
      savedAt: Date.now(),
    };
    saveLocation(loc);
    setLocationStatus('manual');
    setCityQuery('');
    setCityResults([]);
    loadWeather(city.latitude, city.longitude, city.name);
  }, [loadWeather]);

  const handleRefresh = useCallback(() => {
    const persisted = loadPersistedLocation();
    if (persisted) {
      // Clear cache by forcing a fresh fetch
      localStorage.removeItem('saathi-weather-cache');
      loadWeather(persisted.latitude, persisted.longitude, persisted.name);
    }
  }, [loadWeather]);

  const rainDays = weather?.forecast.filter(
    (d) => isRainyWeather(d.weatherCode) || d.precipitationProbabilityMax > 40
  ) ?? [];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 hero-box shadow-2xl overflow-hidden animate-slide-down z-50"
      style={{ maxHeight: 'calc(100svh - 5rem)', overflowY: 'auto' }}
    >
      {/* ── Location prompt ── */}
      {panelState === 'location-prompt' && (
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-saathi-900">Weather</h3>
            <button onClick={onClose} className="p-1 text-saathi-400 hover:text-saathi-600 rounded-lg transition-colors" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-saathi-50 flex items-center justify-center mx-auto mb-4">
              <LocateFixed className="w-7 h-7 text-saathi-500" />
            </div>
            <h4 className="font-semibold text-saathi-900 mb-1">Enable location for accurate weather</h4>
            <p className="text-sm text-saathi-500 mb-5 leading-relaxed">
              Allow location access to get real-time weather for your farm area. Your location is never stored on our servers.
            </p>
            <button onClick={handleRequestGPS} className="btn-primary w-full mb-2">
              <LocateFixed className="w-4 h-4" />
              Use my location
            </button>
            <button onClick={handleUseFaisalabad} className="btn-ghost w-full text-sm text-saathi-500">
              Use Faisalabad (default)
            </button>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {panelState === 'loading' && (
        <div className="p-5 flex items-center justify-center gap-3 min-h-[160px]">
          <Loader2 className="w-5 h-5 text-saathi-500 animate-spin" />
          <span className="text-saathi-600 text-sm">Loading weather…</span>
        </div>
      )}

      {/* ── Error ── */}
      {panelState === 'error' && (
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-saathi-900">Weather</h3>
            <button onClick={onClose} className="p-1 text-saathi-400 hover:text-saathi-600 rounded-lg transition-colors" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 text-red-700 mb-4">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
          <button onClick={handleRefresh} className="btn-secondary w-full text-sm">
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      )}

      {/* ── Data ── */}
      {panelState === 'data' && weather && (
        <>
          {/* Header */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-saathi-50">
            <div className="flex items-center gap-1.5 text-sm text-saathi-600">
              <MapPin className="w-3.5 h-3.5 text-saathi-400" />
              <span className="font-medium truncate max-w-[160px]">{locationName}</span>
              {locationStatus === 'denied' || locationStatus === 'manual' ? (
                <button
                  onClick={() => { setCityQuery(''); setCityResults([]); setPanelState('city-search'); }}
                  className="text-xs text-saathi-400 hover:text-saathi-600 underline underline-offset-2 transition-colors ml-1"
                >
                  Change
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleRefresh} className="p-1 text-saathi-400 hover:text-saathi-600 rounded-lg transition-colors" aria-label="Refresh weather">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={onClose} className="p-1 text-saathi-400 hover:text-saathi-600 rounded-lg transition-colors" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-5 py-4">
            {/* Current */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl">{getWeatherInfo(weather.current.weatherCode).icon}</span>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-saathi-900">{weather.current.temperature}</span>
                  <span className="text-xl text-saathi-400 font-medium">°C</span>
                </div>
                <p className="text-saathi-500 text-sm">{getWeatherInfo(weather.current.weatherCode).label}</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3.5 mb-3 text-sm text-saathi-600 flex-wrap">
              {weather.current.humidity !== undefined && (
                <span className="flex items-center gap-1.5" title="Relative Humidity">
                  <Droplets className="w-3.5 h-3.5 text-saathi-400" />
                  {weather.current.humidity}%
                </span>
              )}
              <span className="flex items-center gap-1.5" title={`Wind Speed & Direction: ${weather.current.windSpeed} km/h ${weather.current.windDirectionCompass ?? ''}`}>
                <Wind className="w-3.5 h-3.5 text-saathi-400" />
                {weather.current.windSpeed} km/h{weather.current.windDirectionCompass ? ` ${weather.current.windDirectionCompass}` : ''}
              </span>
              <span className="flex items-center gap-1.5" title="Day Min–Max Temperature">
                <Thermometer className="w-3.5 h-3.5 text-saathi-400" />
                {weather.forecast[0]?.tempMin}–{weather.forecast[0]?.tempMax}°
              </span>
              {weather.current.apparentTemperature !== undefined && (
                <span className="text-xs text-saathi-400" title={`Feels-like temperature: ${weather.current.apparentTemperature}°C`}>
                  (Feels {weather.current.apparentTemperature}°)
                </span>
              )}
            </div>

            {/* Agricultural metrics summary (minimal & non-intrusive) */}
            {weather.agricultural && (weather.agricultural.et0DailySum !== undefined || weather.agricultural.soilMoistureSurface !== undefined) && (
              <div className="flex items-center justify-between text-[11px] text-saathi-600 bg-saathi-50/70 px-2.5 py-1.5 rounded-lg mb-3 border border-saathi-100/50">
                {weather.agricultural.et0DailySum !== undefined && (
                  <span title="Reference Evapotranspiration: estimated crop water consumption rate">
                    ET₀: <strong className="font-semibold text-saathi-800">{weather.agricultural.et0DailySum} mm/d</strong>
                  </span>
                )}
                {weather.agricultural.soilMoistureSurface !== undefined && (
                  <span title="Surface Soil Moisture (0–1cm depth)">
                    Soil Moisture: <strong className="font-semibold text-saathi-800">{Math.round(weather.agricultural.soilMoistureSurface * 100)}%</strong>
                  </span>
                )}
                {weather.agricultural.soilTemperatureSurface !== undefined && (
                  <span title="Surface Soil Temperature">
                    Soil: <strong className="font-semibold text-saathi-800">{weather.agricultural.soilTemperatureSurface}°C</strong>
                  </span>
                )}
              </div>
            )}

            {/* Rain probability alert */}
            {rainDays.length > 0 && (
              <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-harvest-50 border border-harvest-100">
                <CloudRain className="w-4 h-4 text-harvest-700 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-harvest-900 leading-relaxed">
                  <span className="font-semibold">Precipitation risk:</span>{' '}
                  {rainDays.map((d) => `${d.dayName} (${d.precipitationProbabilityMax}% chance)`).join(', ')} — plan spraying & irrigation accordingly.
                </p>
              </div>
            )}

            {/* 5-day forecast */}
            <div className="border-t border-saathi-50 pt-3">
              <p className="text-[10px] font-semibold text-saathi-400 uppercase tracking-wider mb-2">5-Day Forecast</p>
              <div className="grid grid-cols-5 gap-1.5">
                {weather.forecast.slice(0, 5).map((day) => (
                  <ForecastDay key={day.date} day={day} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── City search panel ── */}
      {panelState === 'city-search' && (
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-saathi-900">Change location</h3>
            <button
              onClick={() => setPanelState(weather ? 'data' : 'location-prompt')}
              className="p-1 text-saathi-400 hover:text-saathi-600 rounded-lg transition-colors"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* GPS option */}
          <button onClick={handleRequestGPS} className="btn-secondary w-full text-sm mb-3">
            <LocateFixed className="w-4 h-4" />
            Use my current location
          </button>

          {/* City search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-saathi-400" />
            <input
              type="text"
              value={cityQuery}
              onChange={(e) => handleCityQueryChange(e.target.value)}
              placeholder="Search city or region…"
              className="input-field pl-10"
            />
            {citySearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-saathi-400 animate-spin" />
            )}
          </div>

          {cityResults.length > 0 && (
            <ul className="rounded-xl border border-saathi-100 overflow-hidden divide-y divide-saathi-50">
              {cityResults.map((city) => (
                <li key={city.id}>
                  <button
                    onClick={() => handleCitySelect(city)}
                    className="w-full text-left px-4 py-2.5 hover:bg-saathi-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-saathi-900">{city.name}</span>
                    {city.admin1 && (
                      <span className="text-xs text-saathi-500 ml-2">{city.admin1}, {city.country}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {cityQuery.length >= 2 && cityResults.length === 0 && !citySearching && (
            <p className="text-sm text-saathi-500 text-center py-3">No cities found for "{cityQuery}"</p>
          )}
        </div>
      )}
    </div>
  );
}

function ForecastDay({ day }: { day: DayForecast }) {
  const info = getWeatherInfo(day.weatherCode);
  const hasRain = isRainyWeather(day.weatherCode) || day.precipitationProbabilityMax > 40;

  return (
    <div className={`text-center rounded-xl p-1.5 ${hasRain ? 'bg-harvest-50' : 'bg-saathi-50/60'}`}>
      <p className="text-[10px] font-medium text-saathi-500 mb-0.5">{day.dayName}</p>
      <span className="text-base block mb-0.5">{info.icon}</span>
      <p className="text-xs font-bold text-saathi-900">{day.tempMax}°</p>
      <p className="text-[10px] text-saathi-400">{day.tempMin}°</p>
      {day.precipitationProbabilityMax > 0 && (
        <div
          className={`flex items-center justify-center gap-0.5 text-[9px] mt-0.5 ${hasRain ? 'text-harvest-700 font-semibold' : 'text-saathi-400'}`}
          title={`${day.precipitationProbabilityMax}% chance of precipitation${day.precipitationSum > 0 ? ` (~${day.precipitationSum} mm expected)` : ''}`}
        >
          <Droplets className="w-2 h-2" />
          {day.precipitationProbabilityMax}%
        </div>
      )}
    </div>
  );
}
