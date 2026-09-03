/**
 * Saathi Crop Lifecycle Intelligence Service
 *
 * Evaluates:
 *  1. FarmContext (currentCrop, cropVariety, sowingDate, cropStage)
 *  2. Current calendar date
 *
 * To generate structured CropLifecycleContext:
 *  - Elapsed days since sowing (handling future and same-day sowing safely)
 *  - Qualitative growth phase (early, developing, reproductive, late-season, harvest)
 *  - Conservative stage consistency check (reporting "Stage/date mismatch" rather than mutating)
 *  - Missing data detection
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 PRIVACY GUARANTEE:
 * 100% local on-device evaluation. ZERO data is transmitted to external servers,
 * cloud databases, or AI models.
 *
 * ⚠️ SOURCE OF TRUTH GUARANTEE:
 * The farmer-selected cropStage is the absolute source of truth.
 * This service NEVER automatically overwrites or silently alters the farmer's stage.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { FarmContext, CropStage } from '../types/farm';
import type {
  CropLifecycleContext,
  LifecycleProgress,
  StageConsistency,
} from '../types/cropLifecycle';
import { getFarmContext } from './farmContext';

/**
 * Calculates days elapsed between sowing date and a reference date (defaults to today).
 *
 * Guarantees:
 * - If sowingDate is missing or invalid: returns null (does not guess).
 * - If sowingDate is in the future: does not return a negative number; marks isUpcomingSowing = true.
 * - If sowingDate is today: returns 0 days.
 */
export function calculateDaysSinceSowing(
  sowingDateStr?: string,
  referenceDate: Date = new Date()
): {
  daysSinceSowing: number | null;
  isUpcomingSowing: boolean;
  daysUntilSowing?: number;
} {
  if (!sowingDateStr || !sowingDateStr.trim()) {
    return { daysSinceSowing: null, isUpcomingSowing: false };
  }

  const parts = sowingDateStr.trim().split('-');
  if (parts.length !== 3) {
    return { daysSinceSowing: null, isUpcomingSowing: false };
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return { daysSinceSowing: null, isUpcomingSowing: false };
  }

  // Use midnight representation to avoid timezone and hour skew
  const sowingDate = new Date(year, month, day);
  const refMidnight = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  const diffMs = refMidnight.getTime() - sowingDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // Sowing date is in the future
    return {
      daysSinceSowing: null,
      isUpcomingSowing: true,
      daysUntilSowing: Math.abs(diffDays),
    };
  }

  return {
    daysSinceSowing: diffDays,
    isUpcomingSowing: false,
  };
}

/**
 * Maps farmer-selected cropStage into a qualitative growth phase.
 * We avoid manufacturing false percentage completions (e.g., "64%")
 * in the absence of authoritative scientific variety tables.
 */
export function getQualitativePhase(stage?: CropStage): LifecycleProgress {
  if (!stage) return 'unknown';

  switch (stage) {
    case 'Land preparation':
    case 'Sowing':
    case 'Germination':
      return 'early';
    case 'Vegetative growth':
      return 'developing';
    case 'Flowering':
    case 'Fruiting / grain filling':
      return 'reproductive';
    case 'Maturity':
      return 'late-season';
    case 'Harvest':
      return 'harvest';
    default:
      return 'unknown';
  }
}

/**
 * Assesses consistency between sowing date and selected crop stage.
 *
 * Rules:
 * - If no crop stage or no sowing date: 'unknown'.
 * - If future sowing date with post-germination stage: reports "Stage/date mismatch".
 * - If same-day/1-day sowing with flowering/fruiting/harvest: reports "Stage/date mismatch".
 * - For general realistic durations: outputs 'unknown' because no authoritative
 *   crop-specific lifecycle duration table exists in the project.
 * - NEVER mutates or overwrites the farmer's stage.
 */
export function evaluateStageConsistency(
  stage?: CropStage,
  daysSinceSowing: number | null = null,
  isUpcomingSowing: boolean = false,
  sowingDateStr?: string
): {
  consistency: StageConsistency;
  explanation: string;
} {
  if (!stage) {
    return {
      consistency: 'unknown',
      explanation: 'Current crop stage has not been selected.',
    };
  }

  if (!sowingDateStr) {
    return {
      consistency: 'unknown',
      explanation: 'Sowing date is not available; stage consistency cannot be compared with elapsed duration.',
    };
  }

  // Case 1: Sowing is in the future
  if (isUpcomingSowing) {
    if (stage === 'Land preparation' || stage === 'Sowing') {
      return {
        consistency: 'consistent',
        explanation: 'Sowing date is upcoming, consistent with pre-planting / preparation phase.',
      };
    }
    return {
      consistency: 'possibly_inconsistent',
      explanation: `Stage/date mismatch: Sowing date is in the future (${sowingDateStr}), but current crop stage is set to '${stage}'.`,
    };
  }

  // Case 2: Same-day sowing (0 days elapsed)
  if (daysSinceSowing === 0) {
    if (stage === 'Land preparation' || stage === 'Sowing') {
      return {
        consistency: 'consistent',
        explanation: 'Sowing recorded for today, consistent with initial crop establishment.',
      };
    }
    return {
      consistency: 'possibly_inconsistent',
      explanation: `Stage/date mismatch: Sowing was recorded today (0 days elapsed), but growth stage is selected as '${stage}'.`,
    };
  }

  // Case 3: 1 day elapsed
  if (daysSinceSowing === 1) {
    if (
      stage === 'Flowering' ||
      stage === 'Fruiting / grain filling' ||
      stage === 'Maturity' ||
      stage === 'Harvest'
    ) {
      return {
        consistency: 'possibly_inconsistent',
        explanation: `Stage/date mismatch: Sowing was recorded 1 day ago, which does not match '${stage}' stage.`,
      };
    }
  }

  // Case 4: General realistic duration with no authoritative crop database
  return {
    consistency: 'unknown',
    explanation: 'No authoritative crop-specific lifecycle duration data is available.',
  };
}

/**
 * Evaluates comprehensive crop lifecycle context for a given FarmContext.
 *
 * Pure evaluation function. Accepts optional referenceDate for deterministic testing.
 */
export function evaluateCropLifecycle(
  farm?: FarmContext | null,
  referenceDate: Date = new Date()
): CropLifecycleContext {
  const missingInformation: string[] = [];
  const lifecycleNotes: string[] = [];

  const crop = farm?.currentCrop?.trim() || undefined;
  const variety = farm?.cropVariety?.trim() || undefined;
  const sowingDate = farm?.sowingDate?.trim() || undefined;
  // ⚠️ CRITICAL: Preserving farmer-selected cropStage as the source of truth
  const currentStage: CropStage | undefined = farm?.cropStage;

  // Track missing profile parameters
  if (!crop) {
    missingInformation.push('Crop information is missing.');
  }
  if (!variety) {
    missingInformation.push('Crop variety is not specified.');
  }
  if (!sowingDate) {
    missingInformation.push('Sowing date is not available.');
  }
  if (!currentStage) {
    missingInformation.push('Current crop stage has not been selected.');
  }

  // Calculate elapsed days
  const { daysSinceSowing, isUpcomingSowing, daysUntilSowing } = calculateDaysSinceSowing(
    sowingDate,
    referenceDate
  );

  // Derive qualitative lifecycle progress from farmer's stage
  const lifecycleProgress = getQualitativePhase(currentStage);

  // Evaluate consistency conservatively
  const { consistency: stageConsistency, explanation: stageExplanation } =
    evaluateStageConsistency(currentStage, daysSinceSowing, isUpcomingSowing, sowingDate);

  // Populate contextual agronomic notes
  if (isUpcomingSowing && daysUntilSowing !== undefined) {
    lifecycleNotes.push(`Sowing date is upcoming in ${daysUntilSowing} day(s).`);
  } else if (daysSinceSowing !== null) {
    lifecycleNotes.push(`${daysSinceSowing} day(s) elapsed since recorded sowing date.`);
  }

  if (currentStage === 'Flowering' || currentStage === 'Fruiting / grain filling') {
    lifecycleNotes.push(
      'Reproductive phase: Crop is sensitive to high heat stress and severe moisture deficits.'
    );
  } else if (currentStage === 'Vegetative growth') {
    lifecycleNotes.push(
      'Developing canopy: Ensure adequate weed control and uniform soil moisture.'
    );
  } else if (currentStage === 'Germination' || currentStage === 'Sowing') {
    lifecycleNotes.push(
      'Establishment phase: Maintain gentle, uniform moisture to avoid crusting or seed wash-out.'
    );
  } else if (currentStage === 'Maturity') {
    lifecycleNotes.push(
      'Maturity phase: Reduce irrigation gradually and monitor seed/boll/grain hardness.'
    );
  } else if (currentStage === 'Harvest') {
    lifecycleNotes.push(
      'Harvest phase: Prioritize clear, rainless windows to avoid post-harvest field losses.'
    );
  }

  return {
    crop,
    variety,
    sowingDate,
    currentStage, // preserved without modification
    daysSinceSowing,
    isUpcomingSowing,
    daysUntilSowing,
    lifecycleProgress,
    stageConsistency,
    stageExplanation,
    missingInformation,
    lifecycleNotes,
    evaluatedAt: Date.now(),
  };
}

/**
 * Convenience helper: Evaluates lifecycle context using active stored FarmContext.
 */
export function getCropLifecycleContext(referenceDate?: Date): CropLifecycleContext {
  const farm = getFarmContext();
  return evaluateCropLifecycle(farm, referenceDate);
}
