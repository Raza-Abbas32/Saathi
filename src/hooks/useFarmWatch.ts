import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFarmContext } from './useFarmContext';
import { useFarmDecision } from './useFarmDecision';
import { useFarmActionPlanner } from './useFarmActionPlanner';
import { useFarmOutcomes } from './useFarmOutcomes';
import {
  getFarmWatchState,
  updateFarmWatchWithCurrentState,
  acknowledgeFarmWatchEvent,
  dismissFarmWatchEvent,
  recordFarmWatchFollowUp,
  FARM_WATCH_UPDATED_EVENT,
} from '../services/farmWatch';
import type {
  DailyFarmBrief,
  FarmWatchFollowUpInput,
  FarmWatchState,
} from '../types/farmWatch';
import type { DiseaseWeatherAssessment } from '../types/diseaseWeather';
import type { DiseaseResult } from '../types';
import type { NormalizedMarketCropPrice } from '../types/market';

export interface UseFarmWatchOptions {
  diseaseAssessment?: DiseaseWeatherAssessment | null;
  diseaseResult?: DiseaseResult | null;
  marketPrices?: NormalizedMarketCropPrice[] | null;
  currentDate?: Date;
}

export function useFarmWatch(options: UseFarmWatchOptions = {}) {
  const { farmContext } = useFarmContext();
  const { weather, decisionResult, isLoading: isWeatherLoading, refreshDecisions } = useFarmDecision();
  const { plan } = useFarmActionPlanner({
    diseaseAssessment: options.diseaseAssessment,
    diseaseResult: options.diseaseResult,
    marketPrices: options.marketPrices,
    currentDate: options.currentDate,
  });
  const { outcomes } = useFarmOutcomes();

  const [watchState, setWatchState] = useState<FarmWatchState>(() => getFarmWatchState());
  const [brief, setBrief] = useState<DailyFarmBrief>(() =>
    updateFarmWatchWithCurrentState({
      farmContext,
      weather,
      decisionResult,
      diseaseAssessment: options.diseaseAssessment,
      diseaseResult: options.diseaseResult,
      farmActionPlan: plan,
      farmOutcomes: outcomes,
      currentDate: options.currentDate,
    }).brief
  );

  // Re-evaluate when inputs change
  const refreshWatch = useCallback(() => {
    const res = updateFarmWatchWithCurrentState({
      farmContext,
      weather,
      decisionResult,
      diseaseAssessment: options.diseaseAssessment,
      diseaseResult: options.diseaseResult,
      farmActionPlan: plan,
      farmOutcomes: outcomes,
      currentDate: options.currentDate,
    });
    setBrief(res.brief);
    setWatchState(res.state);
  }, [
    farmContext,
    weather,
    decisionResult,
    options.diseaseAssessment,
    options.diseaseResult,
    plan,
    outcomes,
    options.currentDate,
  ]);

  // Synchronize on input changes
  useEffect(() => {
    refreshWatch();
  }, [refreshWatch]);

  // Listen for storage / custom events
  useEffect(() => {
    const handleWatchUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<FarmWatchState>;
      if (customEvent.detail) {
        setWatchState(customEvent.detail);
      } else {
        setWatchState(getFarmWatchState());
      }
    };

    window.addEventListener(FARM_WATCH_UPDATED_EVENT, handleWatchUpdate);
    window.addEventListener('storage', handleWatchUpdate);

    return () => {
      window.removeEventListener(FARM_WATCH_UPDATED_EVENT, handleWatchUpdate);
      window.removeEventListener('storage', handleWatchUpdate);
    };
  }, []);

  // Actions
  const handleAcknowledge = useCallback((eventId: string) => {
    const updated = acknowledgeFarmWatchEvent(eventId);
    if (updated) {
      setWatchState(getFarmWatchState());
    }
    return updated;
  }, []);

  const handleDismiss = useCallback((eventId: string) => {
    const success = dismissFarmWatchEvent(eventId);
    if (success) {
      setWatchState(getFarmWatchState());
    }
    return success;
  }, []);

  const handleRecordFollowUp = useCallback(
    (input: FarmWatchFollowUpInput) => {
      const res = recordFarmWatchFollowUp(input, farmContext);
      if (res.event) {
        setWatchState(getFarmWatchState());
        refreshWatch();
      }
      return res;
    },
    [farmContext, refreshWatch]
  );

  // Derived collections
  const activeAlerts = useMemo(() => {
    return watchState.events.filter(
      (e) => e.status === 'NEW' || e.status === 'FOLLOW_UP_NEEDED'
    );
  }, [watchState.events]);

  const pendingFollowUps = useMemo(() => {
    return watchState.events.filter(
      (e) => e.requiresFollowUp && e.status !== 'RESOLVED' && !e.farmerResponse
    );
  }, [watchState.events]);

  return {
    brief,
    events: watchState.events,
    activeAlerts,
    pendingFollowUps,
    hasActiveAlerts: activeAlerts.length > 0,
    hasFollowUpPending: pendingFollowUps.length > 0,
    acknowledgeEvent: handleAcknowledge,
    dismissEvent: handleDismiss,
    recordFollowUp: handleRecordFollowUp,
    refreshWatch,
    refreshDecisions,
    isLoading: isWeatherLoading,
    farmContext,
    plan,
  };
}
