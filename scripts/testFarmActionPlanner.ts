/**
 * Saathi Farm Action Planner Test Suite
 *
 * Validates deterministic execution across 13 real-world agricultural scenarios:
 * 1. High rain probability → Avoid spraying (HIGH priority)
 * 2. Low diagnosis confidence (<70%) → Scouting action generated
 * 3. Significant rainfall expected → Irrigation delay action (WAIT)
 * 4. Dry soil & high ET0 → Active irrigation action
 * 5. Extreme temperature (>40°C) → Severe heat stress weather action
 * 6. Reproductive crop lifecycle phase → Sensitive stage monitoring action
 * 7. Stage/date inconsistency → Review sowing date action
 * 8. Government market price available → AMIS Punjab mandi rate action with transparent provenance
 * 9. Economic impact available → Mathematical gross value action with explicit disclaimers
 * 10. Missing farm profile / incomplete data → Safe fallback with missing fields array
 * 11. Calm weather & healthy crop → Clean "No urgent action" routine status
 * 12. Strict sorting verification → HIGH > MEDIUM > LOW priority ordering
 * 13. Evidence provenance guarantee → Every action contains non-empty evidence & sourceSignals
 */

import { evaluateFarmActionPlan } from '../src/services/farmActionPlanner';
import type { WeatherData } from '../src/services/weather';
import type { DiseaseResult } from '../src/types';
import type { NormalizedMarketCropPrice } from '../src/types/market';
import type { EconomicImpactResult } from '../src/types/economicImpact';

function createMockWeather(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    latitude: 31.4181,
    longitude: 73.0776,
    locationName: 'Faisalabad, Punjab',
    current: {
      temperature: 28,
      weatherCode: 1,
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

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${details ? ` (${details})` : ''}`);
    failed++;
  }
}

console.log('🌾 RUNNING SAATHI FARM ACTION PLANNER TEST SUITE\n');

// ── Test 1: High Rain Probability → Avoid Spraying ───────────────────────────
console.log('Test 1: High rain probability avoidance');
{
  const weather = createMockWeather({
    forecast: [
      {
        date: '2026-09-03',
        dayName: 'Today',
        tempMax: 29,
        tempMin: 20,
        precipitationSum: 15,
        precipitationProbabilityMax: 80,
        weatherCode: 63,
        windSpeedMax: 12,
        et0: 2.1,
      },
    ],
  });

  const plan = evaluateFarmActionPlan({
    farmContext: { currentCrop: 'Cotton', cropStage: 'Vegetative growth', district: 'Multan' },
    weather,
  });

  const topAction = plan.topAction;
  assert(topAction !== undefined, 'Top action is generated');
  assert(topAction?.priority === 'HIGH', 'Top action is HIGH priority');
  assert(topAction?.category === 'SPRAYING', 'Top action category is SPRAYING');
  assert(topAction?.status === 'WAIT', 'Top action status is WAIT');
  assert(plan.hasUrgentAction === true, 'hasUrgentAction is true');
  assert(plan.highPriorityCount >= 1, 'highPriorityCount is at least 1');
}

// ── Test 2: Low Confidence Disease Diagnosis → Scouting Action ───────────────
console.log('\nTest 2: Low confidence disease diagnosis generates scouting action');
{
  const diseaseResult: DiseaseResult = {
    diseaseName: 'Early Blight',
    cropType: 'Tomato',
    confidence: 54, // < 70%
    severity: 'moderate',
    treatment: ['Remove infected leaves'],
    prevention: ['Avoid overhead watering'],
  };

  const weather = createMockWeather();
  const plan = evaluateFarmActionPlan({
    farmContext: { currentCrop: 'Tomato', cropStage: 'Fruiting / grain filling', district: 'Faisalabad' },
    weather,
    diseaseResult,
  });

  const scoutAction = plan.actions.find((a) => a.category === 'SCOUTING');
  assert(scoutAction !== undefined, 'Scouting action generated for low-confidence diagnosis');
  assert(scoutAction?.priority === 'MEDIUM', 'Scouting action has MEDIUM priority');
  assert(scoutAction?.status === 'ACTION_REQUIRED', 'Scouting action status is ACTION_REQUIRED');
  assert(scoutAction?.reason.includes('54%'), 'Reason references the 54% confidence');
  assert(scoutAction?.limitations !== undefined && scoutAction.limitations.length > 0, 'Transparent limitations included');
}

// ── Test 3: Expected Rainfall → Irrigation Delay ─────────────────────────────
console.log('\nTest 3: Expected rainfall delays irrigation');
{
  const weather = createMockWeather({
    forecast: [
      {
        date: '2026-09-03',
        dayName: 'Today',
        tempMax: 30,
        tempMin: 22,
        precipitationSum: 8.5,
        precipitationProbabilityMax: 75,
        weatherCode: 61,
        windSpeedMax: 10,
        et0: 2.8,
      },
    ],
  });

  const plan = evaluateFarmActionPlan({
    farmContext: { currentCrop: 'Wheat', cropStage: 'Vegetative growth', district: 'Faisalabad' },
    weather,
  });

  const irrAction = plan.actions.find((a) => a.category === 'IRRIGATION');
  assert(irrAction !== undefined, 'Irrigation action is generated');
  assert(irrAction?.status === 'WAIT', 'Irrigation action is WAIT');
  assert(irrAction?.action.toLowerCase().includes('hold off') || irrAction?.action.toLowerCase().includes('delay'), 'Action instructs holding off');
}

// ── Test 4: Dry Soil & High ET0 → Irrigation Review ──────────────────────────
console.log('\nTest 4: Dry soil and high evapotranspiration');
{
  const weather = createMockWeather({
    current: {
      temperature: 36,
      weatherCode: 0,
      windSpeed: 8,
      humidity: 25,
      isDay: true,
      apparentTemperature: 37,
      precipitation: 0,
      soilMoisture0to1cm: 0.08,
      et0: 6.2,
    },
    forecast: [
      {
        date: '2026-09-03',
        dayName: 'Today',
        tempMax: 38,
        tempMin: 25,
        precipitationSum: 0,
        precipitationProbabilityMax: 0,
        weatherCode: 0,
        windSpeedMax: 8,
        et0: 6.2,
      },
    ],
    agricultural: {
      et0DailySum: 6.2,
      soilMoistureRootZone: 0.10,
    },
  });

  const plan = evaluateFarmActionPlan({
    farmContext: { currentCrop: 'Sugarcane', cropStage: 'Vegetative growth', district: 'Rahim Yar Khan' },
    weather,
  });

  const irrAction = plan.actions.find((a) => a.category === 'IRRIGATION');
  assert(irrAction !== undefined, 'Irrigation action is generated');
  assert(irrAction?.status === 'ACTION_REQUIRED', 'Irrigation status is ACTION_REQUIRED');
}

// ── Test 5: Severe Heat Stress Precaution ─────────────────────────────────────
console.log('\nTest 5: Extreme temperature triggers severe heat stress action');
{
  const weather = createMockWeather({
    current: {
      temperature: 44,
      weatherCode: 0,
      windSpeed: 10,
      humidity: 20,
      isDay: true,
      apparentTemperature: 46,
      precipitation: 0,
      soilMoisture0to1cm: 0.15,
      et0: 7.5,
    },
    forecast: [
      {
        date: '2026-09-03',
        dayName: 'Today',
        tempMax: 45,
        tempMin: 29,
        precipitationSum: 0,
        precipitationProbabilityMax: 0,
        weatherCode: 0,
        windSpeedMax: 12,
        et0: 7.5,
      },
    ],
  });

  const plan = evaluateFarmActionPlan({
    farmContext: { currentCrop: 'Cotton', cropStage: 'Flowering', district: 'Multan' },
    weather,
  });

  const heatAction = plan.actions.find((a) => a.id === 'action-weather-heat-severe');
  assert(heatAction !== undefined, 'Severe heat stress action generated');
  assert(heatAction?.priority === 'HIGH', 'Severe heat stress has HIGH priority');
  assert(heatAction?.timing?.includes('12 PM') === true, 'Timing specifies afternoon window');
}

// ── Test 6: Reproductive Crop Lifecycle Phase ────────────────────────────────
console.log('\nTest 6: Reproductive crop lifecycle phase');
{
  const weather = createMockWeather();
  const plan = evaluateFarmActionPlan({
    farmContext: { currentCrop: 'Wheat', cropStage: 'Flowering', district: 'Faisalabad' },
    weather,
  });

  const lcAction = plan.actions.find((a) => a.category === 'CROP_LIFECYCLE');
  assert(lcAction !== undefined, 'Crop lifecycle action generated');
  assert(lcAction?.title.includes('Flowering'), 'Title includes the flowering stage');
  assert(lcAction?.status === 'MONITOR', 'Lifecycle status is MONITOR');
}

// ── Test 7: Stage / Date Inconsistency ───────────────────────────────────────
console.log('\nTest 7: Stage and sowing date mismatch');
{
  const weather = createMockWeather();
  const currentDate = new Date('2026-09-03');
  // Sown only 2 days ago, but farmer selected 'Harvest'
  const plan = evaluateFarmActionPlan({
    farmContext: {
      currentCrop: 'Wheat',
      sowingDate: '2026-09-01',
      cropStage: 'Harvest',
      district: 'Faisalabad',
    },
    weather,
    currentDate,
  });

  const consistencyAction = plan.actions.find((a) => a.id === 'action-lifecycle-consistency');
  assert(consistencyAction !== undefined, 'Stage consistency review action generated');
  assert(consistencyAction?.priority === 'LOW', 'Consistency review has LOW priority');
  assert(consistencyAction?.status === 'MONITOR', 'Consistency review status is MONITOR');
}

// ── Test 8: AMIS Punjab Government Market Price ──────────────────────────────
console.log('\nTest 8: Government market price integration');
{
  const marketPrices: NormalizedMarketCropPrice[] = [
    {
      crop: 'Wheat',
      currentPrice: 3950,
      previousPrice: 3900,
      change: 50,
      changePercent: 1.28,
      unit: 'Rs / 40 kg (maund)',
      source: 'AMIS_PUNJAB',
      sourceLabel: 'Agriculture Marketing Information Service (AMIS), Punjab',
      isOfficial: true,
      reportedDate: '03/09/2026',
      retrievedAt: new Date().toISOString(),
      rawUnit: 'Rs / 100 kg',
      pricePer100Kg: 9875,
      minPricePer40Kg: 3900,
      maxPricePer40Kg: 4000,
      mandisCount: 12,
      mandis: [],
      primaryMandi: {
        mandiName: 'Faisalabad Grain Market',
        district: 'Faisalabad',
        minPrice: 3900,
        maxPrice: 4000,
        fqpPrice: 3950,
      },
      status: 'ACTIVE',
      isFresh: true,
    },
  ];

  const weather = createMockWeather();
  const plan = evaluateFarmActionPlan({
    farmContext: { currentCrop: 'Wheat', cropStage: 'Harvest', district: 'Faisalabad' },
    weather,
    marketPrices,
  });

  const marketAction = plan.actions.find((a) => a.category === 'MARKET');
  assert(marketAction !== undefined, 'Market action generated');
  assert(marketAction?.reason.includes('3,950'), 'Reason mentions Rs 3,950 rate');
  assert(marketAction?.limitations !== undefined, 'Market action has transparent limitations');
  assert(
    marketAction?.limitations?.some((l) => l.toLowerCase().includes('not guaranteed farmgate')) === true,
    'Explains rate is wholesale mandi quotation, not guaranteed farmgate price'
  );
}

// ── Test 9: Economic Impact Gross Value ──────────────────────────────────────
console.log('\nTest 9: Economic impact gross value integration');
{
  const economicImpact: EconomicImpactResult = {
    crop: 'Wheat',
    quantity: { value: 100, unit: 'maunds' },
    marketPrice: { pricePerMaund: 3900, source: 'AMIS_PUNJAB', sourceLabel: 'AMIS Punjab', isOfficial: true },
    estimatedGrossValue: { value: 390000, formatted: 'Rs 390,000' },
    potentialLossAvoided: { status: 'UNQUANTIFIABLE', reason: 'No chemical intervention parameter provided' },
    confidence: 'HIGH',
    evaluatedAt: new Date().toISOString(),
    transparency: {
      grossValueCalculation: '100 maunds × Rs 3,900/maund = Rs 390,000',
      missingParameters: [],
      assumptionsUsed: [],
    },
    disclaimers: ['Gross value is a mathematical estimate.'],
  };

  const weather = createMockWeather();
  const plan = evaluateFarmActionPlan({
    farmContext: { currentCrop: 'Wheat', cropStage: 'Maturity', expectedQuantity: 100, district: 'Faisalabad' },
    weather,
    economicImpact,
  });

  const ecoAction = plan.actions.find((a) => a.category === 'ECONOMIC');
  assert(ecoAction !== undefined, 'Economic action is generated');
  assert(ecoAction?.reason.includes('390,000'), 'Reason includes Rs 390,000');
  assert(ecoAction?.limitations !== undefined, 'Economic action has limitations');
}

// ── Test 10: Missing Farm Profile / Incomplete Data ──────────────────────────
console.log('\nTest 10: Incomplete data handling');
{
  const plan = evaluateFarmActionPlan({
    farmContext: null, // Empty farm
    weather: null,     // No weather
  });

  assert(plan.actions.length > 0, 'Returns at least one fallback action');
  assert(plan.dataCompleteness.status === 'LIMITED', 'Data completeness is marked LIMITED');
  assert(plan.dataCompleteness.missing.length >= 2, 'Missing fields tracked explicitly');
  assert(plan.topAction?.status === 'INSUFFICIENT_DATA', 'Top action is INSUFFICIENT_DATA');
}

// ── Test 11: Stable Weather & Routine Monitoring ─────────────────────────────
console.log('\nTest 11: Calm weather and no disease');
{
  const weather = createMockWeather();
  const plan = evaluateFarmActionPlan({
    farmContext: { currentCrop: 'Wheat', district: 'Faisalabad' },
    weather,
  });

  assert(plan.topAction !== undefined, 'Top action exists');
  assert(plan.hasUrgentAction === false, 'hasUrgentAction is false under calm conditions');
  assert(plan.highPriorityCount === 0, 'No high-priority alerts');
}

// ── Test 12: Strict Deterministic Priority Ordering ──────────────────────────
console.log('\nTest 12: Priority sorting check');
{
  const weather = createMockWeather({
    forecast: [
      {
        date: '2026-09-03',
        dayName: 'Today',
        tempMax: 44, // Severe heat
        tempMin: 28,
        precipitationSum: 15, // High rain
        precipitationProbabilityMax: 85,
        weatherCode: 63,
        windSpeedMax: 20,
        et0: 4.5,
      },
    ],
  });

  const plan = evaluateFarmActionPlan({
    farmContext: { currentCrop: 'Cotton', cropStage: 'Flowering', district: 'Multan' },
    weather,
  });

  // Verify all HIGH priority actions come before MEDIUM, which come before LOW
  let lastWeight = 999999;
  let orderPreserved = true;
  const weights: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

  for (const act of plan.actions) {
    const actWeight = weights[act.priority] || 0;
    if (actWeight > lastWeight) {
      orderPreserved = false;
      break;
    }
    lastWeight = actWeight;
  }

  assert(orderPreserved === true, 'Actions strictly follow HIGH > MEDIUM > LOW priority ordering');
}

// ── Test 13: Provenance & Non-Empty Evidence Guarantee ───────────────────────
console.log('\nTest 13: Evidence and provenance validation');
{
  const weather = createMockWeather();
  const plan = evaluateFarmActionPlan({
    farmContext: { currentCrop: 'Cotton', cropStage: 'Vegetative growth', district: 'Multan' },
    weather,
  });

  let allHaveProvenance = true;
  for (const act of plan.actions) {
    if (
      !act.id ||
      !act.title ||
      !act.action ||
      !act.reason ||
      !Array.isArray(act.evidence) ||
      act.evidence.length === 0 ||
      !Array.isArray(act.sourceSignals) ||
      act.sourceSignals.length === 0
    ) {
      allHaveProvenance = false;
      break;
    }
  }

  assert(allHaveProvenance === true, 'All generated actions have complete evidence & source provenance');
}

console.log(`\n======================================================`);
console.log(`FARM ACTION PLANNER TEST RESULTS: ${passed} passed, ${failed} failed.`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
}
