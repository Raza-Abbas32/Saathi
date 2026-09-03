/**
 * Saathi Deal Intelligence Service
 *
 * Evaluates marketplace produce listings against official government AMIS market prices.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 ZERO SPECULATION / DETERMINISTIC SAFETY GUARANTEE:
 * 1. 100% deterministic local arithmetic. ZERO Gemini / LLM calls.
 * 2. Compares asking price strictly against verified AMIS Punjab wholesale benchmarks.
 * 3. Clearly distinguishes OBSERVED (AMIS price), CALCULATED (variance), and UNKNOWN.
 * 4. Never fabricates "fair price", guaranteed profit, or artificial buyer demand.
 * 5. Strictly protects farmer listings from demo expiry cleanup.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  DealComparisonParams,
  DealIntelligenceEvaluation,
  DealRating,
  DealRatingConfig,
  EnhancedMarketplaceListing,
  ObservedMarketData,
  CalculatedDealData,
  EconomicReferenceData,
} from '../types/dealIntelligence';
import type { NormalizedMarketCropPrice, MandiPriceRecord } from '../types/market';

/**
 * LocalStorage key for persisting farmer-created listings on client
 */
export const FARMER_LISTINGS_STORAGE_KEY = 'saathi_farmer_listings';

/**
 * Deal rating display configurations
 */
export const DEAL_RATING_CONFIGS: Record<DealRating, DealRatingConfig> = {
  WITHIN_OFFICIAL_RANGE: {
    rating: 'WITHIN_OFFICIAL_RANGE',
    label: 'Within official market range',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    description: 'Asking price aligns with current official AMIS wholesale mandi range.',
  },
  BELOW_OFFICIAL: {
    rating: 'BELOW_OFFICIAL',
    label: 'Below official reference',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
    description: 'Asking price is lower than the official AMIS wholesale benchmark.',
  },
  ABOVE_OFFICIAL: {
    rating: 'ABOVE_OFFICIAL',
    label: 'Above official reference',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    description: 'Asking price is higher than the official AMIS wholesale benchmark (may reflect premium grade or retail packaging).',
  },
  UNAVAILABLE: {
    rating: 'UNAVAILABLE',
    label: 'Market reference unavailable',
    badgeClass: 'bg-saathi-50 text-saathi-600 border-saathi-200',
    dotColor: 'bg-saathi-400',
    description: 'No verified official government mandi price currently available for this commodity/market.',
  },
};

/**
 * Clean curated seed demo listings with verified public crop imagery
 * 🔒 Note: Demo listings remain available indefinitely during the demo/hackathon (expiresAt: null).
 */
export const INITIAL_DEMO_SEED_LISTINGS: EnhancedMarketplaceListing[] = [
  {
    id: 'demo-lst-wheat-1',
    userId: 'demo-farmer-1',
    cropName: 'Wheat (Gandum)',
    quantity: '150 maunds',
    pricePerUnit: 'Rs 4,600 / 40kg',
    location: 'Faisalabad, Punjab',
    farmerName: 'Muhammad Aslam',
    description: 'High quality Akbar-2019 seed harvest. Dry, clean, stored in ventilated warehouse with low moisture (<10%).',
    datePosted: 'Active demo listing',
    listingOrigin: 'demo',
    isPersistent: false,
    expiresAt: null,
    sourceType: 'Example Demo Produce',
    sourceUrl: 'https://saathi.app/demo/wheat',
    imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80',
    imageAttribution: 'Unsplash (Public Agricultural Photography)',
    contactPhone: '+92 300 1234567',
  },
  {
    id: 'demo-lst-rice-2',
    userId: 'demo-farmer-2',
    cropName: 'Rice (Super Basmati)',
    quantity: '80 maunds',
    pricePerUnit: 'Rs 11,800 / 40kg',
    location: 'Gujranwala, Punjab',
    farmerName: 'Tariq Mehmood',
    description: 'Aromatic, long grain super basmati. Aged paddy ready for milling or wholesale pickup.',
    datePosted: 'Active demo listing',
    listingOrigin: 'demo',
    isPersistent: false,
    expiresAt: null,
    sourceType: 'Example Demo Produce',
    sourceUrl: 'https://saathi.app/demo/rice',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
    imageAttribution: 'Unsplash (Public Agricultural Photography)',
    contactPhone: '+92 301 2345678',
  },
  {
    id: 'demo-lst-cotton-3',
    userId: 'demo-farmer-3',
    cropName: 'Cotton (Phutti)',
    quantity: '60 maunds',
    pricePerUnit: 'Rs 8,600 / 40kg',
    location: 'Bahawalpur, Punjab',
    farmerName: 'Chaudhry Riaz',
    description: 'Grade 1 clean cotton picking. Low trash content, pristine white fiber from first picking.',
    datePosted: 'Active demo listing',
    listingOrigin: 'demo',
    isPersistent: false,
    expiresAt: null,
    sourceType: 'Example Demo Produce',
    sourceUrl: 'https://saathi.app/demo/cotton',
    imageUrl: 'https://images.unsplash.com/photo-1606041008023-472dfb5e530f?auto=format&fit=crop&w=800&q=80',
    imageAttribution: 'Unsplash (Public Agricultural Photography)',
    contactPhone: '+92 302 3456789',
  },
  {
    id: 'demo-lst-sugarcane-4',
    userId: 'demo-farmer-4',
    cropName: 'Sugarcane',
    quantity: '500 maunds',
    pricePerUnit: 'Rs 450 / 40kg',
    location: 'Rahim Yar Khan, Punjab',
    farmerName: 'Ghulam Murtaza',
    description: 'High sucrose recovery variety CPF-246. Available for direct sugar mill supply or local gur production.',
    datePosted: 'Active demo listing',
    listingOrigin: 'demo',
    isPersistent: false,
    expiresAt: null,
    sourceType: 'Example Demo Produce',
    sourceUrl: 'https://saathi.app/demo/sugarcane',
    imageUrl: 'https://images.unsplash.com/photo-1527842891421-42eec6e703ea?auto=format&fit=crop&w=800&q=80',
    imageAttribution: 'Unsplash (Sugarcane Crop Photography)',
    contactPhone: '+92 303 4567890',
  },
  {
    id: 'demo-lst-maize-5',
    userId: 'demo-farmer-5',
    cropName: 'Maize (Corn)',
    quantity: '120 maunds',
    pricePerUnit: 'Rs 2,850 / 40kg',
    location: 'Sahiwal, Punjab',
    farmerName: 'Bashir Ahmed',
    description: 'Clean dried yellow corn kernels (moisture ~13%), ideal for poultry feed milling or food processing.',
    datePosted: 'Active demo listing',
    listingOrigin: 'demo',
    isPersistent: false,
    expiresAt: null,
    sourceType: 'Example Demo Produce',
    sourceUrl: 'https://saathi.app/demo/maize',
    imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=80',
    imageAttribution: 'Unsplash (Public Agricultural Photography)',
    contactPhone: '+92 304 5678901',
  },
  {
    id: 'demo-lst-potato-6',
    userId: 'demo-farmer-6',
    cropName: 'Potato (Aloo)',
    quantity: '200 maunds',
    pricePerUnit: 'Rs 3,200 / 40kg',
    location: 'Okara, Punjab',
    farmerName: 'Haji Farooq',
    description: 'Fresh crop table-grade Cardinal red potatoes. Graded and bagged (50kg bags), cold storage ready.',
    datePosted: 'Active demo listing',
    listingOrigin: 'demo',
    isPersistent: false,
    expiresAt: null,
    sourceType: 'Example Demo Produce',
    sourceUrl: 'https://saathi.app/demo/potato',
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80',
    imageAttribution: 'Unsplash (Public Agricultural Photography)',
    contactPhone: '+92 305 6789012',
  },
];

/**
 * Generate fresh seed demo listings with expiresAt = null (no automatic expiration)
 */
export function generateSeedDemoListings(): EnhancedMarketplaceListing[] {
  return INITIAL_DEMO_SEED_LISTINGS.map((item) => ({
    ...item,
    listingOrigin: 'demo',
    isPersistent: false,
    expiresAt: null,
  }));
}

/**
 * Filter expired demo listings while strictly protecting all farmer listings.
 * 🔒 SAFETY RULE:
 * - Real farmer listings (`listingOrigin === 'farmer'` or `isPersistent === true`) NEVER expire.
 * - Demo listings have `expiresAt = null` and stay indefinitely during the demo.
 * - There is NO automatic 24-hour or 48-hour cleanup.
 */
export function filterExpiredDemoListings(
  listings: EnhancedMarketplaceListing[],
  now: Date = new Date()
): EnhancedMarketplaceListing[] {
  const nowMs = now.getTime();
  return listings.filter((l) => {
    // 🔒 CRITICAL: Farmer listings NEVER expire
    if (l.listingOrigin === 'farmer' || l.isPersistent === true) {
      return true;
    }
    // Ambiguous listings without origin are treated as farmer/persistent
    if (!l.listingOrigin) {
      return true;
    }
    // Demo listing expiration check (only if explicitly given a valid past date)
    if (l.expiresAt) {
      const expMs = new Date(l.expiresAt).getTime();
      if (!isNaN(expMs) && nowMs >= expMs) {
        return false; // Expired legacy demo listing
      }
    }
    return true;
  });
}

/**
 * Reseed demo listings ONLY if no demo listings remain, without overwriting farmer listings.
 * - If demo listings already exist: keep them, do not recreate duplicates or replace on every load.
 * - If demo listings are missing: seeds the controlled demo dataset once.
 */
export function reseedDemoListingsIfNeeded(
  listings: EnhancedMarketplaceListing[],
  now: Date = new Date()
): { listings: EnhancedMarketplaceListing[]; reseeded: boolean } {
  const activeListings = filterExpiredDemoListings(listings, now);
  const hasDemoListings = activeListings.some((l) => l.listingOrigin === 'demo');

  if (!hasDemoListings) {
    const newDemoListings = generateSeedDemoListings();
    return {
      listings: [...activeListings, ...newDemoListings],
      reseeded: true,
    };
  }

  return {
    listings: activeListings,
    reseeded: false,
  };
}

/**
 * Explicitly reset demo listings while strictly preserving all real farmer listings.
 */
export function resetDemoListings(
  currentListings: EnhancedMarketplaceListing[]
): EnhancedMarketplaceListing[] {
  // Preserve all farmer listings and ambiguous listings
  const farmerListings = currentListings.filter((l) => l.listingOrigin !== 'demo');
  const freshDemos = generateSeedDemoListings();
  return [...farmerListings, ...freshDemos];
}

/**
 * Explicitly clear demo listings while strictly preserving all real farmer listings.
 */
export function clearDemoListings(
  currentListings: EnhancedMarketplaceListing[]
): EnhancedMarketplaceListing[] {
  return currentListings.filter((l) => l.listingOrigin !== 'demo');
}

/**
 * Parse asking price string into standard numeric PKR per 40kg (Pakistani maund)
 */
export function parseAskingPricePer40Kg(priceStr?: string): number | null {
  if (!priceStr || typeof priceStr !== 'string') return null;

  const clean = priceStr.replace(/,/g, '');
  const match = clean.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const rawNum = parseFloat(match[1]);
  if (isNaN(rawNum) || rawNum <= 0) return null;

  const lower = priceStr.toLowerCase();

  // If price is specified per 100kg: convert to 40kg (rawNum * 0.40)
  if (lower.includes('100kg') || lower.includes('100 kg') || lower.includes('quintal')) {
    return Math.round(rawNum * 0.40);
  }

  // If price is specified per kg: convert to 40kg (rawNum * 40)
  if (lower.includes('/kg') || lower.includes('per kg') || lower.includes('/ kg')) {
    return Math.round(rawNum * 40);
  }

  // If price is specified per 50kg bag: convert to 40kg (rawNum * 0.80)
  if (lower.includes('50kg') || lower.includes('50 kg')) {
    return Math.round(rawNum * 0.80);
  }

  // Default is per 40kg / per maund (standard Pakistani mandi rate unit)
  return Math.round(rawNum);
}

/**
 * Parse quantity string into standard numeric maunds (40kg units)
 */
export function parseQuantityMaunds(quantityStr?: string): number | null {
  if (!quantityStr || typeof quantityStr !== 'string') return null;

  const clean = quantityStr.replace(/,/g, '');
  const match = clean.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const rawNum = parseFloat(match[1]);
  if (isNaN(rawNum) || rawNum <= 0) return null;

  const lower = quantityStr.toLowerCase();

  // If quantity in metric tons: 1 ton = 1,000 kg = 25 maunds
  if (lower.includes('ton') || lower.includes('tonne')) {
    return Math.round(rawNum * 25);
  }

  // If quantity in 50kg bags: 1 bag = 50kg = 1.25 maunds
  if (lower.includes('bag')) {
    return Math.round(rawNum * 1.25);
  }

  // If quantity in kg: divide by 40
  if (lower.includes('kg') && !lower.includes('40kg') && !lower.includes('100kg')) {
    return Math.round(rawNum / 40);
  }

  // Default is maunds
  return Math.round(rawNum);
}

/**
 * Match a crop name string against normalized government price records
 */
export function matchMarketCropPrice(
  cropName: string,
  location?: string,
  marketPrices: NormalizedMarketCropPrice[] = []
): { cropPrice: NormalizedMarketCropPrice | null; specificMandi: MandiPriceRecord | null } {
  if (!cropName || marketPrices.length === 0) {
    return { cropPrice: null, specificMandi: null };
  }

  const cleanCrop = cropName.toLowerCase().trim();

  // Match commodity
  const matchedPrice = marketPrices.find((p) => {
    const pName = p.crop.toLowerCase();
    if (cleanCrop.includes('wheat') || cleanCrop.includes('gandum')) {
      return pName.includes('wheat') || pName.includes('gandum');
    }
    if (cleanCrop.includes('rice') || cleanCrop.includes('basmati') || cleanCrop.includes('chawal')) {
      return pName.includes('rice') || pName.includes('basmati');
    }
    if (cleanCrop.includes('cotton') || cleanCrop.includes('phutti') || cleanCrop.includes('kapas')) {
      return pName.includes('cotton');
    }
    if (cleanCrop.includes('sugarcane') || cleanCrop.includes('kamand') || cleanCrop.includes('ganna')) {
      return pName.includes('sugarcane');
    }
    if (cleanCrop.includes('maize') || cleanCrop.includes('corn') || cleanCrop.includes('makki')) {
      return pName.includes('maize');
    }
    if (cleanCrop.includes('potato') || cleanCrop.includes('aloo')) {
      return pName.includes('potato');
    }
    if (cleanCrop.includes('onion') || cleanCrop.includes('piaz')) {
      return pName.includes('onion');
    }
    if (cleanCrop.includes('tomato') || cleanCrop.includes('tamatar')) {
      return pName.includes('tomato');
    }
    return pName.includes(cleanCrop) || cleanCrop.includes(pName);
  });

  if (!matchedPrice) {
    return { cropPrice: null, specificMandi: null };
  }

  // Try matching specific mandi by listing location
  let specificMandi: MandiPriceRecord | null = null;
  if (location && Array.isArray(matchedPrice.mandis) && matchedPrice.mandis.length > 0) {
    const cleanLoc = location.toLowerCase();
    specificMandi =
      matchedPrice.mandis.find((m) => cleanLoc.includes(m.mandi.toLowerCase())) || null;
  }

  return { cropPrice: matchedPrice, specificMandi };
}

/**
 * Primary deterministic evaluation function for a marketplace listing
 */
export function evaluateMarketplaceDeal(params: DealComparisonParams): DealIntelligenceEvaluation {
  const { listing, marketPrices = [], currentDate = new Date() } = params;

  const askingPricePer40Kg = parseAskingPricePer40Kg(listing.pricePerUnit);
  const quantityMaunds = parseQuantityMaunds(listing.quantity);
  const { cropPrice, specificMandi } = matchMarketCropPrice(
    listing.cropName,
    listing.location,
    marketPrices
  );

  const unknowns: string[] = [];
  const limitations: string[] = [
    'Official AMIS rates reflect wholesale mandi prices, not final retail or farmgate contract prices.',
    'Actual selling price may vary based on grain moisture, trash %, seed purity, and packaging.',
  ];

  if (!askingPricePer40Kg) {
    unknowns.push('Seller asking price could not be deterministically parsed into standard Rs/40kg.');
  }
  if (!quantityMaunds) {
    unknowns.push('Produce volume could not be parsed into numeric maunds.');
  }

  // Case 1: No official market data available
  if (!cropPrice || !cropPrice.isOfficial || cropPrice.status === 'UNAVAILABLE') {
    unknowns.push('No verified official government mandi data currently online for this commodity.');

    return {
      listingId: listing.id,
      cropName: listing.cropName,
      location: listing.location,
      listingOrigin: listing.listingOrigin || (listing.isPersistent ? 'farmer' : 'demo'),
      isPersistent: listing.isPersistent ?? true,
      sellerAskingPriceStr: listing.pricePerUnit,
      sellerAskingPricePer40Kg: askingPricePer40Kg,
      sellerQuantityStr: listing.quantity,
      sellerQuantityMaunds: quantityMaunds,
      rating: 'UNAVAILABLE',
      ratingConfig: DEAL_RATING_CONFIGS.UNAVAILABLE,
      observed: null,
      calculated: null,
      economicReference: null,
      unknowns,
      limitations,
      evaluatedAt: currentDate.toISOString(),
    };
  }

  // Case 2: Official AMIS price available
  // Resolve modal reference price per 40kg
  let amisModalPer40Kg = cropPrice.currentPrice;
  let minPricePer40Kg = cropPrice.minPricePer40Kg ?? cropPrice.currentPrice;
  let maxPricePer40Kg = cropPrice.maxPricePer40Kg ?? cropPrice.currentPrice;
  let mandiName = 'Punjab Mandis (Average)';

  if (specificMandi) {
    amisModalPer40Kg = specificMandi.pricePerMaund;
    minPricePer40Kg = Math.round(specificMandi.minPrice * 0.40);
    maxPricePer40Kg = Math.round(specificMandi.maxPrice * 0.40);
    mandiName = `${specificMandi.mandi} Mandi`;
  }

  const observed: ObservedMarketData = {
    source: cropPrice.source,
    sourceLabel: cropPrice.sourceLabel || 'AMIS Punjab',
    commodity: cropPrice.crop,
    mandi: mandiName,
    reportedDate: cropPrice.reportedDate,
    retrievedAt: cropPrice.retrievedAt,
    isOfficial: cropPrice.isOfficial,
    rawUnit: cropPrice.rawUnit || 'Rs/100kg',
    modalPricePer40Kg: amisModalPer40Kg,
    minPricePer40Kg,
    maxPricePer40Kg,
    sourceUrl: 'http://www.amis.pk',
  };

  // Case 3: Calculate difference and rating
  let rating: DealRating = 'WITHIN_OFFICIAL_RANGE';
  let calculated: CalculatedDealData | null = null;

  if (askingPricePer40Kg !== null && amisModalPer40Kg > 0) {
    const differencePKR = askingPricePer40Kg - amisModalPer40Kg;
    const differencePercent = Math.round((differencePKR / amisModalPer40Kg) * 100);

    // Tolerance range check
    // If official min/max exists:
    // Below: asking < min - 50 PKR
    // Above: asking > max + 50 PKR
    // Within: min - 50 <= asking <= max + 50
    const lowerBound = Math.min(minPricePer40Kg, amisModalPer40Kg) - 50;
    const upperBound = Math.max(maxPricePer40Kg, amisModalPer40Kg) + 50;

    let isWithinRange = false;
    if (askingPricePer40Kg < lowerBound) {
      rating = 'BELOW_OFFICIAL';
    } else if (askingPricePer40Kg > upperBound) {
      rating = 'ABOVE_OFFICIAL';
    } else {
      rating = 'WITHIN_OFFICIAL_RANGE';
      isWithinRange = true;
    }

    let calculationExplanation = '';
    if (rating === 'WITHIN_OFFICIAL_RANGE') {
      calculationExplanation = `Asking price Rs ${askingPricePer40Kg.toLocaleString()}/40kg is within the official AMIS mandi range of Rs ${minPricePer40Kg.toLocaleString()} – Rs ${maxPricePer40Kg.toLocaleString()}/40kg.`;
    } else if (rating === 'BELOW_OFFICIAL') {
      calculationExplanation = `Asking price Rs ${askingPricePer40Kg.toLocaleString()}/40kg is Rs ${Math.abs(differencePKR).toLocaleString()} (${Math.abs(differencePercent)}%) below the official AMIS modal price of Rs ${amisModalPer40Kg.toLocaleString()}/40kg.`;
    } else {
      calculationExplanation = `Asking price Rs ${askingPricePer40Kg.toLocaleString()}/40kg is Rs ${differencePKR.toLocaleString()} (+${differencePercent}%) above the official AMIS modal price of Rs ${amisModalPer40Kg.toLocaleString()}/40kg.`;
    }

    calculated = {
      askingPricePer40Kg,
      amisReferencePricePer40Kg: amisModalPer40Kg,
      differencePKR,
      differencePercent,
      isWithinRange,
      calculationExplanation,
    };
  }

  // Case 4: Calculate Economic Reference (Gross Market Total)
  let economicReference: EconomicReferenceData | null = null;
  if (quantityMaunds !== null && amisModalPer40Kg > 0) {
    const grossMarketReferencePKR = quantityMaunds * (askingPricePer40Kg || amisModalPer40Kg);
    economicReference = {
      quantityNum: quantityMaunds,
      quantityUnit: 'maunds (40kg)',
      grossMarketReferencePKR,
      grossFormatted: `Rs ${grossMarketReferencePKR.toLocaleString('en-PK')}`,
      formula: `${quantityMaunds.toLocaleString()} maunds × Rs ${(askingPricePer40Kg || amisModalPer40Kg).toLocaleString()} / maund = Rs ${grossMarketReferencePKR.toLocaleString('en-PK')}`,
      disclaimer:
        'Estimated gross market reference based on listed quantity and official AMIS prices. Does NOT account for transport, bagging, loading, mandi commission, or net profit.',
    };
  }

  return {
    listingId: listing.id,
    cropName: listing.cropName,
    location: listing.location,
    listingOrigin: listing.listingOrigin || (listing.isPersistent ? 'farmer' : 'demo'),
    isPersistent: listing.isPersistent ?? true,
    sellerAskingPriceStr: listing.pricePerUnit,
    sellerAskingPricePer40Kg: askingPricePer40Kg,
    sellerQuantityStr: listing.quantity,
    sellerQuantityMaunds: quantityMaunds,
    rating,
    ratingConfig: DEAL_RATING_CONFIGS[rating],
    observed,
    calculated,
    economicReference,
    unknowns,
    limitations,
    evaluatedAt: currentDate.toISOString(),
  };
}

/**
 * Read local farmer listings from client storage
 */
export function getStoredFarmerListings(): EnhancedMarketplaceListing[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FARMER_LISTINGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item && typeof item.id === 'string');
    }
  } catch (e) {
    console.warn('[DealIntelligence] Error reading stored farmer listings:', e);
  }
  return [];
}

/**
 * Save a newly created farmer listing to local client storage
 */
export function saveStoredFarmerListing(listing: EnhancedMarketplaceListing): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const existing = getStoredFarmerListings();
    // Prepend new listing and deduplicate by ID
    const updated = [
      {
        ...listing,
        listingOrigin: 'farmer' as const,
        isPersistent: true,
        expiresAt: null,
      },
      ...existing.filter((l) => l.id !== listing.id),
    ];
    localStorage.setItem(FARMER_LISTINGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[DealIntelligence] Error saving farmer listing to storage:', e);
  }
}

/**
 * Remove a farmer listing from local client storage
 */
export function removeStoredFarmerListing(id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const existing = getStoredFarmerListings();
    const updated = existing.filter((l) => l.id !== id);
    localStorage.setItem(FARMER_LISTINGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[DealIntelligence] Error removing farmer listing from storage:', e);
  }
}
