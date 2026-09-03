/**
 * Saathi Step 6: Economic Impact Intelligence Test Suite
 *
 * Verifies all 30 mandatory requirements:
 * 1. official AMIS price + known quantity
 * 2. AMIS min/max + known quantity
 * 3. FQP calculation
 * 4. missing quantity
 * 5. missing market price
 * 6. stale price
 * 7. official source provenance
 * 8. unit conversion (kg to maunds)
 * 9. invalid unit
 * 10. negative quantity
 * 11. negative price
 * 12. missing disease loss percentage
 * 13. missing intervention cost
 * 14. valid intervention cost supplied by farmer
 * 15. potential loss avoided with supported inputs
 * 16. net potential impact with supported inputs
 * 17. insufficient data state
 * 18. confidence HIGH
 * 19. confidence MEDIUM
 * 20. confidence LOW
 * 21. confidence NOT_ENOUGH_DATA
 * 22. FarmContext integration
 * 23. Crop Lifecycle integration
 * 24. Farm Decision integration
 * 25. Disease Weather integration
 * 26. no fabricated values
 * 27. no external network request from economic engine
 * 28. formula transparency
 * 29. rounding
 * 30. old market data never labeled live
 */

import {
  evaluateEconomicImpact,
  formatPKR,
  formatPKRRange,
  calculateMarketFreshness,
} from '../src/services/economicImpactEngine';
import type { NormalizedMarketCropPrice } from '../src/types/market';
import type { FarmContext } from '../src/types/farm';
import type { CropLifecycleContext } from '../src/types/cropLifecycle';
import type { FarmDecisionResult } from '../src/types/decision';
import type { DiseaseWeatherAssessment } from '../src/types/diseaseWeather';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    process.exitCode = 1;
  }
}

console.log('══════════════════════════════════════════════════════════════');
console.log('💰 Running Saathi Economic Impact Intelligence Engine Tests');
console.log('══════════════════════════════════════════════════════════════\n');

// Sample official AMIS market prices from Step 5.5
const mockAmisMarketPrices: NormalizedMarketCropPrice[] = [
  {
    crop: 'Wheat',
    unit: 'per 40kg',
    currentPrice: 4180,
    previousPrice: 4150,
    predictedPrice: 4180,
    trend: 'up',
    trendPercent: 0.72,
    history: [],
    source: 'AMIS_PUNJAB',
    sourceLabel: 'AMIS Punjab — Govt. of Punjab',
    isOfficial: true,
    reportedDate: '03-09-2026',
    retrievedAt: '2026-09-03T12:00:00.000Z',
    rawUnit: 'Rs/100kg',
    pricePer100Kg: 10450,
    minPricePer40Kg: 4000,
    maxPricePer40Kg: 4300,
    mandisCount: 15,
    mandis: [
      {
        mandi: 'Faisalabad',
        minPrice: 11500,
        maxPrice: 12000,
        fqp: 11750,
        pricePerMaund: 4700, // 11750 * 0.40
        quantity: null,
        rawUnit: 'Rs/100kg',
      },
      {
        mandi: 'Lahore',
        minPrice: 10000,
        maxPrice: 10500,
        fqp: 10250,
        pricePerMaund: 4100,
        quantity: null,
        rawUnit: 'Rs/100kg',
      },
    ],
    status: 'ACTIVE',
  },
  {
    crop: 'Cotton',
    unit: 'per 40kg',
    currentPrice: 8880,
    previousPrice: 8800,
    predictedPrice: 8880,
    trend: 'stable',
    trendPercent: 0,
    history: [],
    source: 'AMIS_PUNJAB',
    sourceLabel: 'AMIS Punjab — Govt. of Punjab',
    isOfficial: true,
    reportedDate: '03-09-2026',
    retrievedAt: '2026-09-03T12:00:00.000Z',
    rawUnit: 'Rs/100kg',
    pricePer100Kg: 22200,
    minPricePer40Kg: 8500,
    maxPricePer40Kg: 9200,
    mandisCount: 3,
    mandis: [],
    status: 'ACTIVE',
  },
];

const testDate = new Date('2026-09-03T12:00:00.000Z');

// 1. Official AMIS price + known quantity
console.log('Test 1: Official AMIS price + known quantity');
{
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat', district: 'Faisalabad' },
    marketPrices: mockAmisMarketPrices,
    farmerInput: { quantityValue: 100, quantityUnit: 'maunds' },
    currentDate: testDate,
  });

  assert(result.status === 'PARTIAL' || result.status === 'CALCULATED', 'Status should indicate successful value calculation');
  assert(result.marketPrice?.value === 4700, 'Market price should match Faisalabad mandi FQP (Rs 4,700/maund)');
  assert(result.estimatedGrossValue?.value === 470000, 'Gross value should be 100 maunds * 4700 = Rs 470,000');
  assert(result.estimatedGrossValue?.unit === 'PKR', 'Gross value unit must be PKR');
  assert(result.marketPrice?.isOfficial === true, 'Price must be marked official');
}

// 2. AMIS min/max + known quantity
console.log('\nTest 2: AMIS min/max + known quantity');
{
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat', district: 'Faisalabad' },
    marketPrices: mockAmisMarketPrices,
    farmerInput: { quantityValue: 100, quantityUnit: 'maunds' },
    currentDate: testDate,
  });

  // Min = 11500 * 0.40 = 4600 -> 100 * 4600 = 460,000
  // Max = 12000 * 0.40 = 4800 -> 100 * 4800 = 480,000
  assert(result.estimatedGrossValue?.min === 460000, 'Gross min should be 100 * 4600 = Rs 460,000');
  assert(result.estimatedGrossValue?.max === 480000, 'Gross max should be 100 * 4800 = Rs 480,000');
}

// 3. FQP calculation
console.log('\nTest 3: FQP calculation');
{
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat', district: 'Faisalabad' },
    marketPrices: mockAmisMarketPrices,
    currentDate: testDate,
  });

  assert(result.marketPrice?.pricePer100Kg === 11750, 'Original FQP per 100kg is 11,750');
  assert(result.marketPrice?.value === 4700, 'Converted FQP per 40kg maund is 4,700');
  assert(result.marketPrice?.value === Math.round(11750 * 0.40), 'FQP conversion formula 11750 * 40 / 100 = 4700');
}

// 4. Missing quantity
console.log('\nTest 4: Missing quantity');
{
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat', farmSizeAcres: 8, district: 'Faisalabad' },
    marketPrices: mockAmisMarketPrices,
    farmerInput: { quantityValue: undefined },
    currentDate: testDate,
  });

  assert(result.quantity?.value === null, 'Quantity value must be null');
  assert(result.quantity?.source === 'UNAVAILABLE', 'Quantity source must be UNAVAILABLE');
  assert(result.estimatedGrossValue?.value === null, 'Gross value must be null when quantity is missing');
  assert(
    result.missingInformation.some((m) => m.includes('Expected production quantity')),
    'Missing information must clearly state expected production quantity is absent'
  );
  assert(
    result.assumptions.some((a) => a.includes('not assumed')),
    'Must explicitly state yield per acre is not assumed or fabricated'
  );
}

// 5. Missing market price
console.log('\nTest 5: Missing market price');
{
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'DragonFruit' },
    marketPrices: mockAmisMarketPrices,
    farmerInput: { quantityValue: 50 },
    currentDate: testDate,
  });

  assert(result.marketPrice === undefined, 'Market price should be undefined');
  assert(result.estimatedGrossValue?.value === null, 'Estimated gross value must be null');
  assert(
    result.missingInformation.some((m) => m.includes('DragonFruit')),
    'Missing information must list absence of market price for DragonFruit'
  );
}

// 6. Stale price
console.log('\nTest 6: Stale price');
{
  const staleDate = new Date('2026-09-20T12:00:00.000Z'); // 17 days later
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat', district: 'Faisalabad' },
    marketPrices: mockAmisMarketPrices,
    currentDate: staleDate,
  });

  assert(result.marketPrice?.freshness.includes('Stale'), 'Freshness must indicate stale price data');
  assert(
    result.warnings.some((w) => w.includes('historical reference')),
    'Warnings must advise treating old data as historical reference'
  );
}

// 7. Official source provenance
console.log('\nTest 7: Official source provenance');
{
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat', district: 'Faisalabad' },
    marketPrices: mockAmisMarketPrices,
    currentDate: testDate,
  });

  assert(result.marketPrice?.source === 'AMIS_PUNJAB', 'Source must be AMIS_PUNJAB');
  assert(result.marketPrice?.sourceLabel.includes('Govt. of Punjab'), 'Source label must include Govt of Punjab');
  assert(result.marketPrice?.reportedDate === '03-09-2026', 'Reported date must match AMIS bulletin');
  assert(result.marketPrice?.market.includes('Faisalabad'), 'Market must be Faisalabad Mandi');
}

// 8. Unit conversion (kg to maunds)
console.log('\nTest 8: Unit conversion (kg to maunds)');
{
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat', district: 'Faisalabad' },
    marketPrices: mockAmisMarketPrices,
    farmerInput: { quantityValue: 4000, quantityUnit: 'kg' }, // 4000 kg = 100 maunds
    currentDate: testDate,
  });

  assert(result.quantity?.value === 100, '4000 kg must convert to exactly 100 maunds (4000/40)');
  assert(result.estimatedGrossValue?.value === 470000, 'Estimated gross value must be 100 * 4700 = Rs 470,000');
}

// 9. Invalid unit
console.log('\nTest 9: Invalid unit');
{
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat' },
    marketPrices: mockAmisMarketPrices,
    farmerInput: { quantityValue: 100, quantityUnit: 'liters' },
    currentDate: testDate,
  });

  assert(result.quantity?.value === null, 'Quantity with invalid unit must be null');
  assert(result.estimatedGrossValue?.value === null, 'Gross value must be null with invalid unit');
  assert(
    result.warnings.some((w) => w.includes('Unrecognized quantity unit')),
    'Warnings must note unrecognized quantity unit'
  );
}

// 10. Negative quantity
console.log('\nTest 10: Negative quantity');
{
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat' },
    marketPrices: mockAmisMarketPrices,
    farmerInput: { quantityValue: -50 },
    currentDate: testDate,
  });

  assert(result.quantity?.value === null, 'Negative quantity value must be rejected (null)');
  assert(result.estimatedGrossValue?.value === null, 'Gross value must be null for negative quantity');
  assert(
    result.warnings.some((w) => w.includes('Negative production quantity')),
    'Warning must explicitly flag negative quantity'
  );
}

// 11. Negative price
console.log('\nTest 11: Negative price');
{
  const corruptedPrices: NormalizedMarketCropPrice[] = [
    {
      ...mockAmisMarketPrices[0],
      currentPrice: -100,
    },
  ];
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat' },
    marketPrices: corruptedPrices,
    farmerInput: { quantityValue: 100 },
    currentDate: testDate,
  });

  assert(result.marketPrice === undefined, 'Negative price must be discarded');
  assert(
    result.warnings.some((w) => w.includes('invalid negative price')),
    'Warning must record invalid negative price'
  );
}

// 12. Missing disease loss percentage
console.log('\nTest 12: Missing disease loss percentage');
{
  const mockDiseaseAssessment: Partial<DiseaseWeatherAssessment> = {
    disease: 'Leaf Rust',
    severity: 'high',
    confidence: { confidence: 92, isLowConfidence: false, confidenceNote: 'High confidence' },
    cropContext: { cropIdentified: 'Wheat', isStageKnown: true },
  };

  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat', district: 'Faisalabad' },
    diseaseAssessment: mockDiseaseAssessment as DiseaseWeatherAssessment,
    marketPrices: mockAmisMarketPrices,
    farmerInput: { quantityValue: 100 },
    currentDate: testDate,
  });

  assert(result.riskExposure?.status === 'UNQUANTIFIABLE', 'Risk exposure must be UNQUANTIFIABLE without loss percentage');
  assert(
    result.riskExposure?.reason?.includes('No validated crop-loss percentage'),
    'Reason must explain absence of validated loss percentage'
  );
  assert(result.riskExposure?.value === undefined, 'Risk exposure value must not be manufactured');
}

// 13. Missing intervention cost
console.log('\nTest 13: Missing intervention cost');
{
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat' },
    marketPrices: mockAmisMarketPrices,
    farmerInput: { quantityValue: 100 },
    currentDate: testDate,
  });

  assert(result.interventionCost?.status === 'UNAVAILABLE', 'Intervention cost must be UNAVAILABLE');
  assert(result.interventionCost?.value === undefined, 'Intervention cost must not be invented');
}

// 14. Valid intervention cost supplied by farmer
console.log('\nTest 14: Valid intervention cost supplied by farmer');
{
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat' },
    marketPrices: mockAmisMarketPrices,
    farmerInput: {
      quantityValue: 100,
      interventionCostPkr: 2500,
      interventionCostBasis: 'Pesticide spray application + tractor fuel',
    },
    currentDate: testDate,
  });

  assert(result.interventionCost?.status === 'PROVIDED', 'Intervention cost status must be PROVIDED');
  assert(result.interventionCost?.value === 2500, 'Intervention cost value must be 2,500');
  assert(result.interventionCost?.formatted === 'Rs 2,500', 'Formatted cost must be Rs 2,500');
}

// 15. Potential loss avoided requires validated intervention effectiveness
console.log('\nTest 15: Potential loss avoided requires validated intervention effectiveness');
{
  // 15a: Without validated intervention effectiveness -> UNQUANTIFIABLE
  const resultWithoutEff = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat', district: 'Faisalabad' },
    marketPrices: mockAmisMarketPrices,
    farmerInput: {
      quantityValue: 100, // Rs 470,000
      validatedLossPercentageRange: [10, 20], // 10% to 20%
    },
    currentDate: testDate,
  });

  // 10% of 470,000 = 47,000; 20% of 470,000 = 94,000
  assert(resultWithoutEff.riskExposure?.status === 'QUANTIFIABLE', 'Risk exposure should be QUANTIFIABLE with validated loss range');
  assert(resultWithoutEff.riskExposure?.min === 47000, 'Min risk exposure must be 47,000');
  assert(resultWithoutEff.riskExposure?.max === 94000, 'Max risk exposure must be 94,000');
  assert(resultWithoutEff.potentialLossAvoided?.status === 'UNQUANTIFIABLE', 'Potential loss avoided MUST be UNQUANTIFIABLE without validated effectiveness');
  assert(
    resultWithoutEff.potentialLossAvoided?.reason?.includes('Validated intervention effectiveness is unavailable'),
    'Reason must explain absence of validated intervention effectiveness'
  );
  assert(resultWithoutEff.potentialLossAvoided?.value === undefined, 'No arbitrary effectiveness percentage (50%, 70%, 80%) may be invented');

  // 15b: With validated intervention effectiveness -> QUANTIFIABLE
  const resultWithEff = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat', district: 'Faisalabad' },
    marketPrices: mockAmisMarketPrices,
    farmerInput: {
      quantityValue: 100,
      validatedLossPercentageRange: [10, 20],
      validatedInterventionEffectiveness: 0.80, // 80% validated efficacy
    },
    currentDate: testDate,
  });

  // 47,000 * 0.80 = 37,600; 94,000 * 0.80 = 75,200
  assert(resultWithEff.potentialLossAvoided?.status === 'QUANTIFIABLE', 'Potential loss avoided should be QUANTIFIABLE with validated effectiveness');
  assert(resultWithEff.potentialLossAvoided?.min === 37600, 'Min loss avoided must be 47,000 × 0.80 = 37,600');
  assert(resultWithEff.potentialLossAvoided?.max === 75200, 'Max loss avoided must be 94,000 × 0.80 = 75,200');
  assert(resultWithEff.potentialLossAvoided?.value === 56400, 'Midpoint loss avoided must be (37,600 + 75,200) / 2 = 56,400');
}

// 16. Net potential impact with supported inputs
console.log('\nTest 16: Net potential impact with supported inputs');
{
  // 16a: With both validated effectiveness and verified intervention cost
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat', district: 'Faisalabad' },
    marketPrices: mockAmisMarketPrices,
    farmerInput: {
      quantityValue: 100, // Gross: Rs 470,000
      validatedLossPercentageRange: [10, 20], // Risk exposure: 47k to 94k
      validatedInterventionEffectiveness: 0.80, // Loss avoided: 37.6k to 75.2k
      interventionCostPkr: 5000, // Cost: 5,000
    },
    currentDate: testDate,
  });

  // Net = [37,600 - 5,000, 75,200 - 5,000] = [32,600, 70,200]
  assert(result.netPotentialImpact?.status === 'CALCULATED', 'Net impact status must be CALCULATED');
  assert(result.netPotentialImpact?.min === 32600, 'Net min impact must be 37,600 - 5,000 = 32,600');
  assert(result.netPotentialImpact?.max === 70200, 'Net max impact must be 75,200 - 5,000 = 70,200');
  assert(result.status === 'CALCULATED', 'Overall status should be CALCULATED');

  // 16b: Without intervention cost -> INSUFFICIENT_INFO
  const resultWithoutCost = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat', district: 'Faisalabad' },
    marketPrices: mockAmisMarketPrices,
    farmerInput: {
      quantityValue: 100,
      validatedLossPercentageRange: [10, 20],
      validatedInterventionEffectiveness: 0.80,
      // No intervention cost
    },
    currentDate: testDate,
  });
  assert(resultWithoutCost.netPotentialImpact?.status === 'INSUFFICIENT_INFO', 'Net impact must be INSUFFICIENT_INFO when cost missing');
  assert(resultWithoutCost.netPotentialImpact?.value === undefined, 'Net impact value must not be fabricated');
}

// 17. Insufficient data state
console.log('\nTest 17: Insufficient data state');
{
  const result = evaluateEconomicImpact({
    farmContext: {},
    marketPrices: [],
    currentDate: testDate,
  });

  assert(result.status === 'INSUFFICIENT_DATA', 'Status must be INSUFFICIENT_DATA when empty');
  assert(result.confidence === 'NOT_ENOUGH_DATA', 'Confidence must be NOT_ENOUGH_DATA');
}

// 18. Confidence HIGH
console.log('\nTest 18: Confidence HIGH');
{
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat', district: 'Faisalabad' },
    marketPrices: mockAmisMarketPrices,
    farmerInput: {
      quantityValue: 100,
      interventionCostPkr: 2000,
      validatedLossPercentageRange: [5, 10],
    },
    currentDate: testDate,
  });

  assert(result.confidence === 'HIGH', 'Confidence must be HIGH when official, fresh, quantity & validated range present');
}

// 19. Confidence MEDIUM
console.log('\nTest 19: Confidence MEDIUM');
{
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat', district: 'Faisalabad' },
    marketPrices: mockAmisMarketPrices,
    farmerInput: { quantityValue: 100 },
    currentDate: testDate,
  });

  assert(result.confidence === 'MEDIUM', 'Confidence should be MEDIUM with official price and quantity but no full net inputs');
}

// 20. Confidence LOW
console.log('\nTest 20: Confidence LOW');
{
  const fallbackPrices: NormalizedMarketCropPrice[] = [
    {
      ...mockAmisMarketPrices[0],
      source: 'DEMO_MOCK',
      isOfficial: false,
    },
  ];
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat' },
    marketPrices: fallbackPrices,
    currentDate: testDate,
  });

  assert(result.confidence === 'LOW', 'Confidence should be LOW with non-official baseline price and no quantity');
}

// 21. Confidence NOT_ENOUGH_DATA
console.log('\nTest 21: Confidence NOT_ENOUGH_DATA');
{
  const result = evaluateEconomicImpact({
    currentDate: testDate,
  });

  assert(result.confidence === 'NOT_ENOUGH_DATA', 'Confidence must be NOT_ENOUGH_DATA when no inputs supplied');
}

// 22. FarmContext integration
console.log('\nTest 22: FarmContext integration');
{
  const farmCtx: FarmContext = {
    farmName: 'Al-Madina Farm',
    farmSizeAcres: 12.5,
    province: 'Punjab',
    district: 'Faisalabad',
    currentCrop: 'Wheat',
    cropVariety: 'Dilkash-20',
  };

  const result = evaluateEconomicImpact({
    farmContext: farmCtx,
    marketPrices: mockAmisMarketPrices,
    currentDate: testDate,
  });

  assert(result.crop === 'Wheat', 'Crop must be resolved as Wheat from FarmContext');
  assert(result.farmSizeAcres === 12.5, 'Farm size must be preserved as 12.5 acres');
  assert(result.market?.includes('Faisalabad'), 'Market should be Faisalabad matching district in Punjab');
}

// 23. Crop Lifecycle integration
console.log('\nTest 23: Crop Lifecycle integration');
{
  const lifecycleCtx: Partial<CropLifecycleContext> = {
    crop: 'Wheat',
    currentStage: 'Flowering',
    lifecycleProgress: 'reproductive',
    daysSinceSowing: 75,
  };

  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat' },
    cropLifecycleContext: lifecycleCtx as CropLifecycleContext,
    marketPrices: mockAmisMarketPrices,
    currentDate: testDate,
  });

  assert(
    result.decisionContext?.lifecycleRelevance?.includes('Flowering'),
    'Decision context must mention Flowering crop stage'
  );
  assert(
    result.decisionContext?.lifecycleRelevance?.includes('Reproductive stages'),
    'Decision context must highlight reproductive phase sensitivity'
  );
}

// 24. Farm Decision integration
console.log('\nTest 24: Farm Decision integration');
{
  const mockDecision: Partial<FarmDecisionResult> = {
    sprayingDecision: {
      status: 'avoid',
      rating: 'Avoid Spraying',
      headline: 'Heavy rain expected',
      reason: '70% rain probability will wash off chemicals',
      precipitationProbability: 70,
      expectedPrecipitationMm: 14,
      windSpeedKmH: 15,
    },
    irrigationDecision: {
      status: 'delay',
      headline: 'Postpone irrigation',
      reason: 'Rain incoming',
    },
  };

  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat' },
    decisionResult: mockDecision as FarmDecisionResult,
    marketPrices: mockAmisMarketPrices,
    currentDate: testDate,
  });

  assert(
    result.decisionContext?.sprayingRelevance?.includes('Delaying spraying prevents chemical wash-off'),
    'Decision context must explain delay spraying financial relevance'
  );
  assert(
    result.decisionContext?.irrigationRelevance?.includes('fuel and tube-well electricity expenses'),
    'Decision context must explain irrigation delay savings'
  );
}

// 25. Disease Weather integration
console.log('\nTest 25: Disease Weather integration');
{
  const mockDiseaseAssessment: Partial<DiseaseWeatherAssessment> = {
    disease: 'Wheat Rust',
    severity: 'high',
    cropContext: { cropIdentified: 'Wheat', isStageKnown: true },
    treatmentTiming: {
      timing: 'suitable',
      headline: 'Clear window for spraying',
      reason: 'Low wind and no rain expected today',
      recommendedWindow: 'Next 24 hours',
    },
  };

  const result = evaluateEconomicImpact({
    diseaseAssessment: mockDiseaseAssessment as DiseaseWeatherAssessment,
    marketPrices: mockAmisMarketPrices,
    farmerInput: { quantityValue: 50 },
    currentDate: testDate,
  });

  assert(result.crop === 'Wheat', 'Crop must be resolved from disease assessment');
  assert(result.estimatedGrossValue?.value === 50 * 4180, 'Gross value should calculate from identified crop');
}

// 26. No fabricated values
console.log('\nTest 26: No fabricated values');
{
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat', farmSizeAcres: 10 },
    marketPrices: mockAmisMarketPrices,
    currentDate: testDate,
  });

  assert(result.quantity?.value === null, 'Must NEVER fabricate yield or harvest quantity from acreage alone');
  assert(result.estimatedGrossValue?.value === null, 'Must NEVER fabricate gross value without quantity');
  assert(result.interventionCost?.value === undefined, 'Must NEVER fabricate pesticide/labor cost');
  assert(result.riskExposure?.value === undefined, 'Must NEVER fabricate monetary loss without validated range');
}

// 27. No external network request from economic engine
console.log('\nTest 27: No external network request from economic engine');
{
  const originalFetch = global.fetch;
  let fetchCalled = false;
  // Monkey-patch fetch to detect any network access
  global.fetch = () => {
    fetchCalled = true;
    return Promise.reject(new Error('Network access forbidden in pure economic engine'));
  };

  try {
    evaluateEconomicImpact({
      farmContext: { currentCrop: 'Wheat' },
      marketPrices: mockAmisMarketPrices,
      farmerInput: { quantityValue: 100 },
      currentDate: testDate,
    });
    assert(fetchCalled === false, 'Economic engine must NOT make external network requests');
  } finally {
    global.fetch = originalFetch;
  }
}

// 28. Formula transparency
console.log('\nTest 28: Formula transparency');
{
  const result = evaluateEconomicImpact({
    farmContext: { currentCrop: 'Wheat', district: 'Faisalabad' },
    marketPrices: mockAmisMarketPrices,
    farmerInput: {
      quantityValue: 100,
      validatedLossPercentageRange: [10, 20],
      validatedInterventionEffectiveness: 0.80,
      interventionCostPkr: 5000,
    },
    currentDate: testDate,
  });

  assert(
    result.transparency.grossValueFormula?.includes('Quantity (maunds) × Market Price'),
    'Must provide transparent gross value formula'
  );
  assert(
    result.transparency.grossValueCalculation?.includes('100 maunds × Rs 4,700 = Rs 470,000'),
    'Must provide exact calculation with numbers'
  );
  assert(
    result.transparency.lossAvoidedFormula?.includes('Potential Loss Avoided = Risk Exposure × Validated Intervention Effectiveness'),
    'Must provide transparent loss avoided formula'
  );
  assert(
    result.transparency.netImpactFormula?.includes('Potential Loss Avoided - Verified Intervention Cost'),
    'Must provide transparent net impact formula'
  );
}

// 29. Rounding
console.log('\nTest 29: Rounding');
{
  assert(formatPKR(470000.499) === 'Rs 470,000', 'formatPKR must not show decimal precision for currency');
  assert(formatPKRRange(460000, 480000) === 'Rs 460k – Rs 480k', 'formatPKRRange must use clean compact k-notation for large sums');
  assert(formatPKRRange(4600, 4800) === 'Rs 4,600 – Rs 4,800', 'formatPKRRange must format smaller sums cleanly with commas');
}

// 30. Old market data never labeled live
console.log('\nTest 30: Old market data never labeled live');
{
  const twoDaysLater = new Date('2026-09-05T12:00:00.000Z');
  const freshness = calculateMarketFreshness('03-09-2026', twoDaysLater);

  assert(freshness.isToday === false, 'Two days old data must NOT have isToday = true');
  assert(freshness.freshness === '2 days old', 'Freshness should state "2 days old"');
  assert(!freshness.freshness.includes('today'), 'Must NEVER label 2-day-old data as "today" or "live"');

  const sameDay = new Date('2026-09-03T12:00:00.000Z');
  const freshnessToday = calculateMarketFreshness('03-09-2026', sameDay);
  assert(freshnessToday.isToday === true, 'Same calendar date should register as today');
  assert(freshnessToday.freshness === 'Reported today', 'Same day data registers as "Reported today"');
}

console.log('\n══════════════════════════════════════════════════════════════');
console.log(`Economic Impact Tests Completed: ${passedTests}/${totalTests} Passed`);
console.log('══════════════════════════════════════════════════════════════\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
