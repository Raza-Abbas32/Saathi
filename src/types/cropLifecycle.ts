/**
 * Crop Lifecycle Intelligence Types
 *
 * Defines structured context for crop growth phases, days since sowing,
 * stage consistency, and qualitative progress derived from Farm Context.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 PRIVACY GUARANTEE:
 * All lifecycle evaluations execute 100% locally on-device. No farm details,
 * sowing dates, or crop stages are sent to external services or cloud models.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { CropStage } from './farm';

/**
 * Qualitative growth phase mapped from farmer-selected cropStage.
 * We do not manufacture exact percentages (e.g. "63%") without authoritative
 * crop-specific scientific duration tables.
 */
export type LifecycleProgress =
  | 'early'
  | 'developing'
  | 'reproductive'
  | 'late-season'
  | 'harvest'
  | 'unknown';

/**
 * Assessment of alignment between reported sowing date and selected crop stage.
 * Kept conservative to avoid false scientific certainty.
 */
export type StageConsistency = 'consistent' | 'possibly_inconsistent' | 'unknown';

export interface CropLifecycleContext {
  /** Target crop name from farm profile (e.g., Cotton, Wheat, Rice) */
  crop?: string;
  /** Seed or crop variety (e.g., FH-142, Dilkash-20, Super Basmati) */
  variety?: string;
  /** Sowing date string as stored (YYYY-MM-DD) */
  sowingDate?: string;
  /**
   * Farmer-selected crop stage.
   * ⚠️ CRITICAL: Source of truth. NEVER automatically overwritten or changed.
   */
  currentStage?: CropStage;
  /**
   * Elapsed days since sowing date based on current calendar date.
   * null if sowingDate is missing or if sowing date is in the future.
   */
  daysSinceSowing: number | null;
  /** True if sowingDate is scheduled in the future */
  isUpcomingSowing: boolean;
  /** Days remaining until sowing date if in the future, otherwise undefined */
  daysUntilSowing?: number;
  /** Qualitative lifecycle phase based on farmer-selected cropStage */
  lifecycleProgress: LifecycleProgress;
  /** Conservative consistency evaluation */
  stageConsistency: StageConsistency;
  /** Human-readable reason or explanation for stage consistency */
  stageExplanation: string;
  /** Farm profile fields that are missing */
  missingInformation: string[];
  /** Agronomic contextual notes (water sensitivity, scouting guidance, etc.) */
  lifecycleNotes: string[];
  /** Timestamp when evaluation was performed */
  evaluatedAt: number;
}
