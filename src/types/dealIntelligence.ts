/**
 * Saathi Deal Intelligence & Marketplace Types
 *
 * Types for evaluating marketplace deals against official government AMIS prices.
 * 
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 ZERO SPECULATION / DETERMINISTIC SAFETY GUARANTEE:
 * 1. 100% deterministic arithmetic. Zero LLM / Gemini hallucination.
 * 2. Compares asking price strictly against verified AMIS Punjab wholesale benchmarks.
 * 3. Distinguishes OBSERVED, CALCULATED, and UNKNOWN values.
 * 4. Never promises guaranteed profit or buyer matching.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { NormalizedMarketCropPrice, GovernmentPriceSource } from './market';

export type ListingOrigin = 'farmer' | 'demo';

export type DealRating =
  | 'WITHIN_OFFICIAL_RANGE'
  | 'BELOW_OFFICIAL'
  | 'ABOVE_OFFICIAL'
  | 'UNAVAILABLE';

export interface DealRatingConfig {
  rating: DealRating;
  label: string;
  badgeClass: string;
  dotColor: string;
  description: string;
}

export interface ObservedMarketData {
  source: GovernmentPriceSource;
  sourceLabel: string;
  commodity: string;
  mandi: string;
  reportedDate: string;
  retrievedAt?: string;
  isOfficial: boolean;
  rawUnit: string;
  modalPricePer40Kg: number;
  minPricePer40Kg?: number;
  maxPricePer40Kg?: number;
  sourceUrl?: string;
}

export interface CalculatedDealData {
  askingPricePer40Kg: number;
  amisReferencePricePer40Kg: number;
  differencePKR: number; // askingPrice - amisReference
  differencePercent: number; // ((askingPrice - amisReference) / amisReference) * 100
  isWithinRange: boolean;
  calculationExplanation: string;
}

export interface EconomicReferenceData {
  quantityNum: number;
  quantityUnit: string;
  grossMarketReferencePKR: number;
  grossFormatted: string;
  formula: string;
  disclaimer: string;
}

export interface DealIntelligenceEvaluation {
  listingId: string;
  cropName: string;
  location: string;
  listingOrigin: ListingOrigin;
  isPersistent: boolean;
  sellerAskingPriceStr: string;
  sellerAskingPricePer40Kg: number | null;
  sellerQuantityStr: string;
  sellerQuantityMaunds: number | null;
  rating: DealRating;
  ratingConfig: DealRatingConfig;
  observed: ObservedMarketData | null;
  calculated: CalculatedDealData | null;
  economicReference: EconomicReferenceData | null;
  unknowns: string[];
  limitations: string[];
  evaluatedAt: string;
}

export interface EnhancedMarketplaceListing {
  id: string;
  userId: string;
  cropName: string;
  quantity: string;
  pricePerUnit: string;
  location: string;
  farmerName: string;
  description: string;
  datePosted: string;
  listingOrigin: ListingOrigin; // 'farmer' (permanent) | 'demo' (hackathon demo seed)
  isPersistent: boolean; // true for farmer listings, false for demo listings
  expiresAt?: string | null; // null for both farmer and demo listings (no time-based auto deletion)
  imageUrl?: string;
  imageAttribution?: string;
  sourceType?: string;
  sourceUrl?: string;
  contactPhone?: string;
}

export interface DealComparisonParams {
  listing: EnhancedMarketplaceListing;
  marketPrices?: NormalizedMarketCropPrice[];
  currentDate?: Date;
}
