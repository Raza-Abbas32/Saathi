/**
 * Saathi Farm Decision Simulator Types
 *
 * Defines the schema for comparing realistic farm action scenarios (e.g. "Should I spray tonight?",
 * "Should I irrigate now?", "Should I sell now?") using available deterministic intelligence.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 PRINCIPLES & BOUNDARIES:
 * 1. DECISION COMPARISON, NOT PREDICTION: Evaluates support for realistic options.
 * 2. ZERO FABRICATED METRICS: No artificial ROI, yield %, or efficacy numbers.
 * 3. TRANSPARENT UNCERTAINTY: If signals are missing, recommendedOptionId is null.
 * 4. 100% deterministic, local-first evaluation.
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
import type { FarmAction, FarmActionPlan } from './farmActionPlanner';
import type { FarmActionOutcome } from './farmOutcome';
import type { DecisionEvidence } from './decisionEvidence';

export type DecisionScenarioType = 'SPRAYING' | 'IRRIGATION' | 'MARKET' | 'GENERAL';

export type OptionPriority = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';

export type OptionSupport =
  | 'SUPPORTED'
  | 'CAUTION'
  | 'NOT_SUPPORTED'
  | 'INSUFFICIENT_DATA';

export type SimulatorConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_ENOUGH_DATA';

export interface DecisionOption {
  /** Deterministic ID for the option (e.g. 'spray-postpone', 'spray-now', 'spray-scout') */
  id: string;
  /** Primary label of the option (e.g. "Wait / Postpone Spraying") */
  label: string;
  /** Short button/chip tag (e.g. "Wait / Postpone") */
  shortLabel?: string;
  /** Clear explanation of what this option entails */
  description: string;
  /** Priority ranking of this option */
  priority: OptionPriority;
  /** Level of evidence support */
  support: OptionSupport;
  /** IDs of supporting DecisionEvidence items */
  evidenceIds: string[];
  /** Confidence in evaluating this option */
  confidence: SimulatorConfidence;
  /** Concise factual bullet points explaining why */
  keyPoints: string[];
  /** Specific cautions, caveats, or missing inputs */
  limitations: string[];
}

export interface DecisionScenarioResult {
  /** Unique ID for this simulation run */
  scenarioId: string;
  /** Category of scenario */
  scenarioType: DecisionScenarioType;
  /** Farmer's core practical question */
  question: string;
  /** Snapshot of current farm condition */
  contextSummary: string;
  /** Compared options (ordered with most supported first) */
  options: DecisionOption[];
  /** ID of the best-supported option, or null if uncertain */
  recommendedOptionId: string | null;
  /** Plain-language reason for the recommended option or uncertainty */
  recommendationReason: string;
  /** Overall confidence in the simulation */
  confidence: SimulatorConfidence;
  /** All contributing factual evidence items with sources */
  evidenceList: DecisionEvidence[];
  /** Transparent limitations of the simulation */
  limitations: string[];
  /** Assessment of input data completeness */
  dataCompleteness: 'GOOD' | 'PARTIAL' | 'LIMITED';
  /** Evaluation timestamp */
  evaluatedAt: string;
}

export interface EvaluateScenarioParams {
  scenarioType?: DecisionScenarioType;
  farmContext?: FarmContext | null;
  weather?: WeatherData | null;
  weatherData?: WeatherData | null;
  decisionResult?: FarmDecisionResult | null;
  diseaseAssessment?: DiseaseWeatherAssessment | null;
  diseaseResult?: DiseaseResult | null;
  lifecycleContext?: CropLifecycleContext | null;
  marketPrices?: NormalizedMarketCropPrice[] | null;
  economicImpact?: EconomicImpactResult | null;
  farmAction?: FarmAction | null;
  farmActionPlan?: FarmActionPlan | null;
  farmOutcomes?: FarmActionOutcome[] | null;
  farmMemories?: FarmActionOutcome[] | null;
  currentDate?: Date;
}
