import { useState, useEffect, useMemo, useCallback } from 'react';
import { WeatherData, loadCachedWeather, fetchWeather } from '@/services/weather';
import { useFarmContext } from '@/hooks/useFarmContext';
import { getEffectiveFarmLocation } from '@/services/farmContext';
import { evaluateFarmDecisions } from '@/services/farmDecisionEngine';
import { FarmDecisionResult } from '@/types/decision';

/**
 * Custom React hook that coordinates Farm Context and Weather Data
 * to provide real-time agricultural decisions.
 *
 * Uses cached weather data to avoid duplicate fetches, while listening
 * for location or farm profile updates.
 */
export function useFarmDecision() {
  const { farmContext, hasFarm } = useFarmContext();
  const [weather, setWeather] = useState<WeatherData | null>(() => loadCachedWeather());
  const [isLoading, setIsLoading] = useState<boolean>(!weather);

  const refreshWeather = useCallback(async () => {
    // 1. Check if cached weather is still fresh
    const cached = loadCachedWeather();
    if (cached) {
      setWeather(cached);
      setIsLoading(false);
      return;
    }

    // 2. Fetch using effective farm/weather location
    try {
      setIsLoading(true);
      const loc = getEffectiveFarmLocation();
      const data = await fetchWeather(loc.latitude, loc.longitude, loc.name || 'Farm Area');
      setWeather(data);
    } catch (err) {
      console.warn('[useFarmDecision] Could not load weather for decision engine:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check initial cached weather
    const cached = loadCachedWeather();
    if (cached) {
      setWeather(cached);
      setIsLoading(false);
    } else {
      refreshWeather();
    }

    // Listen for weather updates dispatched by WeatherDropdown or other sources
    const handleWeatherUpdated = () => {
      const updatedCache = loadCachedWeather();
      if (updatedCache) {
        setWeather(updatedCache);
        setIsLoading(false);
      }
    };

    window.addEventListener('saathi:weather-updated', handleWeatherUpdated);
    return () => {
      window.removeEventListener('saathi:weather-updated', handleWeatherUpdated);
    };
  }, [refreshWeather]);

  const decisionResult: FarmDecisionResult | null = useMemo(() => {
    if (!weather) return null;
    return evaluateFarmDecisions(farmContext, weather);
  }, [farmContext, weather]);

  return {
    decisionResult,
    weather,
    farmContext,
    hasFarm,
    isLoading,
    refreshDecisions: refreshWeather,
  };
}
