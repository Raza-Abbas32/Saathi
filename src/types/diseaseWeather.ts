import type { Severity } from './index';
import type { SprayingStatus } from './decision';
import type { CropLifecycleContext } from './cropLifecycle';

export type TreatmentTiming = 'suitable' | 'caution' | 'avoid' | 'not_applicable';

export type WeatherRiskLevel = 'low' | 'moderate' | 'high' | 'unknown';

export interface RainRiskAssessment {
  level: 'low' | 'moderate' | 'high' | 'unknown';
  probability: number;
  expectedAmountMm: number;
  headline: string;
  description: string;
}

export interface HumidityRiskAssessment {
  level: 'low' | 'moderate' | 'high' | 'unknown';
  currentHumidity?: number;
  headline: string;
  description: string;
}

export interface WindRiskAssessment {
  level: 'low' | 'moderate' | 'high' | 'unknown';
  currentSpeedKmH: number;
  maxSpeedKmH: number;
  headline: string;
  description: string;
}

export interface TreatmentTimingAssessment {
  timing: TreatmentTiming;
  headline: string;
  reason: string;
  recommendedWindow: string;
}

export interface ImmediateActionPlan {
  disease: string;
  severity: Severity;
  weatherSummary: string;
  treatmentTiming: TreatmentTiming;
  why: string;
  nextAction: string;
  weatherWindow: string;
}

export interface DiseaseConfidenceAssessment {
  confidence: number;
  isLowConfidence: boolean;
  confidenceNote: string;
}

export interface CropContextSummary {
  cropIdentified: string;
  profileCrop?: string;
  cropStage?: string;
  isStageKnown: boolean;
  daysSinceSowing?: number | null;
  lifecycleProgress?: string;
}

/**
 * Structured outcome combining Disease Detection Result, Farm Context,
 * and Weather Data into actionable timing and risk guidance.
 */
export interface DiseaseWeatherAssessment {
  disease: string;
  diseaseConfidence: number;
  severity: Severity;
  weatherRisk: WeatherRiskLevel;
  treatmentTiming: TreatmentTimingAssessment;
  spraySuitability: SprayingStatus;
  rainRisk: RainRiskAssessment;
  humidityRisk: HumidityRiskAssessment;
  windRisk: WindRiskAssessment;
  immediateActions: string[];
  monitoringActions: string[];
  warnings: string[];
  actionPlan: ImmediateActionPlan;
  confidence: DiseaseConfidenceAssessment;
  uncertainty: string[];
  missingInformation: string[];
  cropContext: CropContextSummary;
  lifecycleContext?: CropLifecycleContext;
  generatedAt: number;
}
