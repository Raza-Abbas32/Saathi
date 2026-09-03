/**
 * Saathi Decision Evidence & Explainability Types
 *
 * Defines the structured, factual data model for explaining why recommendations
 * were made, citing actual data sources without fabricated numbers or causal claims.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 SCIENTIFIC & TRANSPARENCY GUARANTEES:
 * 1. ZERO Gemini / AI hallucinations: pure deterministic attribution.
 * 2. 100% factual observation -> implication -> decision chains.
 * 3. Farmer memory is explicitly labeled as historical subjective observation,
 *    never as verified scientific proof.
 * 4. AMIS data preserves full official provenance (market, reported date, unit).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type EvidenceCategory =
  | 'FARM_CONTEXT'
  | 'WEATHER'
  | 'DISEASE'
  | 'CROP_LIFECYCLE'
  | 'MARKET'
  | 'ECONOMIC'
  | 'FARM_MEMORY'
  | 'ACTION_PLAN';

export type EvidenceSource =
  | 'Farm Context'
  | 'Open-Meteo'
  | 'Disease Weather Engine'
  | 'Crop Lifecycle'
  | 'AMIS'
  | 'Economic Impact'
  | 'Farm Action Planner'
  | 'Farm Memory';

export type EvidenceConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_ENOUGH_DATA';

export type EvidenceRelevance = 'HIGH' | 'MEDIUM' | 'LOW';

export interface DecisionEvidence {
  /** Unique deterministic identifier */
  id: string;
  /** Categorization for grouping and icon rendering */
  category: EvidenceCategory;
  /** Short headline of the evidence (e.g. "Precipitation Probability") */
  title: string;
  /** Concrete factual data point observed */
  observation: string;
  /** Contextual implication on the farm decision */
  implication: string;
  /** Originating system or authoritative source */
  source: EvidenceSource;
  /** Reporting / recording date if available */
  sourceDate?: string | null;
  /** Confidence in the underlying source data */
  confidence: EvidenceConfidence;
  /** Relative importance of this evidence to the current decision */
  relevance: EvidenceRelevance;
  /** Limitations or what is not known regarding this signal */
  limitation?: string;
  /** Additional metadata (e.g. AMIS mandi, official flag, memory tag) */
  metadata?: {
    official?: boolean;
    retrievedAt?: string;
    reportedDate?: string;
    isFarmerReport?: boolean;
    commodity?: string;
    market?: string;
    unit?: string;
    [key: string]: unknown;
  };
}

export interface DecisionChainStep {
  step: 'INPUT' | 'OBSERVATION' | 'INTERPRETATION' | 'DECISION';
  label: string;
  detail: string;
}

export interface DecisionEvidenceReport {
  targetActionId?: string;
  targetTitle: string;
  targetRecommendation: string;
  overallConfidence: EvidenceConfidence;
  evidenceItems: DecisionEvidence[];
  evidenceChain?: DecisionChainStep[];
  limitations: string[];
  generatedAt: string;
}
