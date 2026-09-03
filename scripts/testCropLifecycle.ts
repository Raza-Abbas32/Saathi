/**
 * Saathi Crop Lifecycle Intelligence Test Suite
 *
 * Verifies all 10 required scenarios:
 *  1. Crop with sowing date and stage
 *  2. Crop without sowing date
 *  3. Crop without stage
 *  4. Crop without variety
 *  5. Future sowing date
 *  6. Same-day sowing
 *  7. Missing crop
 *  8. Stage consistency unknown
 *  9. Existing lifecycle data reuse if available
 * 10. No existing lifecycle database
 *
 * CRITICAL VERIFICATION:
 * Tests must verify that the farmer-selected cropStage is NEVER silently overwritten.
 */

import {
  evaluateCropLifecycle,
  calculateDaysSinceSowing,
  getQualitativePhase,
  evaluateStageConsistency,
} from '../src/services/cropLifecycle';
import type { FarmContext, CropStage } from '../src/types/farm';

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, description: string): void {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✅ ${description}`);
  } else {
    console.error(`  ❌ FAILED: ${description}`);
  }
}

// Fixed reference date: 2026-09-03
const REF_DATE = new Date(2026, 8, 3); // Sep 3, 2026

console.log('🌾 Running Saathi Crop Lifecycle Intelligence Tests...\n');

// ── Test 1: Crop with sowing date and stage ───────────────────────────────────
{
  console.log('Test 1: Crop with Sowing Date and Stage');
  const farm: FarmContext = {
    currentCrop: 'Cotton',
    cropVariety: 'FH-142',
    sowingDate: '2026-06-03', // 92 days prior to 2026-09-03
    cropStage: 'Flowering',
    farmSizeAcres: 10,
    district: 'Faisalabad',
  };

  const context = evaluateCropLifecycle(farm, REF_DATE);

  // Direct helper checks
  const rawDuration = calculateDaysSinceSowing('2026-06-03', REF_DATE);
  assert(rawDuration.daysSinceSowing === 92, 'calculateDaysSinceSowing returns 92 directly');

  const rawConsistency = evaluateStageConsistency('Flowering', 92, false, '2026-06-03');
  assert(rawConsistency.consistency === 'unknown', 'evaluateStageConsistency returns unknown without crop database');

  assert(context.crop === 'Cotton', 'Crop name is preserved');
  assert(context.variety === 'FH-142', 'Crop variety is preserved');
  assert(context.currentStage === 'Flowering', 'Crop stage is preserved as source of truth');
  assert(context.daysSinceSowing === 92, 'Elapsed days since sowing calculates accurately (92 days)');
  assert(context.isUpcomingSowing === false, 'isUpcomingSowing should be false');
  assert(context.lifecycleProgress === 'reproductive', 'Flowering maps to "reproductive" phase');
  assert(
    context.lifecycleNotes.some((n) => n.includes('Reproductive phase')),
    'Lifecycle notes include reproductive sensitivity guidance'
  );
}

// ── Test 2: Crop without sowing date ──────────────────────────────────────────
{
  console.log('\nTest 2: Crop without Sowing Date');
  const farm: FarmContext = {
    currentCrop: 'Wheat',
    cropVariety: 'Dilkash-20',
    cropStage: 'Vegetative growth',
  };

  const context = evaluateCropLifecycle(farm, REF_DATE);

  assert(context.daysSinceSowing === null, 'daysSinceSowing must be null when sowingDate is omitted');
  assert(context.isUpcomingSowing === false, 'isUpcomingSowing should be false');
  assert(context.currentStage === 'Vegetative growth', 'Farmer-selected cropStage is intact');
  assert(
    context.missingInformation.includes('Sowing date is not available.'),
    'Missing information notes absent sowing date'
  );
  assert(context.stageConsistency === 'unknown', 'Stage consistency is unknown without sowing date');
}

// ── Test 3: Crop without stage ────────────────────────────────────────────────
{
  console.log('\nTest 3: Crop without Stage');
  const farm: FarmContext = {
    currentCrop: 'Rice',
    sowingDate: '2026-07-01',
  };

  const context = evaluateCropLifecycle(farm, REF_DATE);

  assert(context.currentStage === undefined, 'Current stage remains undefined');
  assert(context.lifecycleProgress === 'unknown', 'Lifecycle progress is unknown when stage is omitted');
  assert(
    context.missingInformation.includes('Current crop stage has not been selected.'),
    'Missing information notes unselected stage'
  );
  assert(context.stageConsistency === 'unknown', 'Stage consistency is unknown when stage is missing');
}

// ── Test 4: Crop without variety ──────────────────────────────────────────────
{
  console.log('\nTest 4: Crop without Variety');
  const farm: FarmContext = {
    currentCrop: 'Sugarcane',
    cropStage: 'Fruiting / grain filling',
    sowingDate: '2026-03-01',
  };

  const context = evaluateCropLifecycle(farm, REF_DATE);

  assert(context.variety === undefined, 'Variety is undefined');
  assert(
    context.missingInformation.includes('Crop variety is not specified.'),
    'Missing information notes absent crop variety'
  );
  assert(context.currentStage === 'Fruiting / grain filling', 'Stage is strictly preserved');
  assert(context.lifecycleProgress === 'reproductive', 'Fruiting stage maps to reproductive phase');
}

// ── Test 5: Future sowing date ────────────────────────────────────────────────
{
  console.log('\nTest 5: Future Sowing Date');
  // Sowing date is 12 days in the future (2026-09-15)
  const farmFuture: FarmContext = {
    currentCrop: 'Wheat',
    sowingDate: '2026-09-15',
    cropStage: 'Flowering', // Inconsistent: future sowing with mature stage
  };

  const context = evaluateCropLifecycle(farmFuture, REF_DATE);

  assert(context.daysSinceSowing === null, 'daysSinceSowing must not return a negative duration');
  assert(context.isUpcomingSowing === true, 'isUpcomingSowing must be true for future date');
  assert(context.daysUntilSowing === 12, 'daysUntilSowing correctly reports 12 days until sowing');
  assert(
    context.stageConsistency === 'possibly_inconsistent',
    'Stage consistency flags mismatch for future date with flowering stage'
  );
  assert(
    context.stageExplanation.includes('Stage/date mismatch'),
    'Explanation explicitly states "Stage/date mismatch"'
  );
  assert(
    context.currentStage === 'Flowering',
    'CRITICAL: Farmer-selected cropStage is NEVER overwritten despite mismatch'
  );
}

// ── Test 6: Same-day sowing ───────────────────────────────────────────────────
{
  console.log('\nTest 6: Same-Day Sowing');
  const farmSameDayConsistent: FarmContext = {
    currentCrop: 'Maize',
    sowingDate: '2026-09-03', // Today
    cropStage: 'Sowing',
  };

  const contextConsistent = evaluateCropLifecycle(farmSameDayConsistent, REF_DATE);
  assert(contextConsistent.daysSinceSowing === 0, 'Same-day sowing yields 0 daysSinceSowing');
  assert(contextConsistent.isUpcomingSowing === false, 'Same-day sowing is not upcoming');
  assert(contextConsistent.stageConsistency === 'consistent', 'Same-day with "Sowing" stage is consistent');
  assert(contextConsistent.currentStage === 'Sowing', 'Farmer stage preserved');

  const farmSameDayMismatch: FarmContext = {
    currentCrop: 'Maize',
    sowingDate: '2026-09-03', // Today
    cropStage: 'Harvest', // Inconsistent: 0 days elapsed but harvest selected
  };

  const contextMismatch = evaluateCropLifecycle(farmSameDayMismatch, REF_DATE);
  assert(contextMismatch.daysSinceSowing === 0, 'Same-day sowing reports 0 days');
  assert(
    contextMismatch.stageConsistency === 'possibly_inconsistent',
    'Flags mismatch when same-day sowing is paired with Harvest stage'
  );
  assert(
    contextMismatch.stageExplanation.includes('Stage/date mismatch'),
    'Explanation reports "Stage/date mismatch"'
  );
  assert(
    contextMismatch.currentStage === 'Harvest',
    'CRITICAL: Farmer-selected cropStage ("Harvest") is NEVER overwritten'
  );
}

// ── Test 7: Missing crop ──────────────────────────────────────────────────────
{
  console.log('\nTest 7: Missing Crop');
  const farmNoCrop: FarmContext = {
    sowingDate: '2026-08-01',
    cropStage: 'Germination',
  };

  const context = evaluateCropLifecycle(farmNoCrop, REF_DATE);

  assert(context.crop === undefined, 'Crop is undefined');
  assert(
    context.missingInformation.includes('Crop information is missing.'),
    'Missing information reports missing crop'
  );
  assert(context.currentStage === 'Germination', 'Farmer stage preserved');
  assert(context.lifecycleProgress === 'early', 'Germination correctly maps to early phase');
}

// ── Test 8: Stage consistency unknown ─────────────────────────────────────────
{
  console.log('\nTest 8: Stage Consistency Unknown');
  const farm: FarmContext = {
    currentCrop: 'Cotton',
    cropStage: 'Flowering',
    sowingDate: '2026-06-03', // 92 days
  };

  const context = evaluateCropLifecycle(farm, REF_DATE);

  assert(
    context.stageConsistency === 'unknown',
    'Stage consistency is conservative and marked "unknown" without authoritative database'
  );
  assert(
    context.stageExplanation.includes('No authoritative crop-specific lifecycle duration data'),
    'Explanation clarifies absence of authoritative duration table'
  );
  assert(context.currentStage === 'Flowering', 'Farmer stage is preserved');
}

// ── Test 9: Existing lifecycle data reuse if available ─────────────────────────
{
  console.log('\nTest 9: Existing Lifecycle Data Reuse');
  // Check that the engine uses the existing FarmContext crop and cropStage fields
  // without creating another crop profile or redundant enum.
  const farm: FarmContext = {
    currentCrop: 'Rice (Basmati)',
    cropVariety: 'Super Basmati',
    cropStage: 'Vegetative growth',
    sowingDate: '2026-07-15',
  };

  const context = evaluateCropLifecycle(farm, REF_DATE);
  assert(context.crop === 'Rice (Basmati)', 'Reuses existing FarmContext currentCrop directly');
  assert(context.variety === 'Super Basmati', 'Reuses existing FarmContext cropVariety directly');
  assert(context.currentStage === 'Vegetative growth', 'Reuses existing CropStage enum directly');
}

// ── Test 10: No existing lifecycle database ───────────────────────────────────
{
  console.log('\nTest 10: No Existing Lifecycle Database / Qualitative Phases');
  // Verify that all standard stages map to qualitative phases rather than fabricated percentages
  const stages: CropStage[] = [
    'Land preparation',
    'Sowing',
    'Germination',
    'Vegetative growth',
    'Flowering',
    'Fruiting / grain filling',
    'Maturity',
    'Harvest',
  ];

  const phases = stages.map((s) => getQualitativePhase(s));

  assert(phases[0] === 'early', 'Land preparation -> early');
  assert(phases[1] === 'early', 'Sowing -> early');
  assert(phases[2] === 'early', 'Germination -> early');
  assert(phases[3] === 'developing', 'Vegetative growth -> developing');
  assert(phases[4] === 'reproductive', 'Flowering -> reproductive');
  assert(phases[5] === 'reproductive', 'Fruiting / grain filling -> reproductive');
  assert(phases[6] === 'late-season', 'Maturity -> late-season');
  assert(phases[7] === 'harvest', 'Harvest -> harvest');
  assert(getQualitativePhase(undefined) === 'unknown', 'undefined -> unknown');
}

console.log('\n══════════════════════════════════════');
console.log(`Crop Lifecycle Tests Completed: ${passedCount}/${totalCount} Passed`);
console.log('══════════════════════════════════════\n');

if (passedCount !== totalCount) {
  process.exit(1);
}
