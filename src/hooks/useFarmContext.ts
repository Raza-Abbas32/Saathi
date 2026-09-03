import { useState, useEffect, useCallback } from 'react';
import { FarmContext } from '@/types/farm';
import {
  getFarmContext,
  saveFarmContext,
  updateFarmContext,
  clearFarmContext,
  FARM_CONTEXT_EVENT,
} from '@/services/farmContext';

/**
 * Reusable React hook for components to access and manipulate Farm Context.
 * Ensures single source of truth across all modules without state divergence.
 */
export function useFarmContext() {
  const [farmContext, setFarmContext] = useState<FarmContext | null>(() => getFarmContext());

  const refreshFarm = useCallback(() => {
    setFarmContext(getFarmContext());
  }, []);

  useEffect(() => {
    const handleContextUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<FarmContext | null>;
      setFarmContext(customEvent.detail ?? null);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'saathi-farm-context') {
        refreshFarm();
      }
    };

    window.addEventListener(FARM_CONTEXT_EVENT, handleContextUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(FARM_CONTEXT_EVENT, handleContextUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshFarm]);

  const saveFarm = useCallback((context: FarmContext) => {
    saveFarmContext(context);
    setFarmContext(context);
  }, []);

  const updateFarm = useCallback((partial: Partial<FarmContext>) => {
    const updated = updateFarmContext(partial);
    setFarmContext(updated);
    return updated;
  }, []);

  const clearFarm = useCallback(() => {
    clearFarmContext();
    setFarmContext(null);
  }, []);

  const hasFarm = Boolean(
    farmContext &&
    (farmContext.farmName ||
      farmContext.province ||
      farmContext.district ||
      farmContext.currentCrop ||
      (farmContext.farmSizeAcres && farmContext.farmSizeAcres > 0))
  );

  return {
    farmContext,
    hasFarm,
    saveFarm,
    updateFarm,
    clearFarm,
    refreshFarm,
  };
}
