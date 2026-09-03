/**
 * Saathi Farm Watch Types
 *
 * Defines the schema for proactive farm monitoring, daily farm briefs,
 * meaningful change detection, and farmer follow-up loops.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 PRIVACY, INTEGRITY & SAFETY GUARANTEES:
 * 1. 100% on-device local storage under 'saathi-farm-watch'.
 * 2. ZERO continuous GPS tracking, ZERO background surveillance.
 * 3. ZERO Gemini / LLM calls, ZERO external telemetry.
 * 4. EVENT ≠ IMPACT: Environmental signals are observed; actual farm impact
 *    is strictly farmer-reported without fabricated causal claims.
 * 5. Deterministic deduplication prevents alert fatigue.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { FarmAction, FarmActionPlan } from './farmActionPlanner';
import type { FarmContext } from './farm';
import type { WeatherData } from '../services/weather';
import type { FarmDecisionResult } from './decision';
import type { DiseaseWeatherAssessment } from './diseaseWeather';
import type { DiseaseResult } from './index';
import type { CropLifecycleContext } from './cropLifecycle';
import type { NormalizedMarketCropPrice } from './market';
import type { EconomicImpactResult } from './economicImpact';
import type { FarmActionOutcome } from './farmOutcome';

export type FarmWatchEventType =
  | 'RAIN'
  | 'RAIN_FORECAST_CHANGE'
  | 'WIND'
  | 'HEAT'
  | 'IRRIGATION'
  | 'DISEASE_WEATHER'
  | 'ACTION_CHANGE'
  | 'MARKET_UPDATE'
  | 'GENERAL';

export type FarmWatchEventSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export type FarmWatchEventStatus =
  | 'NEW'
  | 'ACKNOWLEDGED'
  | 'FOLLOW_UP_NEEDED'
  | 'RESOLVED';

export type FarmWatchEventSource =
  | 'Open-Meteo'
  | 'Farm Decision Engine'
  | 'Disease Weather Engine'
  | 'Farm Action Planner'
  | 'AMIS'
  | 'Farm Memory';

export interface FarmWatchFarmerResponse {
  affected: 'YES' | 'NO' | 'NOT_SURE';
  impactCategory?: 'CROP' | 'SPRAY_WORK' | 'IRRIGATION' | 'NO_VISIBLE_IMPACT' | 'OTHER';
  note?: string;
  recordedAt: string;
}

export interface FarmWatchEvent {
  /** Deterministic fingerprint to prevent duplicate alerts */
  id: string;
  /** Type of farm watch event */
  type: FarmWatchEventType;
  /** Urgency ranking */
  severity: FarmWatchEventSeverity;
  /** Concise farmer-friendly title */
  title: string;
  /** Descriptive summary of observed condition (without causal claims) */
  summary: string;
  /** Additional context or guidance */
  detail?: string;
  /** ISO timestamp when the event condition occurred / was observed */
  occurredAt?: string | null;
  /** ISO timestamp when Saathi detected the change */
  detectedAt: string;
  /** Verifiable provenance of data */
  source: FarmWatchEventSource;
  /** Provenance date if reported from official source */
  sourceDate?: string | null;
  /** Whether Saathi should proactively ask the farmer "What happened?" */
  requiresFollowUp: boolean;
  /** Current state of the alert */
  status: FarmWatchEventStatus;
  /** Linked FarmAction ID if applicable */
  actionId?: string | null;
  /** Linked FarmActionOutcome ID in Farm Memory if recorded */
  outcomeId?: string | null;
  /** Farmer's response if follow-up was completed */
  farmerResponse?: FarmWatchFarmerResponse | null;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface WeatherSnapshot {
  capturedAt: string;
  temp?: number;
  maxTemp?: number;
  minTemp?: number;
  rainProb?: number;
  rainSum?: number;
  isRaining?: boolean;
  windSpeed?: number;
  humidity?: number;
  conditionCode?: number;
  forecastRainNext24h?: number;
}

export type DailyBriefSectionStatus = 'OPTIMAL' | 'ATTENTION' | 'CAUTION' | 'INFO' | 'UNAVAILABLE';

export interface DailyFarmBriefSection {
  title: string;
  status: DailyBriefSectionStatus;
  headline: string;
  detail?: string;
  source?: string;
  sourceDate?: string;
  actionId?: string;
}

export interface DailyFarmBrief {
  generatedAt: string;
  dateStr: string;
  cropSummary: {
    crop: string;
    stage?: string;
    variety?: string;
    district?: string;
    isSet: boolean;
  };
  weatherSection: DailyFarmBriefSection;
  waterSection: DailyFarmBriefSection;
  attentionSection: DailyFarmBriefSection;
  marketSection?: DailyFarmBriefSection | null;
  recentActivitySection?: DailyFarmBriefSection | null;
  todayPrioritySection: DailyFarmBriefSection;
  topPriorityAction?: FarmAction | null;
  activeAlertCount: number;
  followUpPendingCount: number;
  dataCompleteness: 'GOOD' | 'PARTIAL' | 'LIMITED';
}

export interface FarmWatchState {
  lastCheckedAt: string;
  previousWeatherSnapshot: WeatherSnapshot | null;
  events: FarmWatchEvent[];
  dismissedFingerprints: string[];
}

export interface FarmWatchFollowUpInput {
  eventId: string;
  affected: 'YES' | 'NO' | 'NOT_SURE';
  impactCategory?: 'CROP' | 'SPRAY_WORK' | 'IRRIGATION' | 'NO_VISIBLE_IMPACT' | 'OTHER';
  note?: string;
  crop?: string;
  cropStage?: string;
  district?: string;
}

export interface EvaluateFarmWatchParams {
  farmContext?: FarmContext | null;
  weather?: WeatherData | null;
  decisionResult?: FarmDecisionResult | null;
  diseaseAssessment?: DiseaseWeatherAssessment | null;
  diseaseResult?: DiseaseResult | null;
  lifecycleContext?: CropLifecycleContext | null;
  marketPrices?: NormalizedMarketCropPrice[] | null;
  economicImpact?: EconomicImpactResult | null;
  farmActionPlan?: FarmActionPlan | null;
  farmOutcomes?: FarmActionOutcome[] | null;
  previousSnapshot?: WeatherSnapshot | null;
  existingEvents?: FarmWatchEvent[] | null;
  currentDate?: Date;
}
