/**
 * Economic Impact Intelligence Types
 *
 * Defines the data contract for transparent, deterministic financial
 * evaluations answering: "What could this farming decision mean financially?"
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 PRIVACY & ACCURACY GUARANTEE:
 * 1. Zero AI hallucination: All calculations are deterministic arithmetic.
 * 2. No invented numbers: Yields, costs, and losses are NEVER manufactured.
 * 3. 100% Local: FarmContext, acreages, and financials are never sent off-device.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { NormalizedMarketCropPrice } from './market';
import type { FarmContext } from './farm';
import type { CropLifecycleContext } from './cropLifecycle';
import type { FarmDecisionResult } from './decision';
import type { DiseaseWeatherAssessment } from './diseaseWeather';

export type EconomicStatus = 'CALCULATED' | 'PARTIAL' | 'INSUFFICIENT_DATA';

export type EconomicConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_ENOUGH_DATA';

export type QuantitySource = 'FARMER' | 'CALCULATED' | 'UNAVAILABLE';

export interface EconomicMarketPrice {
  value?: number | null; // Primary modal/FQP price (Rs/40kg maund)
  min?: number | null;
  max?: number | null;
  unit: string; // e.g. "Rs / 40kg maund"
  source: string; // e.g. "AMIS_PUNJAB"
  sourceLabel: string; // e.g. "AMIS Punjab — Govt. of Punjab"
  market: string; // e.g. "Faisalabad" or "Punjab Average"
  reportedDate: string; // Official market data bulletin date
  retrievedAt?: string; // System retrieval timestamp
  isOfficial: boolean;
  freshness: string; // e.g. "Reported today", "1 day old", "Historical"
  rawUnit?: string; // e.g. "Rs/100kg"
  pricePer100Kg?: number;
}

export interface EconomicQuantity {
  value?: number | null;
  unit: string; // e.g. "maunds", "kg"
  source: QuantitySource;
  note?: string;
}

export interface MonetaryRange {
  value?: number | null;
  min?: number | null;
  max?: number | null;
  unit: 'PKR';
  formatted?: string;
  basis?: string;
}

export interface EconomicRiskExposure extends MonetaryRange {
  status: 'QUANTIFIABLE' | 'UNQUANTIFIABLE';
  reason?: string;
}

export interface EconomicInterventionCost extends MonetaryRange {
  status: 'PROVIDED' | 'UNAVAILABLE';
  reason?: string;
}

export interface EconomicPotentialLossAvoided extends MonetaryRange {
  status: 'QUANTIFIABLE' | 'UNQUANTIFIABLE';
  reason?: string;
}

export interface EconomicNetImpact extends MonetaryRange {
  status: 'CALCULATED' | 'INSUFFICIENT_INFO';
  reason?: string;
}

export interface EconomicDecisionContext {
  sprayingRelevance?: string;
  irrigationRelevance?: string;
  weatherRiskRelevance?: string;
  lifecycleRelevance?: string;
}

export interface EconomicFormulaTransparency {
  grossValueFormula?: string;
  grossValueCalculation?: string;
  riskExposureFormula?: string;
  lossAvoidedFormula?: string;
  netImpactFormula?: string;
  unitConversionNote?: string;
}

export interface EconomicImpactResult {
  status: EconomicStatus;

  crop?: string;
  market?: string;

  marketPrice?: EconomicMarketPrice;

  quantity?: EconomicQuantity;

  farmSizeAcres?: number;

  estimatedGrossValue?: MonetaryRange;

  riskExposure?: EconomicRiskExposure;

  interventionCost?: EconomicInterventionCost;

  potentialLossAvoided?: EconomicPotentialLossAvoided;

  netPotentialImpact?: EconomicNetImpact;

  decisionContext?: EconomicDecisionContext;

  confidence: EconomicConfidence;

  assumptions: string[];

  missingInformation: string[];

  warnings: string[];

  sourceRecords: string[];

  transparency: EconomicFormulaTransparency;

  calculatedAt: string;
}

/**
 * Optional user/farmer inputs passed into the economic engine
 */
export interface FarmerEconomicInput {
  /** Explicit expected or actual harvest quantity */
  quantityValue?: number | null;
  /** Unit of quantity: default "maunds" (40kg) */
  quantityUnit?: 'maunds' | 'kg' | string;
  /** Explicit cost entered by farmer for treatment or intervention (e.g. spraying, labor) */
  interventionCostPkr?: number | null;
  /** Basis or item description for intervention cost (e.g. "Pesticide spray + tractor fuel") */
  interventionCostBasis?: string;
  /**
   * Validated loss percentage range [min, max] ONLY if supplied from a validated research study or farmer
   * Must not be arbitrarily invented.
   */
  validatedLossPercentageRange?: [number, number] | null;
  /**
   * Validated intervention effectiveness (fraction e.g. 0.80, percentage e.g. 80, or range [min, max])
   * ONLY if supplied from validated agronomic research or verified field data.
   * NEVER assumed, guessed, or arbitrarily fabricated by the system.
   */
  validatedInterventionEffectiveness?: number | [number, number] | null;
  /** Specific preferred mandi or market name */
  preferredMarket?: string;
}

export interface EvaluateEconomicImpactParams {
  farmContext?: FarmContext | null;
  cropLifecycleContext?: CropLifecycleContext | null;
  decisionResult?: FarmDecisionResult | null;
  diseaseAssessment?: DiseaseWeatherAssessment | null;
  marketPrices?: NormalizedMarketCropPrice[] | null;
  farmerInput?: FarmerEconomicInput | null;
  currentDate?: Date;
}
