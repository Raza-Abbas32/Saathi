/**
 * Saathi Farm Action Outcome Service
 *
 * Provides safe local persistence, retrieval, and querying for farmer-reported
 * action outcomes and private farm memory logs.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 PRIVACY, SAFETY, & DATA MINIMIZATION GUARANTEES:
 * 1. 100% on-device localStorage storage under key 'saathi-farm-outcomes'.
 * 2. ZERO external network transmission, ZERO telemetry, ZERO third-party analytics.
 * 3. ZERO Gemini / LLM calls.
 * 4. SUBJECTIVE OBSERVATIONS: Stored strictly as farmer-reported qualitative context.
 *    Does NOT modify scientific agronomic models, disease rules, or confidence levels.
 * 5. NO DATA CONTAMINATION: Rejects corrupted or invalid records safely.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  FarmActionOutcome,
  FarmActionTaken,
  FarmActionObservedOutcome,
  FarmOutcomeHistoricalContext,
} from '../types/farmOutcome';
import type { FarmActionCategory } from '../types/farmActionPlanner';

export const FARM_OUTCOMES_STORAGE_KEY = 'saathi-farm-outcomes';
export const FARM_OUTCOMES_EVENT = 'saathi:farm-outcomes-updated';

const VALID_CATEGORIES: ReadonlySet<FarmActionCategory> = new Set([
  'DISEASE',
  'SPRAYING',
  'IRRIGATION',
  'WEATHER',
  'SCOUTING',
  'MARKET',
  'ECONOMIC',
  'CROP_LIFECYCLE',
  'GENERAL',
]);

const VALID_ACTION_TAKEN: ReadonlySet<FarmActionTaken> = new Set([
  'YES',
  'NO',
  'PARTIAL',
  'NOT_SURE',
]);

const VALID_OBSERVED_OUTCOMES: ReadonlySet<FarmActionObservedOutcome> = new Set([
  'IMPROVED',
  'NO_CHANGE',
  'WORSE',
  'TOO_EARLY',
  'UNKNOWN',
]);

/**
 * Validates whether an arbitrary object is a conformant, uncorrupted FarmActionOutcome.
 */
export function isValidOutcomeRecord(item: unknown): item is FarmActionOutcome {
  if (!item || typeof item !== 'object') return false;

  const candidate = item as Record<string, unknown>;

  if (typeof candidate.id !== 'string' || !candidate.id.trim()) {
    return false;
  }
  if (typeof candidate.actionId !== 'string' || !candidate.actionId.trim()) {
    return false;
  }
  if (
    typeof candidate.actionCategory !== 'string' ||
    !VALID_CATEGORIES.has(candidate.actionCategory as FarmActionCategory)
  ) {
    return false;
  }
  if (
    typeof candidate.actionTaken !== 'string' ||
    !VALID_ACTION_TAKEN.has(candidate.actionTaken as FarmActionTaken)
  ) {
    return false;
  }
  if (
    typeof candidate.outcome !== 'string' ||
    !VALID_OBSERVED_OUTCOMES.has(candidate.outcome as FarmActionObservedOutcome)
  ) {
    return false;
  }
  if (
    typeof candidate.recordedAt !== 'string' ||
    isNaN(Date.parse(candidate.recordedAt))
  ) {
    return false;
  }

  // Optional fields validation
  if (candidate.updatedAt !== undefined && typeof candidate.updatedAt !== 'string') {
    return false;
  }
  if (candidate.observation !== undefined && typeof candidate.observation !== 'string') {
    return false;
  }
  if (candidate.followUpNeeded !== undefined && typeof candidate.followUpNeeded !== 'boolean') {
    return false;
  }

  return true;
}

/**
 * Retrieve all valid farm action outcomes from localStorage, sorted by recordedAt DESC (newest first).
 */
export function getFarmOutcomes(): FarmActionOutcome[] {
  try {
    const raw = localStorage.getItem(FARM_OUTCOMES_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('[FarmOutcomeService] Corrupted localStorage payload; expected array.');
      return [];
    }

    const validOutcomes = parsed.filter(isValidOutcomeRecord);

    // Sort deterministically newest first
    validOutcomes.sort((a, b) => {
      const timeA = Date.parse(a.recordedAt) || 0;
      const timeB = Date.parse(b.recordedAt) || 0;
      return timeB - timeA;
    });

    return validOutcomes;
  } catch (err) {
    console.warn('[FarmOutcomeService] Failed to read farm outcomes from localStorage:', err);
    return [];
  }
}

/**
 * Input payload for saving a new outcome record.
 */
export interface CreateFarmOutcomeInput {
  actionId: string;
  actionCategory: FarmActionCategory;
  actionTitle?: string;
  actionDescription?: string;
  actionTaken: FarmActionTaken;
  outcome: FarmActionObservedOutcome;
  observation?: string;
  followUpNeeded?: boolean;
  notes?: string;
  crop?: string;
  cropStage?: string;
  district?: string;
  id?: string;
  recordedAt?: string;
}

/**
 * Save a new outcome record to local device storage.
 */
export function saveFarmOutcome(input: CreateFarmOutcomeInput): FarmActionOutcome {
  if (!input.actionId || !input.actionId.trim()) {
    throw new Error('Cannot save outcome: missing required actionId.');
  }
  if (!VALID_CATEGORIES.has(input.actionCategory)) {
    throw new Error(`Cannot save outcome: invalid category "${input.actionCategory}".`);
  }
  if (!VALID_ACTION_TAKEN.has(input.actionTaken)) {
    throw new Error(`Cannot save outcome: invalid actionTaken "${input.actionTaken}".`);
  }
  if (!VALID_OBSERVED_OUTCOMES.has(input.outcome)) {
    throw new Error(`Cannot save outcome: invalid outcome "${input.outcome}".`);
  }

  const newOutcome: FarmActionOutcome = {
    id: input.id || `outcome-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    actionId: input.actionId.trim(),
    actionCategory: input.actionCategory,
    actionTitle: input.actionTitle?.trim() || undefined,
    actionDescription: input.actionDescription?.trim() || undefined,
    recordedAt: input.recordedAt || new Date().toISOString(),
    actionTaken: input.actionTaken,
    outcome: input.outcome,
    observation: input.observation?.trim() || undefined,
    followUpNeeded: Boolean(input.followUpNeeded),
    notes: input.notes?.trim() || undefined,
    crop: input.crop?.trim() || undefined,
    cropStage: input.cropStage?.trim() || undefined,
    district: input.district?.trim() || undefined,
  };

  try {
    const existing = getFarmOutcomes();
    // Prepend to top
    const updated = [newOutcome, ...existing.filter((item) => item.id !== newOutcome.id)];

    localStorage.setItem(FARM_OUTCOMES_STORAGE_KEY, JSON.stringify(updated));
    notifyFarmOutcomesUpdated(updated);
  } catch (err) {
    console.error('[FarmOutcomeService] Failed to save outcome to localStorage:', err);
  }

  return newOutcome;
}

/**
 * Update an existing outcome record locally.
 */
export function updateFarmOutcome(
  id: string,
  partial: Partial<Omit<FarmActionOutcome, 'id' | 'recordedAt'>>
): FarmActionOutcome | null {
  if (!id) return null;

  try {
    const existing = getFarmOutcomes();
    const index = existing.findIndex((item) => item.id === id);
    if (index === -1) {
      console.warn(`[FarmOutcomeService] Outcome with ID ${id} not found.`);
      return null;
    }

    const current = existing[index];
    const updatedRecord: FarmActionOutcome = {
      ...current,
      ...partial,
      id: current.id,
      recordedAt: current.recordedAt,
      updatedAt: new Date().toISOString(),
    };

    if (!isValidOutcomeRecord(updatedRecord)) {
      console.error('[FarmOutcomeService] Update payload produced invalid outcome record:', updatedRecord);
      return null;
    }

    existing[index] = updatedRecord;
    localStorage.setItem(FARM_OUTCOMES_STORAGE_KEY, JSON.stringify(existing));
    notifyFarmOutcomesUpdated(existing);

    return updatedRecord;
  } catch (err) {
    console.error('[FarmOutcomeService] Failed to update outcome:', err);
    return null;
  }
}

/**
 * Delete a specific outcome record by ID.
 */
export function deleteFarmOutcome(id: string): boolean {
  if (!id) return false;

  try {
    const existing = getFarmOutcomes();
    const filtered = existing.filter((item) => item.id !== id);

    if (filtered.length === existing.length) {
      return false; // Record was not present
    }

    localStorage.setItem(FARM_OUTCOMES_STORAGE_KEY, JSON.stringify(filtered));
    notifyFarmOutcomesUpdated(filtered);
    return true;
  } catch (err) {
    console.error('[FarmOutcomeService] Failed to delete outcome:', err);
    return false;
  }
}

/**
 * Retrieve all outcomes recorded for a specific action ID.
 */
export function getOutcomesForAction(actionId: string): FarmActionOutcome[] {
  if (!actionId) return [];
  const all = getFarmOutcomes();
  return all.filter((item) => item.actionId === actionId);
}

/**
 * Retrieve the top recent outcomes (default: 5).
 */
export function getRecentFarmOutcomes(limit = 5): FarmActionOutcome[] {
  const all = getFarmOutcomes();
  return all.slice(0, Math.max(1, limit));
}

/**
 * Clear all stored outcomes completely from localStorage.
 */
export function clearFarmOutcomes(): void {
  try {
    localStorage.removeItem(FARM_OUTCOMES_STORAGE_KEY);
    notifyFarmOutcomesUpdated([]);
  } catch (err) {
    console.error('[FarmOutcomeService] Failed to clear outcomes:', err);
  }
}

/**
 * Format outcome enum to human-friendly display label.
 */
export function formatOutcomeLabel(outcome: FarmActionObservedOutcome): string {
  switch (outcome) {
    case 'IMPROVED':
      return 'Improved';
    case 'NO_CHANGE':
      return 'No change';
    case 'WORSE':
      return 'Worse';
    case 'TOO_EARLY':
      return 'Too early to tell';
    case 'UNKNOWN':
    default:
      return 'Unknown';
  }
}

/**
 * Format action taken enum to human-friendly display label.
 */
export function formatActionTakenLabel(actionTaken: FarmActionTaken): string {
  switch (actionTaken) {
    case 'YES':
      return 'Followed';
    case 'PARTIAL':
      return 'Partially followed';
    case 'NO':
      return 'Did not follow';
    case 'NOT_SURE':
    default:
      return 'Not sure';
  }
}

/**
 * Provide a lightweight historical context signal for planner cards.
 * Returns null if no historical observations exist.
 */
export function getOutcomeHistoricalContext(
  actionId: string,
  category?: FarmActionCategory
): FarmOutcomeHistoricalContext | null {
  const all = getFarmOutcomes();
  const matches = all.filter((item) => item.actionId === actionId || (category && item.actionCategory === category));

  if (matches.length === 0) {
    return null;
  }

  const latest = matches[0];
  const dateStr = new Date(latest.recordedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  const outcomeLabel = formatOutcomeLabel(latest.outcome);
  const actionTakenLabel = formatActionTakenLabel(latest.actionTaken);

  const contextText = `Previous farm observation (${dateStr}): ${actionTakenLabel} • Outcome: ${outcomeLabel}.`;

  return {
    previousCount: matches.length,
    latestOutcome: latest,
    contextText,
    disclaimer: 'Farmer-reported observation, not a verified agronomic conclusion.',
  };
}

/**
 * Dispatch custom event to notify listeners (hooks and reactive views).
 */
function notifyFarmOutcomesUpdated(outcomes: FarmActionOutcome[]): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<FarmActionOutcome[]>(FARM_OUTCOMES_EVENT, { detail: outcomes })
    );
  }
}
