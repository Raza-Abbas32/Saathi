/**
 * Farm Context Service
 *
 * Provides safe local persistence and retrieval for the farmer's Farm Context
 * (land size, province, district, soil type, water source, current crop, stage, etc.).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 PRIVACY & ARCHITECTURAL GUARANTEE:
 * Farm Context contains sensitive personal agricultural data.
 * For this prototype, Farm Context is stored STRICTLY LOCALLY on the farmer's
 * device using localStorage.
 *
 * - It is NEVER sent to Gemini or any external AI service.
 * - It is NEVER sent to Supabase or external cloud databases.
 * - It is NEVER transmitted to third-party tracking or telemetry servers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { FarmContext } from '@/types/farm';
import { loadPersistedLocation, DEFAULT_LOCATION } from '@/services/weather';

export const FARM_CONTEXT_STORAGE_KEY = 'saathi-farm-context';
export const FARM_CONTEXT_EVENT = 'saathi:farm-context-updated';

/**
 * Retrieve the saved Farm Context from localStorage.
 * Returns null if missing, corrupted, or not yet initialized.
 */
export function getFarmContext(): FarmContext | null {
  try {
    const raw = localStorage.getItem(FARM_CONTEXT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FarmContext;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('[FarmContext] Failed to parse farm context from localStorage:', err);
    return null;
  }
}

/**
 * Save a complete Farm Context object to localStorage and notify listeners.
 */
export function saveFarmContext(context: FarmContext): void {
  try {
    const payload: FarmContext = {
      ...context,
      updatedAt: Date.now(),
    };
    localStorage.setItem(FARM_CONTEXT_STORAGE_KEY, JSON.stringify(payload));
    notifyFarmContextUpdated(payload);
  } catch (err) {
    console.error('[FarmContext] Could not save farm context to localStorage:', err);
  }
}

/**
 * Safely merge partial updates into the existing Farm Context.
 * If no context exists yet, initialize a new one with the provided fields
 * and default coordinates from the Weather system.
 */
export function updateFarmContext(partial: Partial<FarmContext>): FarmContext {
  const current = getFarmContext();
  const weatherLoc = loadPersistedLocation() ?? DEFAULT_LOCATION;

  const merged: FarmContext = {
    // Preserve existing coords or fallback to existing Weather coordinates
    latitude: current?.latitude ?? weatherLoc.latitude,
    longitude: current?.longitude ?? weatherLoc.longitude,
    province: current?.province ?? '',
    district: current?.district ?? weatherLoc.name,
    ...current,
    ...partial,
    updatedAt: Date.now(),
  };

  saveFarmContext(merged);
  return merged;
}

/**
 * Remove the Farm Context from localStorage and notify listeners.
 */
export function clearFarmContext(): void {
  try {
    localStorage.removeItem(FARM_CONTEXT_STORAGE_KEY);
    notifyFarmContextUpdated(null);
  } catch (err) {
    console.error('[FarmContext] Could not clear farm context:', err);
  }
}

/**
 * Retrieve the effective coordinates for the farm.
 * Prioritizes explicitly assigned farm coordinates, falling back to the
 * existing Weather location (GPS / manual city) without creating a competing system.
 */
export function getEffectiveFarmLocation(): { latitude: number; longitude: number; name?: string } {
  const farm = getFarmContext();
  if (farm && farm.latitude != null && farm.longitude != null) {
    return {
      latitude: farm.latitude,
      longitude: farm.longitude,
      name: farm.district || farm.province || 'Farm Location',
    };
  }

  const weatherLoc = loadPersistedLocation() ?? DEFAULT_LOCATION;
  return {
    latitude: weatherLoc.latitude,
    longitude: weatherLoc.longitude,
    name: weatherLoc.name,
  };
}

/**
 * Notify reactive React hooks and components that Farm Context changed.
 */
function notifyFarmContextUpdated(context: FarmContext | null): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<FarmContext | null>(FARM_CONTEXT_EVENT, { detail: context })
    );
  }
}
