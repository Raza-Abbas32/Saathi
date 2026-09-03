/**
 * Saathi Farm Action Outcome & Learning Loop Types
 *
 * Defines the schema for local farmer observations, recorded outcomes,
 * and private farm memory logs.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 PRIVACY, SAFETY, & INTEGRITY GUARANTEES:
 * 1. 100% on-device local storage. ZERO external network transmission.
 * 2. ZERO Gemini / AI training. Farmer notes are private records.
 * 3. NO SCIENTIFIC PROOF: Farmer observations are stored as subjective reports,
 *    never as scientific causal facts or automatic algorithmic adjustments.
 * 4. NO FAKE FINANCIALS: Does not invent monetary savings from text notes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { FarmActionCategory } from './farmActionPlanner';

export type FarmActionTaken = 'YES' | 'NO' | 'PARTIAL' | 'NOT_SURE';

export type FarmActionObservedOutcome =
  | 'IMPROVED'
  | 'NO_CHANGE'
  | 'WORSE'
  | 'TOO_EARLY'
  | 'UNKNOWN';

export interface FarmActionOutcome {
  /** Unique deterministic or UUID identifier for the outcome record */
  id: string;
  /** ID of the corresponding FarmAction (e.g. 'action-spraying-avoid') */
  actionId: string;
  /** Category of the action for filtering and context */
  actionCategory: FarmActionCategory;
  /** Snapshot of the action title at the time of recording */
  actionTitle?: string;
  /** Snapshot of the action instruction at the time of recording */
  actionDescription?: string;
  /** ISO 8601 timestamp of when the outcome was recorded */
  recordedAt: string;
  /** ISO 8601 timestamp of last edit, if any */
  updatedAt?: string;
  /** Whether the farmer followed the recommendation */
  actionTaken: FarmActionTaken;
  /** What happened afterward as observed by the farmer */
  outcome: FarmActionObservedOutcome;
  /** Optional qualitative field observation or note */
  observation?: string;
  /** Whether the farmer marked this record as requiring follow-up inspection */
  followUpNeeded?: boolean;
  /** Optional additional notes */
  notes?: string;
  /** Snapshot of crop at the time of recording */
  crop?: string;
  /** Snapshot of crop growth stage */
  cropStage?: string;
  /** Snapshot of farm district */
  district?: string;
}

export type FarmOutcomeFilterCategory = 'ALL' | FarmActionCategory;

export interface FarmOutcomeHistoricalContext {
  /** Number of previously recorded outcomes for this action or category */
  previousCount: number;
  /** Most recent recorded outcome, if any */
  latestOutcome?: FarmActionOutcome;
  /** Human-readable context summary (e.g. "Previous observation: No change reported on Sep 1") */
  contextText: string;
  /** Disclaimer clarifying that this is a farmer report, not scientific proof */
  disclaimer: string;
}
