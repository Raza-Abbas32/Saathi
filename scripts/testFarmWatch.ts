/**
 * Test Suite: Saathi Farm Watch (Step 10)
 *
 * Deterministic validation of:
 * 1. Daily Farm Decision Brief generation
 * 2. Meaningful change detection (Rain, Forecast shift, Wind, Heat, Irrigation, Disease, Action, Market)
 * 3. Event deduplication and fingerprinting
 * 4. Follow-up "What happened?" loop & Farm Memory persistence
 * 5. State management, event dismissal, acknowledgment, and resilience
 * 6. Scientific integrity & privacy constraints (Event ≠ Impact)
 */

import {
  generateDailyFarmBrief,
  detectMeaningfulChanges,
  updateFarmWatchWithCurrentState,
  recordFarmWatchFollowUp,
  acknowledgeFarmWatchEvent,
  dismissFarmWatchEvent,
  generateEventFingerprint,
  isValidFarmWatchEvent,
  getFarmWatchState,
  clearFarmWatchState,
  extractWeatherSnapshot,
} from '../src/services/farmWatch';
import { getFarmOutcomes, clearFarmOutcomes } from '../src/services/farmOutcomeService';
import type { FarmContext } from '../src/types/farm';
import type { WeatherData } from '../src/services/weather';
import type { DiseaseWeatherAssessment } from '../src/types/diseaseWeather';
import type { NormalizedMarketCropPrice } from '../src/types/market';
import type { FarmActionPlan } from '../src/types/farmActionPlanner';
import type { WeatherSnapshot } from '../src/types/farmWatch';

// Mock localStorage for Node environment if not present
if (typeof localStorage === 'undefined') {
  const storage: Record<string, string> = {};
  (global as unknown as { localStorage: Storage }).localStorage = {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, val: string) => {
      storage[key] = val;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      for (const k in storage) delete storage[k];
    },
    key: (i: number) => Object.keys(storage)[i] || null,
    length: 0,
  };
}

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

console.log('\n========================================');
console.log('🌾 SAATHI FARM WATCH TEST SUITE');
console.log('========================================\n');

// ── TEST 1: Daily Farm Brief Generation ──
console.log('--- Test Group 1: Daily Farm Brief Generation ---');
clearFarmWatchState();
clearFarmOutcomes();

const mockFarm: FarmContext = {
  crop: 'Cotton',
  stage: 'Flowering',
  variety: 'FH-142',
  location: 'Multan',
  soilType: 'Loam',
  acres: 5,
};

const mockWeatherRainy: WeatherData = {
  current: {
    temperature_2m: 31,
    precipitation_probability: 70,
    precipitation: 2.5,
    wind_speed_10m: 14,
    relative_humidity_2m: 80,
    weather_code: 61,
  },
  daily: {
    time: ['2026-09-03'],
    temperature_2m_max: [34],
    temperature_2m_min: [26],
    precipitation_probability_max: [75],
    precipitation_sum: [8.0],
  },
  forecast: [
    { day: 'Today', temp: 34, rain: 75, condition: 'Rain' },
    { day: 'Tomorrow', temp: 33, rain: 20, condition: 'Clear' },
  ],
};

const testDate = new Date('2026-09-03T10:00:00Z');

const brief1 = generateDailyFarmBrief({
  farmContext: mockFarm,
  weather: mockWeatherRainy,
  currentDate: testDate,
});

assert(brief1.cropSummary.isSet === true, 'Crop summary correctly detects configured crop');
assert(brief1.cropSummary.crop === 'Cotton', 'Crop name matches "Cotton"');
assert(brief1.cropSummary.stage === 'Flowering', 'Crop stage matches "Flowering"');
assert(brief1.cropSummary.district === 'Multan', 'District matches "Multan"');
assert(brief1.weatherSection.status === 'ATTENTION', 'Weather section flags rain attention');
assert(brief1.weatherSection.headline.includes('Rain expected today'), 'Weather headline contains rain advisory');
assert(brief1.weatherSection.source === 'Open-Meteo Forecast', 'Weather source is Open-Meteo Forecast');
assert(brief1.waterSection.status === 'OPTIMAL', 'Water section advises holding irrigation due to rain');
assert(brief1.dataCompleteness === 'GOOD', 'Data completeness marked as GOOD when farm and weather exist');

// ── TEST 2: Brief with Missing Crop or Weather ──
console.log('\n--- Test Group 2: Brief with Incomplete Data ---');
const briefIncomplete = generateDailyFarmBrief({
  farmContext: null,
  weather: null,
  currentDate: testDate,
});

assert(briefIncomplete.cropSummary.isSet === false, 'Detects unconfigured crop when farmContext is null');
assert(briefIncomplete.cropSummary.crop === 'Crop not set', 'Fallback label for unset crop is clean');
assert(briefIncomplete.weatherSection.status === 'UNAVAILABLE', 'Weather section status is UNAVAILABLE');
assert(briefIncomplete.waterSection.status === 'UNAVAILABLE', 'Water section status is UNAVAILABLE');
assert(briefIncomplete.todayPrioritySection.status === 'UNAVAILABLE', 'Priority action status is UNAVAILABLE');
assert(briefIncomplete.dataCompleteness === 'LIMITED', 'Data completeness is LIMITED when data is missing');

// ── TEST 3: Market Section in Daily Brief ──
console.log('\n--- Test Group 3: Market Section in Daily Brief ---');
const mockMarketPrices: NormalizedMarketCropPrice[] = [
  {
    crop: 'Cotton',
    mandi: 'Multan',
    province: 'Punjab',
    modalPrice: 8200,
    minPrice: 7900,
    maxPrice: 8500,
    unit: 'maund',
    isOfficial: true,
    source: 'AMIS Punjab',
    arrivalDate: '2026-09-03',
  },
];

const briefWithMarket = generateDailyFarmBrief({
  farmContext: mockFarm,
  weather: mockWeatherRainy,
  marketPrices: mockMarketPrices,
  currentDate: testDate,
});

assert(briefWithMarket.marketSection !== null, 'Market section is rendered when official prices provided');
assert(briefWithMarket.marketSection?.headline.includes('Rs 8,200'), 'Market section shows Rs 8,200 modal price');
assert(briefWithMarket.marketSection?.headline.includes('Multan mandi'), 'Market section includes Multan mandi');
assert(briefWithMarket.marketSection?.source.includes('AMIS Punjab'), 'Market source quotes AMIS Punjab');

// ── TEST 4: Meaningful Change Detection - Rain Event ──
console.log('\n--- Test Group 4: Rain Event Detection ---');
const prevSnapDry: WeatherSnapshot = {
  capturedAt: '2026-09-02T10:00:00Z',
  temp: 32,
  rainProb: 10,
  rainSum: 0,
  isRaining: false,
  windSpeed: 8,
};

const eventsRain = detectMeaningfulChanges({
  farmContext: mockFarm,
  weather: mockWeatherRainy,
  previousSnapshot: prevSnapDry,
  currentDate: testDate,
});

const rainEvent = eventsRain.find((e) => e.type === 'RAIN');
assert(rainEvent !== undefined, 'Detects newly occurring rain event');
assert(rainEvent?.severity === 'HIGH', 'Rain event severity is HIGH');
assert(rainEvent?.requiresFollowUp === true, 'Rain event marks requiresFollowUp = true');
assert(rainEvent?.source === 'Open-Meteo', 'Rain event source is Open-Meteo');
assert(!rainEvent?.summary.toLowerCase().includes('ruined your crop'), 'Rain summary avoids false causal damage claims');
assert(rainEvent?.summary.includes('Did it affect your farm'), 'Rain summary invites objective farmer feedback');

// ── TEST 5: Rain Forecast Change Detection ──
console.log('\n--- Test Group 5: Rain Forecast Shift ---');
const mockWeatherProbJump: WeatherData = {
  current: { temperature_2m: 30, precipitation_probability: 65 },
  daily: {
    time: ['2026-09-03'],
    precipitation_probability_max: [65],
    precipitation_sum: [2.0],
  },
};

const eventsProbJump = detectMeaningfulChanges({
  farmContext: mockFarm,
  weather: mockWeatherProbJump,
  previousSnapshot: { capturedAt: '2026-09-02T10:00:00Z', rainProb: 15, rainSum: 0, isRaining: false },
  currentDate: testDate,
});

const probChangeEvent = eventsProbJump.find((e) => e.type === 'RAIN_FORECAST_CHANGE');
assert(probChangeEvent !== undefined, 'Detects meaningful jump in rain forecast (+50%)');
assert(probChangeEvent?.title.includes('Rain Forecast Increased'), 'Title accurately indicates increase');
assert(probChangeEvent?.summary.includes('65%'), 'Summary contains updated 65% probability');

// ── TEST 6: High Wind Hazard ──
console.log('\n--- Test Group 6: Wind Hazard Detection ---');
const mockWeatherWindy: WeatherData = {
  current: { temperature_2m: 29, wind_speed_10m: 22, precipitation_probability: 5 },
  daily: { time: ['2026-09-03'], precipitation_probability_max: [5] },
};

const eventsWind = detectMeaningfulChanges({
  farmContext: mockFarm,
  weather: mockWeatherWindy,
  previousSnapshot: { capturedAt: '2026-09-02T10:00:00Z', windSpeed: 9 },
  currentDate: testDate,
});

const windEvent = eventsWind.find((e) => e.type === 'WIND');
assert(windEvent !== undefined, 'Detects high wind speed above 18 km/h threshold');
assert(windEvent?.summary.includes('22 km/h'), 'Wind summary notes measured 22 km/h speed');
assert(windEvent?.requiresFollowUp === true, 'Wind hazard requires farmer follow-up');

// ── TEST 7: Heat Hazard Detection ──
console.log('\n--- Test Group 7: Heat Concern Detection ---');
const mockWeatherHeat: WeatherData = {
  current: { temperature_2m: 41, precipitation_probability: 0 },
  daily: { time: ['2026-09-03'], temperature_2m_max: [42], precipitation_probability_max: [0] },
};

const eventsHeat = detectMeaningfulChanges({
  farmContext: mockFarm,
  weather: mockWeatherHeat,
  previousSnapshot: { capturedAt: '2026-09-02T10:00:00Z', maxTemp: 34 },
  currentDate: testDate,
});

const heatEvent = eventsHeat.find((e) => e.type === 'HEAT');
assert(heatEvent !== undefined, 'Detects high temperature above 38°C threshold');
assert(heatEvent?.summary.includes('42°C'), 'Heat summary notes maximum temperature');

// ── TEST 8: Disease Weather Risk Alert ──
console.log('\n--- Test Group 8: Disease Weather Risk ---');
const mockDiseaseAssessment: DiseaseWeatherAssessment = {
  disease: 'Late Blight',
  confidence: 'HIGH',
  weatherRisk: {
    overallRisk: 'HIGH',
    factors: {
      temperature: { value: 21, optimal: '18-22°C', favorable: true },
      humidity: { value: 92, optimal: '>85%', favorable: true },
      leafWetness: { hours: 10, threshold: '8h', favorable: true },
    },
    summary: 'Prolonged leaf wetness and high humidity favor rapid late blight spore multiplication.',
  },
  sprayWindow: {
    isOptimal: false,
    reason: 'Active rain and high humidity.',
  },
  recommendations: ['Inspect lower leaf canopy for dark lesions.'],
};

const eventsDisease = detectMeaningfulChanges({
  farmContext: mockFarm,
  weather: mockWeatherRainy,
  diseaseAssessment: mockDiseaseAssessment,
  currentDate: testDate,
});

const diseaseEvent = eventsDisease.find((e) => e.type === 'DISEASE_WEATHER');
assert(diseaseEvent !== undefined, 'Detects high disease weather risk');
assert(diseaseEvent?.title.includes('Late Blight'), 'Disease title mentions Late Blight');
assert(diseaseEvent?.source === 'Disease Weather Engine', 'Source is Disease Weather Engine');
assert(diseaseEvent?.requiresFollowUp === true, 'Disease event marks requiresFollowUp = true');

// ── TEST 9: Priority Action Change Event ──
console.log('\n--- Test Group 9: Action Plan Integration ---');
const mockPlan: FarmActionPlan = {
  generatedAt: testDate.toISOString(),
  actions: [
    {
      id: 'action-spraying-avoid',
      priority: 'HIGH',
      category: 'SPRAYING',
      status: 'ACTION_REQUIRED',
      title: 'Avoid Chemical Spraying Today',
      action: 'Do not spray pesticides due to high probability of rain wash-off.',
      reason: '70% rain probability detected within 12 hours.',
      confidence: 'HIGH',
      evidence: ['Open-Meteo reports 70% rain probability'],
      sourceSignals: ['WeatherData (Rain 70%)'],
    },
  ],
  topAction: {
    id: 'action-spraying-avoid',
    priority: 'HIGH',
    category: 'SPRAYING',
    status: 'ACTION_REQUIRED',
    title: 'Avoid Chemical Spraying Today',
    action: 'Do not spray pesticides due to high probability of rain wash-off.',
    reason: '70% rain probability detected within 12 hours.',
    confidence: 'HIGH',
    evidence: ['Open-Meteo reports 70% rain probability'],
    sourceSignals: ['WeatherData (Rain 70%)'],
  },
  attentionCount: 1,
  highPriorityCount: 1,
  hasUrgentAction: true,
  dataCompleteness: { status: 'GOOD', missing: [] },
};

const eventsAction = detectMeaningfulChanges({
  farmContext: mockFarm,
  weather: mockWeatherRainy,
  farmActionPlan: mockPlan,
  currentDate: testDate,
});

const actionEvent = eventsAction.find((e) => e.type === 'ACTION_CHANGE');
assert(actionEvent !== undefined, 'Detects high-priority farm action recommendation');
assert(actionEvent?.title.includes('Avoid Chemical Spraying Today'), 'Action event title matches top action');
assert(actionEvent?.source === 'Farm Action Planner', 'Action source is Farm Action Planner');

// ── TEST 10: Event Fingerprinting & Deduplication ──
console.log('\n--- Test Group 10: Deterministic Deduplication ---');
const fp1 = generateEventFingerprint('RAIN', '2026-09-03', 'rain-80mm');
const fp2 = generateEventFingerprint('RAIN', '2026-09-03', 'rain-80mm');
const fp3 = generateEventFingerprint('RAIN', '2026-09-04', 'rain-80mm');

assert(fp1 === fp2, 'Identical event conditions produce identical fingerprints');
assert(fp1 !== fp3, 'Different dates produce distinct fingerprints');

clearFarmWatchState();
const update1 = updateFarmWatchWithCurrentState({
  farmContext: mockFarm,
  weather: mockWeatherRainy,
  currentDate: testDate,
});

assert(update1.newEvents.length > 0, 'First evaluation detects new events');
const initialEventCount = update1.events.length;

// Immediate re-evaluation with same inputs must not duplicate events
const update2 = updateFarmWatchWithCurrentState({
  farmContext: mockFarm,
  weather: mockWeatherRainy,
  currentDate: testDate,
});

assert(update2.newEvents.length === 0, 'Subsequent evaluation produces 0 new events');
assert(update2.events.length === initialEventCount, 'Event array length remains constant without duplicates');

// ── TEST 11: Follow-Up Recording & Farm Memory Integration ──
console.log('\n--- Test Group 11: Follow-Up & Farm Memory Integration ---');
const targetEvent = update1.events.find((e) => e.requiresFollowUp);
assert(targetEvent !== undefined, 'Found an event requiring follow-up');

if (targetEvent) {
  const followUpRes = recordFarmWatchFollowUp(
    {
      eventId: targetEvent.id,
      affected: 'YES',
      impactCategory: 'SPRAY_WORK',
      note: 'Rain washed away pesticide on field block 2.',
      crop: 'Cotton',
      cropStage: 'Flowering',
      district: 'Multan',
    },
    mockFarm
  );

  assert(followUpRes.event !== null, 'Follow-up returns updated event');
  assert(followUpRes.event?.status === 'RESOLVED', 'Event status transitioned to RESOLVED');
  assert(followUpRes.event?.farmerResponse?.affected === 'YES', 'Farmer response affected = YES');
  assert(followUpRes.event?.farmerResponse?.note?.includes('field block 2'), 'Farmer note preserved verbatim');
  assert(followUpRes.outcome !== null, 'Outcome created in Farm Memory');
  assert(followUpRes.outcome?.actionCategory === 'SPRAYING', 'Outcome category mapped to SPRAYING');
  assert(followUpRes.outcome?.crop === 'Cotton', 'Outcome crop matches "Cotton"');

  // Verify stored in Step 8 Farm Memory service
  const memoryOutcomes = getFarmOutcomes();
  const matchedOutcome = memoryOutcomes.find((o) => o.id === followUpRes.outcome?.id);
  assert(matchedOutcome !== undefined, 'Outcome found in persistent Farm Memory localStorage');
  assert(matchedOutcome?.observation?.includes('Farmer-reported observation'), 'Observation explicitly labeled as farmer-reported');
}

// ── TEST 12: Event Acknowledgment & Dismissal ──
console.log('\n--- Test Group 12: Acknowledgment & Dismissal ---');
const anotherEvent = update1.events.find((e) => e.status === 'NEW');
if (anotherEvent) {
  const ackRes = acknowledgeFarmWatchEvent(anotherEvent.id);
  assert(ackRes !== null, 'Event acknowledged successfully');
  assert(ackRes?.status === 'ACKNOWLEDGED' || ackRes?.status === 'FOLLOW_UP_NEEDED', 'Event status updated appropriately');

  const dismissRes = dismissFarmWatchEvent(anotherEvent.id);
  assert(dismissRes === true, 'Event dismissed successfully');

  const stateAfterDismiss = getFarmWatchState();
  assert(stateAfterDismiss.events.find((e) => e.id === anotherEvent.id) === undefined, 'Dismissed event removed from active events');
  assert(stateAfterDismiss.dismissedFingerprints.includes(anotherEvent.id), 'Dismissed fingerprint recorded to prevent re-alerting');
}

// ── TEST 13: Corruption Resilience ──
console.log('\n--- Test Group 13: Storage & Parsing Resilience ---');
localStorage.setItem('saathi-farm-watch', '{ corrupted json: true, invalid');
const safeState = getFarmWatchState();
assert(Array.isArray(safeState.events), 'Returns safe empty events array on corrupted storage');
assert(safeState.events.length === 0, 'Safe state has length 0');

localStorage.setItem('saathi-farm-watch', JSON.stringify({ events: [{ invalid: true }] }));
const sanitizedState = getFarmWatchState();
assert(sanitizedState.events.length === 0, 'Filters out invalid non-conformant events');

// ── TEST 14: Validation helper ──
console.log('\n--- Test Group 14: Validation Helpers ---');
assert(
  isValidFarmWatchEvent({
    id: 'fw-rain-test',
    type: 'RAIN',
    severity: 'HIGH',
    title: 'Rain test',
    summary: 'Rain summary',
    detectedAt: new Date().toISOString(),
    source: 'Open-Meteo',
    requiresFollowUp: true,
    status: 'NEW',
  }) === true,
  'isValidFarmWatchEvent returns true for valid object'
);

assert(
  isValidFarmWatchEvent({
    id: '',
    type: 'RAIN',
  }) === false,
  'isValidFarmWatchEvent returns false for incomplete object'
);

// ── TEST 15: Weather Snapshot Extraction ──
console.log('\n--- Test Group 15: Weather Snapshot Extraction ---');
const snapNull = extractWeatherSnapshot(null);
assert(snapNull === null, 'extractWeatherSnapshot returns null for null weather');

const snapValid = extractWeatherSnapshot(mockWeatherRainy, testDate);
assert(snapValid !== null, 'extractWeatherSnapshot returns snapshot for valid weather');
assert(snapValid?.temp === 31, 'Snapshot temp is 31°C');
assert(snapValid?.rainProb === 75, 'Snapshot max rain probability is 75%');
assert(snapValid?.windSpeed === 14, 'Snapshot wind speed is 14 km/h');

console.log('\n========================================');
console.log(`TOTAL TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
