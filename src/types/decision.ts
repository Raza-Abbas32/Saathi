/**
 * Farm Decision Engine Types
 *
 * Defines the schema for deterministic agricultural evaluations combining
 * Farm Context (crop, soil, stage, water) with Weather Data (precipitation,
 * wind, temperature, ET₀, soil moisture).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 PRIVACY & ARCHITECTURAL GUARANTEE:
 * All evaluations are executed 100% locally on the farmer's device.
 * No farm context or decision requests are sent to Gemini, external AI models,
 * or cloud databases.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { CropLifecycleContext } from './cropLifecycle';

export type DecisionOverallStatus = 'optimal' | 'monitoring' | 'action_needed';

export type DecisionPriority = 'low' | 'medium' | 'high';

export type SprayingStatus = 'suitable' | 'caution' | 'avoid';

export interface SprayingDecision {
  status: SprayingStatus;
  rating: string;
  headline: string;
  reason: string;
  precipitationProbability: number;
  expectedPrecipitationMm: number;
  windSpeedKmH: number;
  details?: string;
}

export type IrrigationStatus = 'irrigate' | 'delay' | 'adequate' | 'insufficient_data';

export interface IrrigationDecision {
  status: IrrigationStatus;
  headline: string;
  reason: string;
  details?: string;
  expectedRainSum24h?: number;
  rainProbability24h?: number;
  et0Daily?: number;
  soilMoisturePct?: number;
}

export type HeatStressLevel = 'low' | 'moderate' | 'high';

export interface HeatStressDecision {
  level: HeatStressLevel;
  headline: string;
  reason: string;
  maxTempToday: number;
  apparentTempMax?: number;
  details?: string;
}

export type WindRiskLevel = 'low' | 'moderate' | 'high';

export interface WindDecision {
  risk: WindRiskLevel;
  headline: string;
  reason: string;
  currentWindSpeed: number;
  maxWindSpeedForecast: number;
  details?: string;
}

export interface TomorrowComparisonDecision {
  tomorrowBetterForSpraying: boolean;
  tomorrowBetterForWork: boolean;
  headline: string;
  comparisonDetails: string[];
}

export interface FarmDecisionResult {
  overallStatus: DecisionOverallStatus;
  priority: DecisionPriority;
  alerts: string[];
  recommendations: string[];
  weatherSummary: string;
  sprayingDecision: SprayingDecision;
  irrigationDecision: IrrigationDecision;
  heatStressDecision: HeatStressDecision;
  windDecision: WindDecision;
  tomorrowComparison: TomorrowComparisonDecision;
  lifecycleContext?: CropLifecycleContext;
  meta: {
    generatedAt: number;
    hasFarmContext: boolean;
    cropEvaluated?: string;
    stageEvaluated?: string;
    waterSourceEvaluated?: string;
    missingFields: string[];
    notes?: string;
  };
}
