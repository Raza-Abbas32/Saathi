/**
 * Test Suite: Decision Evidence Engine
 *
 * Validates deterministic evidence aggregation, source attribution,
 * farmer memory categorization, confidence assessment, and transparency limitations.
 */

import {
  buildEvidenceCollection,
  generateDecisionEvidenceReport,
} from '../src/services/decisionEvidence';
import type { WeatherData } from '../src/types';
import type { FarmContext } from '../src/types/farm';
import type { DiseaseWeatherAssessment } from '../src/types/diseaseWeather';
import type { NormalizedMarketCropPrice } from '../src/types/market';
import type { FarmAction } from '../src/types/farmActionPlanner';
import type { FarmActionOutcome } from '../src/types/farmOutcome';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('\n=== RUNNING DECISION EVIDENCE ENGINE TESTS ===\n');

// ── Test 1: Weather Signals Aggregation ──
console.log('Test Suite 1: Weather Evidence Aggregation');
const mockWeather: WeatherData = {
  current: {
    temp: 34,
    humidity: 78,
    windSpeed: 24,
    conditions: 'Overcast',
    icon: 'cloud-rain',
  },
  forecast: [
    { day: 'Today', temp: 35, rain: 65, icon: 'rain' },
    { day: 'Tomorrow', temp: 33, rain: 40, icon: 'cloud-rain' },
  ],
  isOffline: false,
};

const weatherEvidence = buildEvidenceCollection({ weatherData: mockWeather });
assert(weatherEvidence.length >= 2, 'Extracts at least 2 weather evidence signals');
const rainEv = weatherEvidence.find((e) => e.title.includes('Rain') || e.observation.includes('65%'));
assert(Boolean(rainEv), 'Includes rain probability observation');
assert(rainEv?.source.includes('Open-Meteo') === true, 'Rain evidence correctly cites Open-Meteo as source');
assert(rainEv?.relevance === 'HIGH', 'Rain probability has HIGH relevance for field operations');

const windEv = weatherEvidence.find((e) => e.title.includes('Wind') || e.observation.includes('24'));
assert(Boolean(windEv), 'Includes wind speed observation');
assert(windEv?.implication.toLowerCase().includes('drift') === true, 'Wind implication identifies spray drift risk');

// ── Test 2: Disease Intelligence Evidence ──
console.log('\nTest Suite 2: Disease Intelligence Evidence');
const mockDisease: DiseaseWeatherAssessment = {
  crop: 'Cotton',
  disease: 'Bacterial Blight',
  weatherRisk: {
    overallRisk: 'HIGH',
    temperatureFavorability: 'OPTIMAL',
    humidityFavorability: 'HIGH',
    leafWetnessRisk: 'HIGH',
    summary: 'High humidity and warm temperatures create optimal bacterial multiplication environment.',
    favorableFactors: ['Humidity above 70%', 'Warm temperatures (30-36°C)'],
  },
  sprayWindow: {
    isOptimal: false,
    status: 'POOR',
    nextFavorableWindow: 'Wait 24h after rain subsides',
    recommendation: 'Do not spray due to high wash-off risk from imminent rainfall.',
  },
  preventionTips: ['Improve aeration'],
  treatmentGuidance: 'Apply copper-based bactericide once weather dries',
  confidence: 'HIGH',
  disclaimer: 'Based on regional agrometeorological thresholds',
};

const diseaseEvidence = buildEvidenceCollection({ diseaseAssessment: mockDisease });
const diseaseRiskEv = diseaseEvidence.find((e) => e.category === 'DISEASE');
assert(Boolean(diseaseRiskEv), 'Extracts disease intelligence evidence item');
assert(diseaseRiskEv?.source.includes('Disease Intelligence') === true, 'Cites Disease Intelligence as source');
assert(diseaseRiskEv?.relevance === 'HIGH', 'High disease risk is marked HIGH relevance');
assert(diseaseRiskEv?.observation.includes('Bacterial Blight') === true, 'Observation names target disease');

// ── Test 3: Crop Lifecycle Evidence ──
console.log('\nTest Suite 3: Crop Lifecycle Context Evidence');
const mockFarmContext: FarmContext = {
  crop: 'Cotton',
  variety: 'FH-142',
  stage: 'FLOWERING',
  landSizeAcres: 5,
  location: 'Multan',
  soilType: 'Loamy',
  sowingDate: '2026-05-10',
  irrigationSource: 'CANAL_TUBEWELL',
};

const lifecycleEvidence = buildEvidenceCollection({ farmContext: mockFarmContext });
const stageEv = lifecycleEvidence.find((e) => e.category === 'CROP_LIFECYCLE');
assert(Boolean(stageEv), 'Extracts crop lifecycle stage evidence');
assert(stageEv?.observation.includes('FLOWERING') === true, 'Observation contains active stage FLOWERING');
assert(stageEv?.implication.toLowerCase().includes('sensitive') === true, 'Identifies stage physiological sensitivity');

// ── Test 4: Market Signals Evidence ──
console.log('\nTest Suite 4: Market Signals Evidence');
const mockMarketPrices: NormalizedMarketCropPrice[] = [
  {
    crop: 'Cotton',
    mandi: 'Multan Mandi',
    arrivalDate: '2026-09-02',
    minPrice: 7800,
    maxPrice: 8400,
    modalPrice: 8150,
    currency: 'PKR',
    unit: '40 kg',
    priceTrend: 'RISING',
    source: 'AMIS Punjab Directorate of Agriculture Economics',
    isOfficial: true,
  },
];

const marketEvidence = buildEvidenceCollection({ marketPrices: mockMarketPrices, farmContext: mockFarmContext });
const mktEv = marketEvidence.find((e) => e.category === 'MARKET');
assert(Boolean(mktEv), 'Extracts official market price evidence');
assert(mktEv?.source.includes('AMIS Punjab') === true, 'Market price cites official AMIS source');
assert(mktEv?.metadata?.official === true, 'Market price marked as official verified data');
assert(mktEv?.observation.includes('8,150') || mktEv?.observation.includes('8150'), 'Includes exact modal price');

// ── Test 5: Farm Memory / Historical Outcome Evidence ──
console.log('\nTest Suite 5: Farm Memory & Farmer Observations');
const mockOutcomes: FarmActionOutcome[] = [
  {
    id: 'out-1',
    actionId: 'act-spray-1',
    actionTitle: 'Spray copper bactericide',
    crop: 'Cotton',
    stage: 'FLOWERING',
    recordedAt: '2026-08-20T10:00:00Z',
    actionTaken: 'YES',
    outcome: 'RESOLVED_OR_IMPROVED',
    notes: 'Blight spots dried out after 4 days',
    weatherNotes: 'Clear sky, light breeze',
  },
  {
    id: 'out-2',
    actionId: 'act-spray-2',
    actionTitle: 'Spray fungicide in wind',
    crop: 'Cotton',
    stage: 'VEGETATIVE',
    recordedAt: '2026-07-15T10:00:00Z',
    actionTaken: 'YES',
    outcome: 'INEFFECTIVE_OR_POOR',
    notes: 'High wind blew spray off leaves',
  },
];

const memoryEvidence = buildEvidenceCollection({ farmMemories: mockOutcomes, farmContext: mockFarmContext });
const memEvs = memoryEvidence.filter((e) => e.category === 'FARM_MEMORY');
assert(memEvs.length === 2, 'Extracts both relevant farmer memory entries for Cotton');
assert(memEvs[0].metadata?.isFarmerReport === true, 'Farmer memory flagged as farmer report');
assert(memEvs[0].source.includes('Farm Memory') === true, 'Cites local Farm Memory as source');
assert(memEvs[0].limitation?.includes('laboratory proof') === true, 'Includes clear non-laboratory disclaimer');

// ── Test 6: Decision Evidence Report Generation ──
console.log('\nTest Suite 6: Full Decision Evidence Report Generation');
const mockAction: FarmAction = {
  id: 'act-top-1',
  category: 'SPRAYING',
  priority: 'HIGH',
  confidence: 'HIGH',
  title: 'Hold spraying window until rain clears',
  action: 'Postpone chemical spray application until tomorrow evening.',
  reason: 'Rain probability is 65% with wind at 24 km/h.',
  timing: 'Review in 24 hours',
  sourceSignals: ['Open-Meteo Rainfall Forecast', 'Disease Assessment'],
  evidence: ['Rain probability 65%', 'Wind speed 24 km/h'],
  limitations: ['Weather models are probabilistic regional forecasts.'],
};

const report = generateDecisionEvidenceReport(mockAction, {
  farmContext: mockFarmContext,
  weatherData: mockWeather,
  diseaseAssessment: mockDisease,
  marketPrices: mockMarketPrices,
  farmMemories: mockOutcomes,
});

assert(report.targetTitle === mockAction.title, 'Report targetTitle matches action title');
assert(report.evidenceChain.length === 4, 'Constructs 4-step evidence chain (Observe, Understand, Decide, Recommend)');
assert(report.evidenceChain[0].label === 'Observe Environmental Inputs', 'Step 1 is observation');
assert(report.evidenceChain[3].label === 'Final Recommended Action', 'Step 4 is final recommendation');
assert(report.evidenceItems.length >= 4, 'Aggregates multiple verifiable evidence items');
assert(report.limitations.length >= 2, 'Includes transparent scientific limitations');
assert(report.overallConfidence === 'HIGH', 'Calculates appropriate overall confidence');

// ── Summary ──
console.log(`\n========================================`);
console.log(`DECISION EVIDENCE TESTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
