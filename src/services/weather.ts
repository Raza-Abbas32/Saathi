/**
 * Weather service using Open-Meteo — free, no API key required.
 * https://open-meteo.com/
 *
 * Location state is persisted in localStorage so permission is only
 * requested once and the last-known coordinates survive page reloads.
 */

export interface CurrentWeather {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity?: number;
  isDay: boolean;
  apparentTemperature?: number;
  precipitation?: number;
  windDirection?: number;
  windDirectionCompass?: string;
  soilTemperature0cm?: number;
  soilMoisture0to1cm?: number;
  et0?: number;
}

export interface DayForecast {
  date: string;
  dayName: string;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  weatherCode: number;
  apparentTempMax?: number;
  apparentTempMin?: number;
  windSpeedMax?: number;
  windDirectionDominant?: number;
  sunrise?: string;
  sunset?: string;
  et0?: number;
}

export interface HourlyForecast {
  time: string;
  timestamp: number;
  temperature: number;
  apparentTemperature?: number;
  humidity?: number;
  precipitationProbability?: number;
  precipitationAmount?: number;
  weatherCode: number;
  windSpeed: number;
  windDirection?: number;
  soilTemperature0cm?: number;
  soilTemperature6cm?: number;
  soilMoisture0to1cm?: number;
  soilMoisture1to3cm?: number;
  et0?: number;
}

export interface SprayingAssessment {
  suitable: boolean;
  windSpeed: number;
  windStatus: 'calm' | 'favorable' | 'high_drift_risk';
  rainRiskNext6h: number;
  recommendation: string;
}

export interface IrrigationAssessment {
  advisable: boolean;
  rainRiskNext24h: number;
  expectedRainSum24h: number;
  et0Daily?: number;
  recommendation: string;
}

export interface HeatStressAssessment {
  level: 'normal' | 'moderate' | 'high' | 'severe';
  maxTempToday: number;
  apparentTempMax?: number;
  recommendation: string;
}

export interface WindAssessment {
  maxWindSpeed: number;
  status: 'safe' | 'moderate' | 'strong';
  recommendation: string;
}

export interface TomorrowComparison {
  tomorrowBetterForWork: boolean;
  rainRiskTomorrow: number;
  windTomorrow: number;
  summary: string;
}

export interface AgriculturalMetrics {
  et0DailySum?: number;
  soilMoistureSurface?: number;
  soilMoistureRootZone?: number;
  soilTemperatureSurface?: number;
  soilTemperatureRootZone?: number;
  sprayingAssessment?: SprayingAssessment;
  irrigationAssessment?: IrrigationAssessment;
  heatStressAssessment?: HeatStressAssessment;
  windAssessment?: WindAssessment;
  tomorrowComparison?: TomorrowComparison;
}

export interface WeatherData {
  current: CurrentWeather;
  forecast: DayForecast[];
  hourly?: HourlyForecast[];
  agricultural?: AgriculturalMetrics;
  locationName: string;
  latitude: number;
  longitude: number;
}

export type LocationStatus = 'idle' | 'granted' | 'denied' | 'manual';

interface PersistedLocation {
  latitude: number;
  longitude: number;
  name: string;
  status: LocationStatus;
  savedAt: number;
}

const LOCATION_KEY = 'saathi-weather-location';
const CACHE_KEY = 'saathi-weather-cache';
const LOCATION_TTL = 60 * 60 * 1000;  // 1 hour — re-check GPS position
const CACHE_TTL  = 30 * 60 * 1000;    // 30 min — don't re-fetch on every open

// Default location: Faisalabad — Pakistan's agricultural heartland
export const DEFAULT_LOCATION: PersistedLocation = {
  latitude: 31.4181,
  longitude: 73.0776,
  name: 'Faisalabad',
  status: 'denied',
  savedAt: 0,
};

// ── Persistence helpers ────────────────────────────────────────────────────

export function loadPersistedLocation(): PersistedLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    const loc = JSON.parse(raw) as PersistedLocation;
    // If location is stale, discard so GPS is re-checked
    if (Date.now() - loc.savedAt > LOCATION_TTL) {
      localStorage.removeItem(LOCATION_KEY);
      return null;
    }
    return loc;
  } catch {
    return null;
  }
}

export function saveLocation(loc: PersistedLocation): void {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify({ ...loc, savedAt: Date.now() }));
  } catch { /* quota */ }
}

export function loadCachedWeather(): WeatherData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, savedAt } = JSON.parse(raw) as { data: WeatherData; savedAt: number };
    if (Date.now() - savedAt > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveCachedWeather(data: WeatherData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
  } catch { /* quota */ }
}

// ── Geolocation ────────────────────────────────────────────────────────────

/**
 * Request GPS location from the browser.
 * Returns granted coords or null if denied/unavailable.
 */
export function requestGeolocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: LOCATION_TTL }
    );
  });
}

// ── Reverse-geocode a city name from coordinates (Open-Meteo geocoding) ───

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) return 'Your area';
    const json = await res.json();
    const r = json.results?.[0];
    if (!r) return 'Your area';
    return r.name ?? r.admin1 ?? 'Your area';
  } catch {
    return 'Your area';
  }
}

// ── City search ────────────────────────────────────────────────────────────

export interface CityResult {
  id: number;
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
}

export async function searchCity(query: string): Promise<CityResult[]> {
  if (query.trim().length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.results ?? []) as CityResult[];
}

// ── Weather code helpers ───────────────────────────────────────────────────

/**
 * Map Open-Meteo weather codes to human-readable descriptions and icons.
 * Codes: https://open-meteo.com/en/docs
 */
export function getWeatherInfo(code: number): { label: string; icon: string } {
  const map: Record<number, { label: string; icon: string }> = {
    0:  { label: 'Clear sky',               icon: '☀️' },
    1:  { label: 'Mainly clear',             icon: '🌤️' },
    2:  { label: 'Partly cloudy',            icon: '⛅' },
    3:  { label: 'Overcast',                 icon: '☁️' },
    45: { label: 'Foggy',                    icon: '🌫️' },
    48: { label: 'Icy fog',                  icon: '🌫️' },
    51: { label: 'Light drizzle',            icon: '🌦️' },
    53: { label: 'Drizzle',                  icon: '🌦️' },
    55: { label: 'Heavy drizzle',            icon: '🌧️' },
    56: { label: 'Freezing drizzle',         icon: '🌧️' },
    57: { label: 'Heavy freezing drizzle',   icon: '🌧️' },
    61: { label: 'Light rain',               icon: '🌦️' },
    63: { label: 'Rain',                     icon: '🌧️' },
    65: { label: 'Heavy rain',               icon: '🌧️' },
    66: { label: 'Freezing rain',            icon: '🌧️' },
    67: { label: 'Heavy freezing rain',      icon: '🌧️' },
    71: { label: 'Light snow',               icon: '🌨️' },
    73: { label: 'Snow',                     icon: '🌨️' },
    75: { label: 'Heavy snow',               icon: '❄️' },
    77: { label: 'Snow grains',              icon: '❄️' },
    80: { label: 'Light showers',            icon: '🌦️' },
    81: { label: 'Showers',                  icon: '🌧️' },
    82: { label: 'Heavy showers',            icon: '🌧️' },
    85: { label: 'Light snow showers',       icon: '🌨️' },
    86: { label: 'Heavy snow showers',       icon: '❄️' },
    95: { label: 'Thunderstorm',             icon: '⛈️' },
    96: { label: 'Thunderstorm with hail',   icon: '⛈️' },
    99: { label: 'Severe thunderstorm',      icon: '⛈️' },
  };
  return map[code] ?? { label: 'Unknown', icon: '🌡️' };
}

/** Convert degrees to a 16-point compass direction abbreviation. */
export function degreesToCompass(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((deg % 360) / 22.5) % 16;
  return directions[index];
}

/** Check if a weather code indicates rain (relevant for farming decisions). */
export function isRainyWeather(code: number): boolean {
  return [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
}

// ── Core fetch ─────────────────────────────────────────────────────────────

/** Fetch weather for specific coordinates from Open-Meteo. */
export async function fetchWeatherForCoords(
  latitude: number,
  longitude: number,
  locationName: string
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day',
    hourly: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,soil_temperature_0cm,soil_temperature_6cm,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,et0_fao_evapotranspiration',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,et0_fao_evapotranspiration',
    timezone: 'auto',
    forecast_days: '7',
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) {
    throw new Error('Weather service unavailable. Please try again later.');
  }
  const data = await response.json();

  const current: CurrentWeather = {
    temperature: Math.round(data.current.temperature_2m),
    weatherCode: data.current.weather_code,
    windSpeed: Math.round(data.current.wind_speed_10m),
    humidity: data.current.relative_humidity_2m != null ? Math.round(data.current.relative_humidity_2m) : undefined,
    isDay: data.current.is_day === 1,
    apparentTemperature: data.current.apparent_temperature != null ? Math.round(data.current.apparent_temperature) : undefined,
    precipitation: data.current.precipitation != null ? Number(data.current.precipitation) : 0,
    windDirection: data.current.wind_direction_10m != null ? Math.round(data.current.wind_direction_10m) : undefined,
    windDirectionCompass: data.current.wind_direction_10m != null ? degreesToCompass(data.current.wind_direction_10m) : undefined,
    soilTemperature0cm: data.hourly?.soil_temperature_0cm?.[0] != null ? Math.round(data.hourly.soil_temperature_0cm[0] * 10) / 10 : undefined,
    soilMoisture0to1cm: data.hourly?.soil_moisture_0_to_1cm?.[0] != null ? Math.round(data.hourly.soil_moisture_0_to_1cm[0] * 1000) / 1000 : undefined,
    et0: data.daily?.et0_fao_evapotranspiration?.[0] != null ? Math.round(data.daily.et0_fao_evapotranspiration[0] * 10) / 10 : undefined,
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const forecast: DayForecast[] = data.daily.time.map((date: string, i: number) => {
    const d = new Date(date + 'T00:00:00');
    return {
      date,
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[d.getDay()],
      tempMax: Math.round(data.daily.temperature_2m_max[i]),
      tempMin: Math.round(data.daily.temperature_2m_min[i]),
      precipitationSum: data.daily.precipitation_sum[i] != null ? Number(data.daily.precipitation_sum[i]) : 0,
      precipitationProbabilityMax: data.daily.precipitation_probability_max[i] != null ? Math.round(data.daily.precipitation_probability_max[i]) : 0,
      weatherCode: data.daily.weather_code[i],
      apparentTempMax: data.daily.apparent_temperature_max?.[i] != null ? Math.round(data.daily.apparent_temperature_max[i]) : undefined,
      apparentTempMin: data.daily.apparent_temperature_min?.[i] != null ? Math.round(data.daily.apparent_temperature_min[i]) : undefined,
      windSpeedMax: data.daily.wind_speed_10m_max?.[i] != null ? Math.round(data.daily.wind_speed_10m_max[i]) : undefined,
      windDirectionDominant: data.daily.wind_direction_10m_dominant?.[i] != null ? Math.round(data.daily.wind_direction_10m_dominant[i]) : undefined,
      sunrise: data.daily.sunrise?.[i],
      sunset: data.daily.sunset?.[i],
      et0: data.daily.et0_fao_evapotranspiration?.[i] != null ? Math.round(data.daily.et0_fao_evapotranspiration[i] * 10) / 10 : undefined,
    };
  });

  // Map first 48 hours for short-term operational decisions
  const hourlyCount = Math.min(data.hourly?.time?.length ?? 0, 48);
  const hourly: HourlyForecast[] = [];
  for (let h = 0; h < hourlyCount; h++) {
    hourly.push({
      time: data.hourly.time[h],
      timestamp: new Date(data.hourly.time[h]).getTime(),
      temperature: Math.round(data.hourly.temperature_2m[h]),
      apparentTemperature: data.hourly.apparent_temperature?.[h] != null ? Math.round(data.hourly.apparent_temperature[h]) : undefined,
      humidity: data.hourly.relative_humidity_2m?.[h] != null ? Math.round(data.hourly.relative_humidity_2m[h]) : undefined,
      precipitationProbability: data.hourly.precipitation_probability?.[h] != null ? Math.round(data.hourly.precipitation_probability[h]) : undefined,
      precipitationAmount: data.hourly.precipitation?.[h] != null ? Number(data.hourly.precipitation[h]) : undefined,
      weatherCode: data.hourly.weather_code[h],
      windSpeed: Math.round(data.hourly.wind_speed_10m[h]),
      windDirection: data.hourly.wind_direction_10m?.[h] != null ? Math.round(data.hourly.wind_direction_10m[h]) : undefined,
      soilTemperature0cm: data.hourly.soil_temperature_0cm?.[h] != null ? Math.round(data.hourly.soil_temperature_0cm[h] * 10) / 10 : undefined,
      soilTemperature6cm: data.hourly.soil_temperature_6cm?.[h] != null ? Math.round(data.hourly.soil_temperature_6cm[h] * 10) / 10 : undefined,
      soilMoisture0to1cm: data.hourly.soil_moisture_0_to_1cm?.[h] != null ? Math.round(data.hourly.soil_moisture_0_to_1cm[h] * 1000) / 1000 : undefined,
      soilMoisture1to3cm: data.hourly.soil_moisture_1_to_3cm?.[h] != null ? Math.round(data.hourly.soil_moisture_1_to_3cm[h] * 1000) / 1000 : undefined,
      et0: data.hourly.et0_fao_evapotranspiration?.[h] != null ? Math.round(data.hourly.et0_fao_evapotranspiration[h] * 100) / 100 : undefined,
    });
  }

  // Calculate clean agricultural metrics for downstream decision engine
  const next6Hours = hourly.slice(0, 6);
  const maxRainProbNext6h = next6Hours.length > 0
    ? Math.max(...next6Hours.map((x) => x.precipitationProbability ?? 0))
    : (forecast[0]?.precipitationProbabilityMax ?? 0);

  const next24Hours = hourly.slice(0, 24);
  const maxRainProb24h = next24Hours.length > 0
    ? Math.max(...next24Hours.map((x) => x.precipitationProbability ?? 0))
    : (forecast[0]?.precipitationProbabilityMax ?? 0);
  const rainSum24h = forecast[0]?.precipitationSum ?? 0;
  const todayET0 = forecast[0]?.et0;
  const maxWindToday = forecast[0]?.windSpeedMax ?? current.windSpeed;
  const maxTempToday = forecast[0]?.tempMax ?? current.temperature;
  const apparentMaxToday = forecast[0]?.apparentTempMax ?? current.apparentTemperature;

  const sprayingAssessment: SprayingAssessment = {
    suitable: current.windSpeed <= 15 && maxRainProbNext6h < 35,
    windSpeed: current.windSpeed,
    windStatus: current.windSpeed > 18 ? 'high_drift_risk' : current.windSpeed >= 12 ? 'favorable' : 'calm',
    rainRiskNext6h: maxRainProbNext6h,
    recommendation: current.windSpeed > 18
      ? `Wind speed (${current.windSpeed} km/h) creates spray drift risk. Postpone chemical spray until winds calm.`
      : maxRainProbNext6h >= 35
      ? `Precipitation probability is elevated (~${maxRainProbNext6h}% chance in next 6h). Foliar chemicals may wash off.`
      : `Current wind (${current.windSpeed} km/h) and low rain risk (~${maxRainProbNext6h}% chance) are favorable for spraying.`,
  };

  const irrigationAssessment: IrrigationAssessment = {
    advisable: maxRainProb24h < 45 && rainSum24h < 4,
    rainRiskNext24h: maxRainProb24h,
    expectedRainSum24h: rainSum24h,
    et0Daily: todayET0,
    recommendation: maxRainProb24h >= 45 || rainSum24h >= 4
      ? `Precipitation risk detected (~${maxRainProb24h}% chance, ~${rainSum24h} mm expected). Pause irrigation to prevent waterlogging.`
      : todayET0 != null && todayET0 > 5
      ? `High crop water demand (ET₀ ~${todayET0} mm/day) with low rain probability (~${maxRainProb24h}%). Regular irrigation recommended.`
      : `Low rain probability (~${maxRainProb24h}%). Irrigate according to standard field schedule.`,
  };

  const heatStressAssessment: HeatStressAssessment = {
    level: maxTempToday >= 40 ? 'severe' : maxTempToday >= 36 ? 'high' : maxTempToday >= 32 ? 'moderate' : 'normal',
    maxTempToday,
    apparentTempMax: apparentMaxToday,
    recommendation: maxTempToday >= 40
      ? `Severe daytime heat forecasted (${maxTempToday}°C). Avoid mid-day field stress; irrigate early morning.`
      : maxTempToday >= 36
      ? `High daytime heat (${maxTempToday}°C). Monitor delicate seedlings and shallow root crops for moisture loss.`
      : `Daytime temperature (${maxTempToday}°C) within normal agricultural thresholds.`,
  };

  const windAssessment: WindAssessment = {
    maxWindSpeed: maxWindToday,
    status: maxWindToday >= 25 ? 'strong' : maxWindToday >= 15 ? 'moderate' : 'safe',
    recommendation: maxWindToday >= 25
      ? `Strong winds expected up to ${maxWindToday} km/h. Secure loose covers and inspect tall crops like maize or sugarcane.`
      : `Wind conditions (${maxWindToday} km/h peak) are safe for standard farm operations.`,
  };

  const tomorrowDay = forecast[1];
  const tomorrowComparison: TomorrowComparison | undefined = tomorrowDay
    ? {
        tomorrowBetterForWork:
          (tomorrowDay.precipitationProbabilityMax <= forecast[0].precipitationProbabilityMax) &&
          ((tomorrowDay.windSpeedMax ?? 15) <= (forecast[0].windSpeedMax ?? 15)),
        rainRiskTomorrow: tomorrowDay.precipitationProbabilityMax,
        windTomorrow: tomorrowDay.windSpeedMax ?? 0,
        summary: tomorrowDay.precipitationProbabilityMax < forecast[0].precipitationProbabilityMax
          ? `Tomorrow shows lower precipitation risk (~${tomorrowDay.precipitationProbabilityMax}% vs ~${forecast[0].precipitationProbabilityMax}% today).`
          : `Tomorrow has similar weather conditions (~${tomorrowDay.precipitationProbabilityMax}% rain risk, ~${tomorrowDay.windSpeedMax ?? 0} km/h wind).`,
      }
    : undefined;

  const agricultural: AgriculturalMetrics = {
    et0DailySum: todayET0,
    soilMoistureSurface: current.soilMoisture0to1cm,
    soilMoistureRootZone: hourly[0]?.soilMoisture1to3cm,
    soilTemperatureSurface: current.soilTemperature0cm,
    soilTemperatureRootZone: hourly[0]?.soilTemperature6cm,
    sprayingAssessment,
    irrigationAssessment,
    heatStressAssessment,
    windAssessment,
    tomorrowComparison,
  };

  const result: WeatherData = {
    current,
    forecast,
    hourly,
    agricultural,
    locationName,
    latitude,
    longitude,
  };

  saveCachedWeather(result);
  return result;
}

/**
 * High-level fetch — checks cache first, then uses persisted or default location.
 * Does NOT touch geolocation — that is handled by the UI component.
 */
export async function fetchWeather(
  lat: number,
  lon: number,
  name: string
): Promise<WeatherData> {
  // Return cached data for same coordinates if fresh
  const cached = loadCachedWeather();
  if (
    cached &&
    Math.abs(cached.latitude - lat) < 0.05 &&
    Math.abs(cached.longitude - lon) < 0.05
  ) {
    return cached;
  }
  return fetchWeatherForCoords(lat, lon, name);
}
