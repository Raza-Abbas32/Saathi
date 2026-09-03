/**
 * Saathi Farm Decision Engine Test Suite
 *
 * Tests the 10 required agricultural scenarios:
 * 1. High rain probability.
 * 2. Low rain probability.
 * 3. High wind.
 * 4. Moderate heat.
 * 5. Missing crop.
 * 6. Missing soil moisture.
 * 7. Missing crop stage.
 * 8. No major weather risk.
 * 9. Tomorrow better than today.
 * 10. Tomorrow worse than today.
 */

import { evaluateFarmDecisions } from '../src/services/farmDecisionEngine';
import { WeatherData } from '../src/services/weather';
import { FarmContext } from '../src/types/farm';

function createMockWeather(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    latitude: 31.4181,
    longitude: 73.0776,
    locationName: 'Faisalabad, Punjab',
    current: {
      temperature: 28,
      weatherCode: 1, // Mainly clear
      windSpeed: 8,
      humidity: 50,
      isDay: true,
      apparentTemperature: 29,
      precipitation: 0,
      soilMoisture0to1cm: 0.22,
      et0: 3.5,
      ...overrides.current,
    },
    forecast: overrides.forecast ?? [
      {
        date: '2026-09-03',
        dayName: 'Today',
        tempMax: 30,
        tempMin: 20,
        precipitationSum: 0,
        precipitationProbabilityMax: 10,
        weatherCode: 1,
        windSpeedMax: 10,
        et0: 3.5,
      },
      {
        date: '2026-09-04',
        dayName: 'Tomorrow',
        tempMax: 31,
        tempMin: 21,
        precipitationSum: 0,
        precipitationProbabilityMax: 15,
        weatherCode: 1,
        windSpeedMax: 11,
        et0: 3.6,
      },
    ],
    agricultural: {
      et0DailySum: 3.5,
      soilMoistureRootZone: 0.24,
      ...overrides.agricultural,
    },
    ...overrides,
  };
}

function createMockFarm(overrides: Partial<FarmContext> = {}): FarmContext {
  return {
    farmName: 'Bismillah Farm',
    farmSizeAcres: 12,
    province: 'Punjab',
    district: 'Faisalabad',
    soilType: 'Loamy',
    waterSource: 'Canal',
    currentCrop: 'Wheat',
    cropVariety: 'Dilkash-20',
    cropStage: 'Flowering',
    irrigationMethod: 'Flood',
    ...overrides,
  };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, failureDetail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ ${testName}`);
    if (failureDetail) {
      console.error(`     Reason: ${failureDetail}`);
    }
  }
}

console.log('\n🌱 Running Saathi Farm Decision Engine Tests...\n');

// ── Test 1: High Rain Probability ──────────────────────────────────────────
{
  console.log('Test 1: High Rain Probability (>= 50% or >= 2.0 mm)');
  const weather = createMockWeather({
    forecast: [
      {
        date: '2026-09-03',
        dayName: 'Today',
        tempMax: 27,
        tempMin: 19,
        precipitationSum: 6.5,
        precipitationProbabilityMax: 70,
        weatherCode: 63, // Moderate rain
        windSpeedMax: 14,
      },
      {
        date: '2026-09-04',
        dayName: 'Tomorrow',
        tempMax: 26,
        tempMin: 18,
        precipitationSum: 4.0,
        precipitationProbabilityMax: 60,
        weatherCode: 61,
        windSpeedMax: 12,
      },
    ],
  });
  const farm = createMockFarm();
  const res = evaluateFarmDecisions(farm, weather);

  assert(res.sprayingDecision.status === 'avoid', 'Spraying status should be "avoid" due to rain');
  assert(res.irrigationDecision.status === 'delay', 'Irrigation status should be "delay"');
  assert(res.priority === 'high', 'Priority should be "high"');
  assert(res.alerts.length > 0, 'Alerts should contain rain warning');
}

// ── Test 2: Low Rain Probability ───────────────────────────────────────────
{
  console.log('\nTest 2: Low Rain Probability (< 30% with gentle wind)');
  const weather = createMockWeather({
    current: {
      temperature: 28,
      weatherCode: 0,
      windSpeed: 8,
      isDay: true,
      soilMoisture0to1cm: 0.30,
    },
    forecast: [
      {
        date: '2026-09-03',
        dayName: 'Today',
        tempMax: 29,
        tempMin: 18,
        precipitationSum: 0,
        precipitationProbabilityMax: 10,
        weatherCode: 0,
        windSpeedMax: 9,
        et0: 3.2,
      },
    ],
  });
  const farm = createMockFarm();
  const res = evaluateFarmDecisions(farm, weather);

  assert(res.sprayingDecision.status === 'suitable', 'Spraying status should be "suitable"');
  assert(res.irrigationDecision.status !== 'delay', 'Irrigation should not be delayed by rain');
  assert(res.sprayingDecision.precipitationProbability <= 10, 'Rain prob should be low');
}

// ── Test 3: High Wind (>= 25 km/h) ─────────────────────────────────────────
{
  console.log('\nTest 3: High Wind (>= 25 km/h)');
  const weather = createMockWeather({
    current: {
      temperature: 30,
      weatherCode: 1,
      windSpeed: 28,
      isDay: true,
    },
    forecast: [
      {
        date: '2026-09-03',
        dayName: 'Today',
        tempMax: 32,
        tempMin: 22,
        precipitationSum: 0,
        precipitationProbabilityMax: 5,
        weatherCode: 1,
        windSpeedMax: 32,
      },
    ],
  });
  const farm = createMockFarm();
  const res = evaluateFarmDecisions(farm, weather);

  assert(res.windDecision.risk === 'high', 'Wind risk should be "high"');
  assert(res.sprayingDecision.status === 'avoid', 'Spraying status should be "avoid" due to drift hazard');
  assert(res.priority === 'high', 'Priority should be "high"');
}

// ── Test 4: Moderate Heat (maxTemp 36°C) ───────────────────────────────────
{
  console.log('\nTest 4: Moderate Heat (35°C–39°C)');
  const weather = createMockWeather({
    forecast: [
      {
        date: '2026-09-03',
        dayName: 'Today',
        tempMax: 37,
        tempMin: 24,
        precipitationSum: 0,
        precipitationProbabilityMax: 10,
        weatherCode: 0,
        apparentTempMax: 38,
        windSpeedMax: 10,
      },
    ],
  });
  const farm = createMockFarm({ cropStage: 'Flowering' });
  const res = evaluateFarmDecisions(farm, weather);

  assert(res.heatStressDecision.level === 'moderate', 'Heat stress should be "moderate"');
  assert(
    res.heatStressDecision.details?.includes('Flowering') ?? false,
    'Crop flowering sensitivity should be noted in details'
  );
}

// ── Test 5: Missing Crop ───────────────────────────────────────────────────
{
  console.log('\nTest 5: Missing Crop (null or undefined currentCrop)');
  const weather = createMockWeather();
  const farm = createMockFarm({ currentCrop: undefined });
  const res = evaluateFarmDecisions(farm, weather);

  assert(res.meta.missingFields.includes('currentCrop'), 'Meta should list currentCrop as missing');
  assert(
    res.heatStressDecision.details?.includes('No crop specified') ?? false,
    'Heat details should indicate no crop specified'
  );
  assert(res.sprayingDecision.status !== undefined, 'Spraying evaluation should still succeed gracefully');
}

// ── Test 6: Missing Soil Moisture ──────────────────────────────────────────
{
  console.log('\nTest 6: Missing Soil Moisture (sensors/satellites unavailable)');
  const weather = createMockWeather({
    current: {
      temperature: 29,
      weatherCode: 1,
      windSpeed: 7,
      isDay: true,
      soilMoisture0to1cm: undefined,
    },
    agricultural: {
      et0DailySum: 4.0,
      soilMoistureRootZone: undefined,
    },
  });
  const farm = createMockFarm();
  const res = evaluateFarmDecisions(farm, weather);

  assert(res.irrigationDecision.status !== undefined, 'Irrigation decision must not crash without soil moisture');
  assert(
    res.irrigationDecision.reason.length > 0,
    'Irrigation decision provides reasoning relying on ET0/forecast'
  );
}

// ── Test 7: Missing Crop Stage ─────────────────────────────────────────────
{
  console.log('\nTest 7: Missing Crop Stage (crop present, but stage is undefined)');
  const weather = createMockWeather();
  const farm = createMockFarm({ currentCrop: 'Cotton', cropStage: undefined });
  const res = evaluateFarmDecisions(farm, weather);

  assert(res.meta.missingFields.includes('cropStage'), 'Meta should list cropStage as missing');
  assert(
    res.heatStressDecision.details?.includes('Crop stage is not specified') ?? false,
    'Heat stress should not assume a stage'
  );
}

// ── Test 8: No Major Weather Risk ──────────────────────────────────────────
{
  console.log('\nTest 8: No Major Weather Risk (calm, mild, low rain)');
  const weather = createMockWeather({
    current: {
      temperature: 25,
      weatherCode: 0,
      windSpeed: 7,
      isDay: true,
      soilMoisture0to1cm: 0.30,
    },
    forecast: [
      {
        date: '2026-09-03',
        dayName: 'Today',
        tempMax: 26,
        tempMin: 16,
        precipitationSum: 0,
        precipitationProbabilityMax: 5,
        weatherCode: 0,
        windSpeedMax: 8,
        et0: 2.8,
      },
    ],
  });
  const farm = createMockFarm();
  const res = evaluateFarmDecisions(farm, weather);

  assert(res.overallStatus === 'optimal', 'Overall status should be "optimal"');
  assert(res.priority === 'low', 'Priority should be "low"');
  assert(res.sprayingDecision.status === 'suitable', 'Spraying should be "suitable"');
  assert(res.windDecision.risk === 'low', 'Wind risk should be "low"');
  assert(res.heatStressDecision.level === 'low', 'Heat stress should be "low"');
}

// ── Test 9: Tomorrow Better Than Today ─────────────────────────────────────
{
  console.log('\nTest 9: Tomorrow Better Than Today (Today: 26 km/h wind & 60% rain; Tomorrow: 8 km/h & 5% rain)');
  const weather = createMockWeather({
    current: {
      temperature: 28,
      weatherCode: 61,
      windSpeed: 26,
      isDay: true,
    },
    forecast: [
      {
        date: '2026-09-03',
        dayName: 'Today',
        tempMax: 28,
        tempMin: 18,
        precipitationSum: 5.0,
        precipitationProbabilityMax: 65,
        weatherCode: 61,
        windSpeedMax: 28,
      },
      {
        date: '2026-09-04',
        dayName: 'Tomorrow',
        tempMax: 27,
        tempMin: 17,
        precipitationSum: 0,
        precipitationProbabilityMax: 10,
        weatherCode: 0,
        windSpeedMax: 8,
      },
    ],
  });
  const farm = createMockFarm();
  const res = evaluateFarmDecisions(farm, weather);

  assert(
    res.tomorrowComparison.tomorrowBetterForSpraying === true,
    'Tomorrow should be evaluated as better for spraying'
  );
  assert(
    res.tomorrowComparison.tomorrowBetterForWork === true,
    'Tomorrow should be evaluated as more favorable for work'
  );
}

// ── Test 10: Tomorrow Worse Than Today ────────────────────────────────────
{
  console.log('\nTest 10: Tomorrow Worse Than Today (Today: calm 28°C; Tomorrow: 42°C, 30 km/h wind, 60% rain)');
  const weather = createMockWeather({
    current: {
      temperature: 28,
      weatherCode: 0,
      windSpeed: 8,
      isDay: true,
    },
    forecast: [
      {
        date: '2026-09-03',
        dayName: 'Today',
        tempMax: 29,
        tempMin: 19,
        precipitationSum: 0,
        precipitationProbabilityMax: 5,
        weatherCode: 0,
        windSpeedMax: 9,
      },
      {
        date: '2026-09-04',
        dayName: 'Tomorrow',
        tempMax: 42,
        tempMin: 28,
        precipitationSum: 8.0,
        precipitationProbabilityMax: 70,
        weatherCode: 63,
        windSpeedMax: 30,
      },
    ],
  });
  const farm = createMockFarm();
  const res = evaluateFarmDecisions(farm, weather);

  assert(
    res.tomorrowComparison.tomorrowBetterForWork === false,
    'Tomorrow should be evaluated as less favorable for work'
  );
  assert(
    res.tomorrowComparison.comparisonDetails.some((d) => d.includes('warmer') || d.includes('precipitation')),
    'Comparison details should mention worsening conditions'
  );
}

console.log(`\n══════════════════════════════════════`);
console.log(`Tests Completed: ${passedTests}/${totalTests} Passed`);
console.log(`══════════════════════════════════════\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
