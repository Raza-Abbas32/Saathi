/**
 * Saathi Disease + Weather Intelligence Engine Test Suite
 *
 * Verifies all 10 required scenarios:
 *  1. Disease + high rain probability
 *  2. Disease + low rain probability
 *  3. Disease + high wind
 *  4. Disease + high humidity
 *  5. Low disease confidence
 *  6. High disease severity
 *  7. Missing crop
 *  8. Missing crop stage
 *  9. Missing weather data
 * 10. Favorable treatment window
 */

import { evaluateDiseaseWeather } from '../src/services/diseaseWeatherEngine';
import type { DiseaseResult } from '../src/types';
import type { WeatherData } from '../src/services/weather';
import type { FarmContext } from '../src/types/farm';

function createMockDisease(overrides: Partial<DiseaseResult> = {}): DiseaseResult {
  return {
    diseaseName: 'Cotton Leaf Curl Virus (CLCuV)',
    confidence: 86,
    severity: 'moderate',
    cropType: 'Cotton',
    description: 'Upward leaf curling, thickening of veins, and enations on the abaxial surface of leaves.',
    symptoms: ['Upward curling of leaves', 'Vein thickening', 'Stunted plant growth'],
    treatment: [
      'Manage whitefly vector population with recommended neem-based or selective systemic insecticidal sprays.',
      'Eradicate alternate weed hosts around field margins.',
    ],
    prevention: ['Use certified CLCuV-resistant cotton varieties.', 'Implement clean border sanitation.'],
    ...overrides,
  };
}

function createMockWeather(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    latitude: 31.4181,
    longitude: 73.0776,
    locationName: 'Faisalabad, Punjab',
    current: {
      temperature: 29,
      weatherCode: 1,
      windSpeed: 8,
      humidity: 50,
      isDay: true,
      apparentTemperature: 30,
      precipitation: 0,
      soilMoisture0to1cm: 0.22,
      et0: 3.5,
      ...overrides.current,
    },
    forecast: overrides.forecast ?? [
      {
        date: '2026-09-03',
        dayName: 'Today',
        tempMax: 32,
        tempMin: 22,
        precipitationSum: 0,
        precipitationProbabilityMax: 10,
        weatherCode: 1,
        windSpeedMax: 10,
      },
      {
        date: '2026-09-04',
        dayName: 'Tomorrow',
        tempMax: 33,
        tempMin: 23,
        precipitationSum: 0,
        precipitationProbabilityMax: 10,
        weatherCode: 1,
        windSpeedMax: 10,
      },
    ],
    ...overrides,
  };
}

function createMockFarmContext(overrides: Partial<FarmContext> = {}): FarmContext {
  return {
    id: 'farm-001',
    currentCrop: 'Cotton',
    cropVariety: 'FH-142',
    cropStage: 'Vegetative',
    soilType: 'Loam',
    farmSizeAcres: 12,
    waterSource: 'Canal + Tube well',
    irrigationMethod: 'Flood',
    province: 'Punjab',
    district: 'Faisalabad',
    latitude: 31.4181,
    longitude: 73.0776,
    updatedAt: Date.now(),
    ...overrides,
  };
}

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, message: string) {
  totalCount++;
  if (condition) {
    console.log(`  ✅ ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    process.exitCode = 1;
  }
}

console.log('🔬 Running Saathi Disease + Weather Intelligence Engine Tests...\n');

// ── Test 1: Disease + High Rain Probability (>= 50% or >= 2.0 mm) ────────────
console.log('Test 1: Disease + High Rain Probability');
{
  const disease = createMockDisease();
  const weather = createMockWeather({
    forecast: [
      {
        date: '2026-09-03',
        dayName: 'Today',
        tempMax: 28,
        tempMin: 20,
        precipitationSum: 8.5,
        precipitationProbabilityMax: 70,
        weatherCode: 63,
        windSpeedMax: 12,
      },
      {
        date: '2026-09-04',
        dayName: 'Tomorrow',
        tempMax: 29,
        tempMin: 21,
        precipitationSum: 1.0,
        precipitationProbabilityMax: 20,
        weatherCode: 2,
        windSpeedMax: 10,
      },
    ],
  });
  const farm = createMockFarmContext();

  const assessment = evaluateDiseaseWeather({ diseaseResult: disease, weather, farmContext: farm });

  assert(assessment.treatmentTiming.timing === 'avoid', 'Treatment timing should be "avoid" due to high rain risk');
  assert(assessment.rainRisk.level === 'high', 'Rain risk level should be "high"');
  assert(assessment.rainRisk.probability === 70, 'Rain risk probability should be 70%');
  assert(assessment.warnings.some((w) => w.toLowerCase().includes('wash-off') || w.toLowerCase().includes('precipitation')), 'Warnings should mention wash-off or precipitation');
  assert(assessment.actionPlan.treatmentTiming === 'avoid', 'Action plan timing should reflect "avoid"');
}

// ── Test 2: Disease + Low Rain Probability (< 30% with calm wind) ─────────────
console.log('\nTest 2: Disease + Low Rain Probability (< 30%)');
{
  const disease = createMockDisease();
  const weather = createMockWeather({
    forecast: [
      {
        date: '2026-09-03',
        dayName: 'Today',
        tempMax: 30,
        tempMin: 20,
        precipitationSum: 0,
        precipitationProbabilityMax: 10,
        weatherCode: 1,
        windSpeedMax: 8,
      },
    ],
  });
  const farm = createMockFarmContext();

  const assessment = evaluateDiseaseWeather({ diseaseResult: disease, weather, farmContext: farm });

  assert(assessment.treatmentTiming.timing === 'suitable', 'Treatment timing should be "suitable"');
  assert(assessment.rainRisk.level === 'low', 'Rain risk level should be "low"');
  assert(assessment.rainRisk.probability === 10, 'Rain risk probability should be 10%');
}

// ── Test 3: Disease + High Wind (>= 25 km/h) ──────────────────────────────────
console.log('\nTest 3: Disease + High Wind (>= 25 km/h)');
{
  const disease = createMockDisease();
  const weather = createMockWeather({
    current: {
      temperature: 30,
      weatherCode: 1,
      windSpeed: 28,
      humidity: 45,
      isDay: true,
    },
    forecast: [
      {
        date: '2026-09-03',
        dayName: 'Today',
        tempMax: 32,
        tempMin: 21,
        precipitationSum: 0,
        precipitationProbabilityMax: 10,
        weatherCode: 1,
        windSpeedMax: 32,
      },
    ],
  });

  const assessment = evaluateDiseaseWeather({ diseaseResult: disease, weather });

  assert(assessment.treatmentTiming.timing === 'avoid', 'Treatment timing should be "avoid" due to high wind');
  assert(assessment.windRisk.level === 'high', 'Wind risk level should be "high"');
  assert(assessment.windRisk.currentSpeedKmH === 28, 'Current wind speed should be recorded as 28 km/h');
  assert(assessment.warnings.some((w) => w.toLowerCase().includes('wind') || w.toLowerCase().includes('drift')), 'Warnings should mention wind drift');
}

// ── Test 4: Disease + High Humidity (>= 75%) ─────────────────────────────────
console.log('\nTest 4: Disease + High Humidity (>= 75%)');
{
  const disease = createMockDisease();
  const weather = createMockWeather({
    current: {
      temperature: 26,
      weatherCode: 3,
      windSpeed: 9,
      humidity: 82,
      isDay: true,
    },
  });

  const assessment = evaluateDiseaseWeather({ diseaseResult: disease, weather });

  assert(assessment.humidityRisk.level === 'high', 'Humidity risk level should be "high"');
  assert(assessment.humidityRisk.currentHumidity === 82, 'Current humidity should be 82%');
  assert(assessment.humidityRisk.description.toLowerCase().includes('wet') || assessment.humidityRisk.description.toLowerCase().includes('fungal'), 'Humidity description should note prolonged wetness or fungal favorable conditions');
}

// ── Test 5: Low Disease Confidence (< 70%) ───────────────────────────────────
console.log('\nTest 5: Low Disease Confidence (< 70%)');
{
  const disease = createMockDisease({
    confidence: 58,
    diseaseName: 'Suspected Late Blight',
  });
  const weather = createMockWeather();

  const assessment = evaluateDiseaseWeather({ diseaseResult: disease, weather });

  assert(assessment.confidence.isLowConfidence === true, 'isLowConfidence should be true');
  assert(assessment.confidence.confidence === 58, 'Confidence should record 58%');
  assert(assessment.confidence.confidenceNote.includes('below 70%'), 'Confidence note should state confidence is below 70%');
  assert(assessment.uncertainty.length > 0, 'Uncertainty list should contain note about low AI confidence');
}

// ── Test 6: High Disease Severity ('high' or 'severe') ────────────────────────
console.log('\nTest 6: High Disease Severity ("high")');
{
  const disease = createMockDisease({
    severity: 'high',
    diseaseName: 'Yellow Rust (Puccinia striiformis)',
  });
  const weather = createMockWeather();

  const assessment = evaluateDiseaseWeather({ diseaseResult: disease, weather });

  assert(assessment.severity === 'high', 'Severity should remain strictly "high"');
  assert(assessment.immediateActions.some((a) => a.toLowerCase().includes('prompt')), 'Immediate actions should state prompt attention is warranted');
  assert(assessment.actionPlan.severity === 'high', 'Action plan severity must match "high"');
}

// ── Test 7: Missing Crop in Farm Context ──────────────────────────────────────
console.log('\nTest 7: Missing Crop in Farm Context');
{
  const disease = createMockDisease({ cropType: 'Wheat' });
  const weather = createMockWeather();
  const farm = createMockFarmContext({ currentCrop: undefined });

  const assessment = evaluateDiseaseWeather({ diseaseResult: disease, weather, farmContext: farm });

  assert(assessment.cropContext.profileCrop === undefined, 'profileCrop should be undefined');
  assert(assessment.cropContext.cropIdentified === 'Wheat', 'Identified crop should be "Wheat"');
  assert(assessment.missingInformation.some((m) => m.toLowerCase().includes('crop')), 'Missing information should note that target crop was not in profile');
}

// ── Test 8: Missing Crop Stage in Farm Context ────────────────────────────────
console.log('\nTest 8: Missing Crop Stage in Farm Context');
{
  const disease = createMockDisease();
  const weather = createMockWeather();
  const farm = createMockFarmContext({ cropStage: undefined });

  const assessment = evaluateDiseaseWeather({ diseaseResult: disease, weather, farmContext: farm });

  assert(assessment.cropContext.isStageKnown === false, 'isStageKnown should be false');
  assert(assessment.missingInformation.some((m) => m.includes('Crop stage is not available')), 'Missing information must explicitly state crop stage is not available');
}

// ── Test 9: Missing Weather Data (null/offline) ──────────────────────────────
console.log('\nTest 9: Missing Weather Data (null)');
{
  const disease = createMockDisease();
  const farm = createMockFarmContext();

  const assessment = evaluateDiseaseWeather({ diseaseResult: disease, weather: null, farmContext: farm });

  assert(assessment.weatherRisk === 'unknown', 'Weather risk should be "unknown" without weather data');
  assert(assessment.rainRisk.level === 'unknown', 'Rain risk should be "unknown"');
  assert(assessment.treatmentTiming.timing === 'caution', 'Treatment timing should default to "caution" when weather is missing');
  assert(assessment.missingInformation.some((m) => m.toLowerCase().includes('weather')), 'Missing information must note weather forecast is unavailable');
}

// ── Test 10: Favorable Treatment Window (Low rain, calm wind, high confidence) ─
console.log('\nTest 10: Favorable Treatment Window');
{
  const disease = createMockDisease({
    confidence: 88,
    severity: 'moderate',
  });
  const weather = createMockWeather({
    current: {
      temperature: 27,
      weatherCode: 1,
      windSpeed: 7,
      humidity: 52,
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
        weatherCode: 1,
        windSpeedMax: 9,
      },
    ],
  });
  const farm = createMockFarmContext();

  const assessment = evaluateDiseaseWeather({ diseaseResult: disease, weather, farmContext: farm });

  assert(assessment.treatmentTiming.timing === 'suitable', 'Treatment timing must be "suitable"');
  assert(assessment.rainRisk.level === 'low', 'Rain risk must be "low"');
  assert(assessment.windRisk.level === 'low', 'Wind risk must be "low"');
  assert(assessment.weatherRisk === 'low', 'Overall weather risk must be "low"');
  assert(assessment.actionPlan.nextAction.length > 0, 'Action plan must have a defined next action');
  assert(assessment.actionPlan.weatherWindow.toLowerCase().includes('favorable') || assessment.actionPlan.weatherWindow.toLowerCase().includes('window'), 'Weather window should highlight favorable window');
}

console.log('\n══════════════════════════════════════');
console.log(`Disease + Weather Tests Completed: ${passedCount}/${totalCount} Passed`);
console.log('══════════════════════════════════════\n');

if (passedCount !== totalCount) {
  process.exit(1);
}
