/**
 * Saathi Farm Action Planner Types
 *
 * Defines the structured data model for deterministic daily farm planning:
 * "What should I do today, why, and when?"
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 SAFETY & PRIVACY GUARANTEES:
 * 1. 100% local, deterministic TypeScript data structures.
 * 2. ZERO external network transmission, ZERO AI/LLM hallucinations.
 * 3. Transparent evidence attribution for every action.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { FarmContext } from './farm';
import type { WeatherData } from '../services/weather';
import type { FarmDecisionResult } from './decision';
import type { DiseaseWeatherAssessment } from './diseaseWeather';
import type { DiseaseResult } from './index';
import type { CropLifecycleContext } from './cropLifecycle';
import type { NormalizedMarketCropPrice } from './market';
import type { EconomicImpactResult } from './economicImpact';

export type FarmActionPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type FarmActionCategory =
  | 'DISEASE'
  | 'SPRAYING'
  | 'IRRIGATION'
  | 'WEATHER'
  | 'SCOUTING'
  | 'MARKET'
  | 'ECONOMIC'
  | 'CROP_LIFECYCLE'
  | 'GENERAL';

export type FarmActionStatus =
  | 'ACTION_REQUIRED'
  | 'MONITOR'
  | 'WAIT'
  | 'NO_ACTION'
  | 'INSUFFICIENT_DATA';

export type FarmActionConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_ENOUGH_DATA';

export interface FarmAction {
  /** Unique deterministic identifier */
  id: string;
  /** Action priority ranking */
  priority: FarmActionPriority;
  /** Functional category */
  category: FarmActionCategory;
  /** Operational status */
  status: FarmActionStatus;
  /** Short, farmer-friendly headline (e.g. "Avoid Spraying Tonight") */
  title: string;
  /** Clear, actionable instruction */
  action: string;
  /** Human-readable explanation of why this action is recommended */
  reason: string;
  /** Applicable time window (e.g. "Current window", "Next 24 hours") */
  timing?: string;
  /** Confidence in evidence quality */
  confidence: FarmActionConfidence;
  /** Explicit bullet points of supporting evidence */
  evidence: string[];
  /** Specific input signals utilized (e.g. "WeatherData (Rain 65%)") */
  sourceSignals: string[];
  /** Transparent limitations or what Saathi does not know */
  limitations?: string[];
}

export interface FarmActionDataCompleteness {
  status: 'GOOD' | 'PARTIAL' | 'LIMITED';
  missing: string[];
}

export interface FarmActionPlan {
  /** Timestamp when plan was evaluated */
  generatedAt: string;
  /** Short summary of current farm context (e.g. "Wheat • Flowering • Faisalabad") */
  farmSummary?: string;
  /** The single most urgent or important action for today */
  topAction?: FarmAction;
  /** Prioritized list of all actions (ordered deterministically, max 5) */
  actions: FarmAction[];
  /** Number of actions requiring active attention (status !== 'NO_ACTION') */
  attentionCount: number;
  /** Number of HIGH priority actions */
  highPriorityCount: number;
  /** Whether there is any immediate high-urgency action */
  hasUrgentAction: boolean;
  /** Completeness of underlying farm & environmental data */
  dataCompleteness: FarmActionDataCompleteness;
}

export interface EvaluateFarmActionPlanParams {
  farmContext?: FarmContext | null;
  weather?: WeatherData | null;
  decisionResult?: FarmDecisionResult | null;
  diseaseAssessment?: DiseaseWeatherAssessment | null;
  diseaseResult?: DiseaseResult | null;
  lifecycleContext?: CropLifecycleContext | null;
  marketPrices?: NormalizedMarketCropPrice[] | null;
  economicImpact?: EconomicImpactResult | null;
  currentDate?: Date;
}
