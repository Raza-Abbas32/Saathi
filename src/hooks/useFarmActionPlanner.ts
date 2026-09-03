import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFarmContext } from './useFarmContext';
import { useFarmDecision } from './useFarmDecision';
import { evaluateFarmActionPlan } from '../services/farmActionPlanner';
import { getGovernmentMarketPrices } from '../services/marketPriceService';
import type {
  FarmActionPlan,
} from '../types/farmActionPlanner';
import type { DiseaseWeatherAssessment } from '../types/diseaseWeather';
import type { DiseaseResult } from '../types';
import type { NormalizedMarketCropPrice } from '../types/market';

export interface UseFarmActionPlannerOptions {
  diseaseAssessment?: DiseaseWeatherAssessment | null;
  diseaseResult?: DiseaseResult | null;
  marketPrices?: NormalizedMarketCropPrice[] | null;
  currentDate?: Date;
}

export function useFarmActionPlanner(options: UseFarmActionPlannerOptions = {}) {
  const { farmContext } = useFarmContext();
  const { weather, decisionResult, isLoading: isWeatherLoading, refreshDecisions } = useFarmDecision();

  const [marketPrices, setMarketPrices] = useState<NormalizedMarketCropPrice[] | null>(
    options.marketPrices || null
  );

  // Load market prices if not provided as options
  useEffect(() => {
    if (options.marketPrices) {
      setMarketPrices(options.marketPrices);
      return;
    }

    let isMounted = true;
    getGovernmentMarketPrices()
      .then((res) => {
        if (isMounted && res && res.prices) {
          setMarketPrices(res.prices);
        }
      })
      .catch((err) => {
        console.warn('[useFarmActionPlanner] Error loading market prices:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [options.marketPrices]);

  const plan: FarmActionPlan = useMemo(() => {
    return evaluateFarmActionPlan({
      farmContext,
      weather,
      decisionResult,
      diseaseAssessment: options.diseaseAssessment,
      diseaseResult: options.diseaseResult,
      marketPrices,
      currentDate: options.currentDate,
    });
  }, [
    farmContext,
    weather,
    decisionResult,
    options.diseaseAssessment,
    options.diseaseResult,
    marketPrices,
    options.currentDate,
  ]);

  const refreshPlan = useCallback(async () => {
    await refreshDecisions();
  }, [refreshDecisions]);

  return {
    plan,
    farmContext,
    weather,
    decisionResult,
    isLoading: isWeatherLoading,
    refreshPlan,
  };
}
