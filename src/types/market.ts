import type { CropPrice } from './index';

export type GovernmentPriceSource = 
  | 'AMIS_PUNJAB' 
  | 'SINDH_GOV' 
  | 'PBS_BENCHMARK' 
  | 'DEMO_MOCK';

export interface MandiPriceRecord {
  mandi: string;
  minPrice: number;
  maxPrice: number;
  fqp: number; // Fair Quality Price / Modal wholesale price (Rs per 100kg in AMIS)
  pricePerMaund: number; // Converted to standard Pakistani 40kg maund (fqp * 0.40)
  quantity?: string | null;
  rawUnit: string; // e.g. "Rs/100kg"
}

export interface NormalizedMarketCropPrice extends CropPrice {
  source: GovernmentPriceSource;
  sourceLabel: string;
  isOfficial: boolean;
  reportedDate: string;
  retrievedAt?: string;
  rawUnit: string; // e.g. "Rs/100kg"
  pricePer100Kg?: number;
  minPricePer40Kg?: number;
  maxPricePer40Kg?: number;
  mandisCount: number;
  mandis?: MandiPriceRecord[];
  status: 'ACTIVE' | 'UNAVAILABLE' | 'STALE';
}

export interface GovernmentSourceStatus {
  id: GovernmentPriceSource;
  name: string;
  department: string;
  province: string;
  status: 'ACTIVE' | 'UNAVAILABLE' | 'BENCHMARK';
  coverage: string;
  lastUpdated: string;
  reason?: string;
}

export interface MarketPricesApiResponse {
  prices: NormalizedMarketCropPrice[];
  sources: GovernmentSourceStatus[];
  isLiveGovernmentData: boolean;
  lastSync: string;
  error?: string;
}
