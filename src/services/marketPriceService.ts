import type {
  NormalizedMarketCropPrice,
  GovernmentSourceStatus,
  MarketPricesApiResponse,
} from '@/types';
import { mockCropPrices } from '@/data/mockData';

const FALLBACK_SOURCES: GovernmentSourceStatus[] = [
  {
    id: 'AMIS_PUNJAB',
    name: 'AMIS Punjab (Agriculture Marketing Information Service)',
    department: 'Directorate of Agriculture (Economics & Marketing), Punjab',
    province: 'Punjab',
    status: 'ACTIVE',
    coverage: '68 Punjab Agricultural Mandis / 110+ Daily Commodities',
    lastUpdated: new Date().toLocaleDateString('en-GB'),
  },
  {
    id: 'SINDH_GOV',
    name: 'Sindh Agriculture & Prices Department',
    department: 'Bureau of Supply & Prices, Government of Sindh',
    province: 'Sindh',
    status: 'UNAVAILABLE',
    coverage: '0 mandis online',
    lastUpdated: new Date().toLocaleDateString('en-GB'),
    reason:
      'No stable public machine-readable daily mandi rate API or data feed currently available. Online reporting portal is under construction by the provincial department.',
  },
  {
    id: 'PBS_BENCHMARK',
    name: 'Pakistan Bureau of Statistics (PBS)',
    department: 'Ministry of Planning, Development & Special Initiatives',
    province: 'National (Federal)',
    status: 'BENCHMARK',
    coverage: '17 Major Urban & Regional Centers across Pakistan',
    lastUpdated: new Date().toLocaleDateString('en-GB'),
    reason:
      'Provides weekly Sensitive Price Indicator (SPI) & monthly Wholesale Price Index (WPI) national benchmarks for 51 essential agricultural commodities.',
  },
];

/**
 * Build fallback baseline prices from existing mock data
 */
function createFallbackResponse(reason?: string): MarketPricesApiResponse {
  const prices: NormalizedMarketCropPrice[] = mockCropPrices.map((p) => ({
    ...p,
    source: 'DEMO_MOCK',
    sourceLabel: 'Illustrative Baseline (Sample Data)',
    isOfficial: false,
    reportedDate: new Date().toLocaleDateString('en-GB'),
    retrievedAt: new Date().toISOString(),
    rawUnit: p.unit,
    pricePer100Kg: Math.round(p.currentPrice / 0.40),
    minPricePer40Kg: p.currentPrice,
    maxPricePer40Kg: p.currentPrice,
    mandisCount: 0,
    mandis: [],
    status: 'UNAVAILABLE',
  }));

  return {
    prices,
    sources: FALLBACK_SOURCES,
    isLiveGovernmentData: false,
    lastSync: new Date().toISOString(),
    error: reason,
  };
}

/**
 * Primary client entry point to fetch official government market prices
 */
export async function getGovernmentMarketPrices(
  forceRefresh = false
): Promise<MarketPricesApiResponse> {
  try {
    const url = `/api/market/prices${forceRefresh ? '?refresh=true' : ''}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      console.warn(`[MarketPriceClient] API error ${response.status}, using baseline fallback.`);
      return createFallbackResponse(`Backend API error: ${response.statusText}`);
    }

    const data: MarketPricesApiResponse = await response.json();
    if (!data || !Array.isArray(data.prices) || data.prices.length === 0) {
      return createFallbackResponse('Empty or invalid response from market price service');
    }

    return data;
  } catch (err) {
    console.warn('[MarketPriceClient] Network error fetching government market prices:', err);
    return createFallbackResponse(err instanceof Error ? err.message : 'Network error');
  }
}

/**
 * Retrieve status of all government market data sources
 */
export async function getGovernmentSources(): Promise<GovernmentSourceStatus[]> {
  try {
    const response = await fetch('/api/market/sources');
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.sources)) {
        return data.sources;
      }
    }
  } catch (e) {
    console.warn('[MarketPriceClient] Error fetching sources list:', e);
  }
  return FALLBACK_SOURCES;
}
