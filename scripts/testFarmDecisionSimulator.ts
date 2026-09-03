/**
 * Test Suite: Farm Decision Simulator
 *
 * Validates deterministic comparison of realistic farm actions across
 * Spraying, Irrigation, Market, and General scenarios without fabricated numbers.
 */

import { evaluateDecisionScenario } from '../src/services/farmDecisionSimulator';
import type { WeatherData } from '../src/types';
import type { FarmContext } from '../src/types/farm';
import type { DiseaseWeatherAssessment } from '../src/types/diseaseWeather';
import type { NormalizedMarketCropPrice } from '../src/types/market';
import type { FarmActionPlan } from '../src/types/farmActionPlanner';

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

console.log('\n=== RUNNING FARM DECISION SIMULATOR TESTS ===\n');

// ── Test 1: Spraying Window — Rain Imminent ──
console.log('Test Suite 1: Spraying Window — Rain Imminent');
const rainyWeather: WeatherData = {
  current: { temp: 31, humidity: 82, windSpeed: 14, conditions: 'Rain', icon: 'rain' },
  forecast: [
    { day: 'Today', temp: 31, rain: 75, icon: 'rain' },
    { day: 'Tomorrow', temp: 32, rain: 50, icon: 'cloud-rain' },
  ],
  isOffline: false,
};

const farmCotton: FarmContext = {
  crop: 'Cotton',
  stage: 'FLOWERING',
  location: 'Multan',
  landSizeAcres: 10,
  soilType: 'Loamy',
  sowingDate: '2026-05-15',
  irrigationSource: 'TUBEWELL',
};

const res1 = evaluateDecisionScenario({
  scenarioType: 'SPRAYING',
  farmContext: farmCotton,
  weatherData: rainyWeather,
});

assert(res1.scenarioType === 'SPRAYING', 'Returns SPRAYING scenario type');
assert(res1.options.length >= 3, 'Provides at least 3 realistic spraying options to compare');
assert(res1.recommendedOptionId === 'spray-wait', 'Recommends spray-wait when rain is imminent (75%)');
const sprayNowOpt1 = res1.options.find((o) => o.id === 'spray-now');
assert(sprayNowOpt1?.support === 'NOT_SUPPORTED', 'Spray now is NOT_SUPPORTED during rain window');
assert(sprayNowOpt1?.keyPoints.some((k) => k.toLowerCase().includes('wash-off')) === true, 'Spray now cites wash-off risk');
const waitOpt1 = res1.options.find((o) => o.id === 'spray-wait');
assert(waitOpt1?.support === 'SUPPORTED', 'Wait/postpone option is SUPPORTED');

// ── Test 2: Spraying Window — High Wind Drift ──
console.log('\nTest Suite 2: Spraying Window — High Wind Drift');
const windyWeather: WeatherData = {
  current: { temp: 33, humidity: 45, windSpeed: 28, conditions: 'Windy', icon: 'wind' },
  forecast: [
    { day: 'Today', temp: 34, rain: 5, icon: 'sun' },
    { day: 'Tomorrow', temp: 33, rain: 10, icon: 'sun' },
  ],
  isOffline: false,
};

const res2 = evaluateDecisionScenario({
  scenarioType: 'SPRAYING',
  farmContext: farmCotton,
  weatherData: windyWeather,
});

assert(res2.recommendedOptionId === 'spray-wait', 'Recommends waiting for calm window when wind is 28 km/h');
const sprayNowOpt2 = res2.options.find((o) => o.id === 'spray-now');
assert(sprayNowOpt2?.support === 'NOT_SUPPORTED', 'Spray now is NOT_SUPPORTED due to severe drift (>20 km/h)');
assert(sprayNowOpt2?.keyPoints.some((k) => k.toLowerCase().includes('drift')) === true, 'Explains chemical drift risk');

// ── Test 3: Spraying Window — Favorable Calm Weather ──
console.log('\nTest Suite 3: Spraying Window — Optimal Calm Weather');
const clearWeather: WeatherData = {
  current: { temp: 28, humidity: 55, windSpeed: 8, conditions: 'Clear', icon: 'sun' },
  forecast: [
    { day: 'Today', temp: 29, rain: 0, icon: 'sun' },
    { day: 'Tomorrow', temp: 30, rain: 5, icon: 'sun' },
  ],
  isOffline: false,
};

const diseaseAssessment: DiseaseWeatherAssessment = {
  crop: 'Cotton',
  disease: 'Pink Bollworm',
  weatherRisk: {
    overallRisk: 'HIGH',
    temperatureFavorability: 'OPTIMAL',
    humidityFavorability: 'MODERATE',
    leafWetnessRisk: 'LOW',
    summary: 'Active pest emergence detected.',
    favorableFactors: ['Optimal temperature'],
  },
  sprayWindow: {
    isOptimal: true,
    status: 'OPTIMAL',
    nextFavorableWindow: 'Current window is clear',
    recommendation: 'Good window for targeted application',
  },
  preventionTips: ['Field scouting'],
  treatmentGuidance: 'Apply recommended bollworm treatment',
  confidence: 'HIGH',
  disclaimer: 'Threshold guideline',
};

const res3 = evaluateDecisionScenario({
  scenarioType: 'SPRAYING',
  farmContext: farmCotton,
  weatherData: clearWeather,
  diseaseAssessment,
});

assert(res3.recommendedOptionId === 'spray-now', 'Recommends spray-now when weather is calm and disease risk is HIGH');
const sprayNowOpt3 = res3.options.find((o) => o.id === 'spray-now');
assert(sprayNowOpt3?.support === 'SUPPORTED', 'Spray now is marked SUPPORTED');
const scoutOpt3 = res3.options.find((o) => o.id === 'spray-scout');
assert(scoutOpt3?.support === 'CAUTION' || scoutOpt3?.support === 'SUPPORTED', 'Scouting option is available with valid rating');

// ── Test 4: Irrigation Scenario — Rain Forecasted ──
console.log('\nTest Suite 4: Irrigation Scenario — Rain Forecasted');
const res4 = evaluateDecisionScenario({
  scenarioType: 'IRRIGATION',
  farmContext: farmCotton,
  weatherData: rainyWeather,
});

assert(res4.scenarioType === 'IRRIGATION', 'Returns IRRIGATION scenario type');
assert(res4.recommendedOptionId === 'irrigate-hold', 'Recommends irrigate-hold when rain is expected');
const irrigateNowOpt4 = res4.options.find((o) => o.id === 'irrigate-now');
assert(irrigateNowOpt4?.support === 'NOT_SUPPORTED', 'Irrigate now is NOT_SUPPORTED when rain is coming');
assert(irrigateNowOpt4?.keyPoints.some((k) => k.toLowerCase().includes('waterlogging') || k.toLowerCase().includes('leaching')) === true, 'Cites waterlogging/leaching risk');

// ── Test 5: Irrigation Scenario — Hot & Dry Weather ──
console.log('\nTest Suite 5: Irrigation Scenario — Hot & Dry Weather');
const hotDryWeather: WeatherData = {
  current: { temp: 42, humidity: 25, windSpeed: 10, conditions: 'Hot & Dry', icon: 'sun' },
  forecast: [
    { day: 'Today', temp: 43, rain: 0, icon: 'sun' },
    { day: 'Tomorrow', temp: 42, rain: 0, icon: 'sun' },
  ],
  isOffline: false,
};

const res5 = evaluateDecisionScenario({
  scenarioType: 'IRRIGATION',
  farmContext: farmCotton,
  weatherData: hotDryWeather,
});

assert(res5.recommendedOptionId === 'irrigate-now', 'Recommends irrigate-now under hot dry conditions (42°C, 0% rain)');
const irrigateNowOpt5 = res5.options.find((o) => o.id === 'irrigate-now');
assert(irrigateNowOpt5?.support === 'SUPPORTED', 'Irrigate now is SUPPORTED');

// ── Test 6: Market Scenario — Official AMIS Prices Present ──
console.log('\nTest Suite 6: Market Scenario — Verified AMIS Prices');
const mockMarketPrices: NormalizedMarketCropPrice[] = [
  {
    crop: 'Cotton',
    mandi: 'Multan Mandi',
    arrivalDate: '2026-09-02',
    minPrice: 7900,
    maxPrice: 8500,
    modalPrice: 8300,
    currency: 'PKR',
    unit: '40 kg',
    priceTrend: 'RISING',
    source: 'AMIS Punjab',
    isOfficial: true,
  },
];

const res6 = evaluateDecisionScenario({
  scenarioType: 'MARKET',
  farmContext: farmCotton,
  marketPrices: mockMarketPrices,
});

assert(res6.scenarioType === 'MARKET', 'Returns MARKET scenario type');
assert(res6.options.length >= 3, 'Provides at least 3 market options');
assert(Boolean(res6.recommendedOptionId), 'Has a recommended option when price signals exist');
const partialSellOpt = res6.options.find((o) => o.id === 'market-sell-partial');
assert(partialSellOpt?.support === 'SUPPORTED', 'Staged/partial selling is SUPPORTED in rising market');

// ── Test 7: Market Scenario — Missing Data & Honest Uncertainty ──
console.log('\nTest Suite 7: Market Scenario — Missing Price Data');
const res7 = evaluateDecisionScenario({
  scenarioType: 'MARKET',
  farmContext: farmCotton,
  marketPrices: [], // No market data
});

assert(res7.recommendedOptionId === null, 'Returns recommendedOptionId: null when market data is absent');
assert(res7.recommendationReason.includes('Not enough mandi price data') || res7.recommendationReason.includes('not enough information'), 'Explains missing price data transparently');
assert(res7.confidence === 'LOW', 'Confidence is LOW when data is missing');
const opt7 = res7.options[0];
assert(opt7.support === 'INSUFFICIENT_DATA', 'Options marked as INSUFFICIENT_DATA');

// ── Test 8: General Scenario — Action Plan Input ──
console.log('\nTest Suite 8: General Action Plan Scenario');
const mockPlan: FarmActionPlan = {
  generatedAt: new Date().toISOString(),
  farmSummary: 'Cotton at Flowering stage in Multan',
  urgencyLevel: 'HIGH',
  urgentCount: 1,
  attentionCount: 1,
  routineCount: 1,
  topPriorityAction: {
    id: 'act-1',
    category: 'SPRAYING',
    priority: 'HIGH',
    confidence: 'HIGH',
    title: 'Hold Spray Window',
    action: 'Wait for rain to pass before spraying',
    reason: 'Rain risk',
    sourceSignals: ['Weather'],
    evidence: ['Rain forecast'],
  },
  supportingActions: [],
  dataCompleteness: { status: 'GOOD', score: 90, missing: [], present: ['crop', 'stage', 'location'] },
};

const res8 = evaluateDecisionScenario({
  scenarioType: 'GENERAL',
  farmActionPlan: mockPlan,
  farmContext: farmCotton,
});

assert(res8.scenarioType === 'GENERAL', 'Returns GENERAL scenario type');
assert(res8.recommendedOptionId === 'action-execute-top', 'Recommends executing top priority plan action');
assert(res8.question.includes('priority'), 'Question relates to general field action execution');

// ── Test 9: Zero Hallucinated Numbers / Scientific Limits ──
console.log('\nTest Suite 9: Scientific Limits & Zero Fabricated Numbers');
const allResults = [res1, res2, res3, res4, res5, res6, res7, res8];
allResults.forEach((res, i) => {
  const allText = JSON.stringify(res).toLowerCase();
  assert(!allText.includes('roi guaranteed') && !allText.includes('+25% yield') && !allText.includes('99.9% effective'), `Simulation ${i + 1} contains no fabricated marketing claims or guaranteed yield %`);
  assert(res.limitations.length > 0, `Simulation ${i + 1} contains transparent limitations`);
});

// ── Test 10: 100% Determinism ──
console.log('\nTest Suite 10: 100% Determinism Test');
const runA = evaluateDecisionScenario({ scenarioType: 'SPRAYING', farmContext: farmCotton, weatherData: rainyWeather });
const runB = evaluateDecisionScenario({ scenarioType: 'SPRAYING', farmContext: farmCotton, weatherData: rainyWeather });
assert(runA.recommendedOptionId === runB.recommendedOptionId, 'Determinism: Identical recommended option ID across runs');
assert(runA.confidence === runB.confidence, 'Determinism: Identical confidence across runs');
assert(JSON.stringify(runA.options) === JSON.stringify(runB.options), 'Determinism: Identical options array across runs');

// ── Summary ──
console.log(`\n========================================`);
console.log(`FARM DECISION SIMULATOR TESTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
