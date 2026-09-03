/**
 * Saathi Farm Outcomes React Hook
 *
 * Provides reactive access to locally persisted farm action outcomes,
 * private farm memory logs, and helper methods.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getFarmOutcomes,
  saveFarmOutcome,
  updateFarmOutcome,
  deleteFarmOutcome,
  clearFarmOutcomes,
  getOutcomesForAction,
  getRecentFarmOutcomes,
  getOutcomeHistoricalContext,
  FARM_OUTCOMES_EVENT,
  type CreateFarmOutcomeInput,
} from '../services/farmOutcomeService';
import type {
  FarmActionOutcome,
  FarmOutcomeFilterCategory,
  FarmOutcomeHistoricalContext,
} from '../types/farmOutcome';
import type { FarmActionCategory } from '../types/farmActionPlanner';

export function useFarmOutcomes() {
  const [outcomes, setOutcomes] = useState<FarmActionOutcome[]>(() => getFarmOutcomes());
  const [filterCategory, setFilterCategory] = useState<FarmOutcomeFilterCategory>('ALL');

  const refresh = useCallback(() => {
    setOutcomes(getFarmOutcomes());
  }, []);

  useEffect(() => {
    const handleOutcomeUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<FarmActionOutcome[]>;
      if (customEvent.detail) {
        setOutcomes(customEvent.detail);
      } else {
        refresh();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'saathi-farm-outcomes') {
        refresh();
      }
    };

    window.addEventListener(FARM_OUTCOMES_EVENT, handleOutcomeUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(FARM_OUTCOMES_EVENT, handleOutcomeUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refresh]);

  const recordOutcome = useCallback((input: CreateFarmOutcomeInput): FarmActionOutcome => {
    return saveFarmOutcome(input);
  }, []);

  const editOutcome = useCallback(
    (id: string, partial: Partial<Omit<FarmActionOutcome, 'id' | 'recordedAt'>>): FarmActionOutcome | null => {
      return updateFarmOutcome(id, partial);
    },
    []
  );

  const removeOutcome = useCallback((id: string): boolean => {
    return deleteFarmOutcome(id);
  }, []);

  const clearAll = useCallback((): void => {
    clearFarmOutcomes();
  }, []);

  const getForAction = useCallback((actionId: string): FarmActionOutcome[] => {
    return getOutcomesForAction(actionId);
  }, []);

  const getHistorical = useCallback(
    (actionId: string, category?: FarmActionCategory): FarmOutcomeHistoricalContext | null => {
      return getOutcomeHistoricalContext(actionId, category);
    },
    []
  );

  const filteredOutcomes = outcomes.filter((item) => {
    if (filterCategory === 'ALL') return true;
    return item.actionCategory === filterCategory;
  });

  const recentOutcomes = getRecentFarmOutcomes(5);
  const pendingFollowUps = outcomes.filter((item) => item.followUpNeeded);

  return {
    outcomes,
    filteredOutcomes,
    recentOutcomes,
    pendingFollowUps,
    hasOutcomes: outcomes.length > 0,
    filterCategory,
    setFilterCategory,
    recordOutcome,
    editOutcome,
    removeOutcome,
    clearAll,
    getForAction,
    getHistorical,
    refresh,
  };
}
