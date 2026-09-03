/**
 * Saathi Farm Outcome & Learning Loop Test Suite
 *
 * Validates deterministic local storage, action connection,
 * state coverage, validation integrity, privacy constraints, and query operations.
 *
 * 30+ comprehensive test cases.
 */

import {
  isValidOutcomeRecord,
  getFarmOutcomes,
  saveFarmOutcome,
  updateFarmOutcome,
  deleteFarmOutcome,
  clearFarmOutcomes,
  getOutcomesForAction,
  getRecentFarmOutcomes,
  getOutcomeHistoricalContext,
  formatOutcomeLabel,
  formatActionTakenLabel,
  FARM_OUTCOMES_STORAGE_KEY,
} from '../src/services/farmOutcomeService';
import type { FarmActionOutcome } from '../src/types/farmOutcome';

// Mock localStorage in Node.js environment
const mockStorage: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k in mockStorage) delete mockStorage[k];
  },
  length: 0,
  key: () => null,
} as unknown as Storage;

// Mock window event dispatching in Node
global.window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
} as unknown as Window & typeof globalThis;

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
  }
}

console.log('\n============================================================');
console.log('🌾 SAATHI STEP 8 — FARM OUTCOME & LEARNING LOOP TEST SUITE');
console.log('============================================================\n');

// ── 1. Storage & Empty Initialization ──
console.log('--- Group 1: Storage & Empty State Handling ---');
clearFarmOutcomes();
const initialOutcomes = getFarmOutcomes();
assert(Array.isArray(initialOutcomes) && initialOutcomes.length === 0, '1. Empty state returns empty array');

const emptyRecent = getRecentFarmOutcomes(5);
assert(Array.isArray(emptyRecent) && emptyRecent.length === 0, '2. getRecentFarmOutcomes returns empty array when empty');

const emptyActionOutcomes = getOutcomesForAction('action-123');
assert(emptyActionOutcomes.length === 0, '3. getOutcomesForAction returns empty array when none match');

const emptyHist = getOutcomeHistoricalContext('action-123');
assert(emptyHist === null, '4. getOutcomeHistoricalContext returns null when no history exists');

// ── 2. Record Validation Integrity ──
console.log('\n--- Group 2: Record Validation Integrity ---');
const validRecord: FarmActionOutcome = {
  id: 'outcome-1',
  actionId: 'action-spraying-avoid',
  actionCategory: 'SPRAYING',
  actionTitle: 'Avoid evening spray',
  actionDescription: 'Rain expected within 4 hours',
  recordedAt: new Date().toISOString(),
  actionTaken: 'YES',
  outcome: 'IMPROVED',
  observation: 'Leaves look healthy, no rain washoff loss',
  followUpNeeded: false,
  crop: 'Wheat',
  cropStage: 'Tillering',
  district: 'Multan',
};

assert(isValidOutcomeRecord(validRecord), '5. Valid complete record passes schema validation');

assert(!isValidOutcomeRecord(null), '6. null payload is rejected');
assert(!isValidOutcomeRecord({}), '7. empty object is rejected');
assert(!isValidOutcomeRecord({ ...validRecord, id: '' }), '8. Missing id is rejected');
assert(!isValidOutcomeRecord({ ...validRecord, actionId: '' }), '9. Missing actionId is rejected');
assert(!isValidOutcomeRecord({ ...validRecord, actionCategory: 'INVALID_CAT' }), '10. Invalid actionCategory is rejected');
assert(!isValidOutcomeRecord({ ...validRecord, actionTaken: 'MAYBE' }), '11. Invalid actionTaken enum is rejected');
assert(!isValidOutcomeRecord({ ...validRecord, outcome: 'PERFECT' }), '12. Invalid outcome enum is rejected');
assert(!isValidOutcomeRecord({ ...validRecord, recordedAt: 'not-a-date' }), '13. Malformed date is rejected');

// ── 3. Basic Save & Retrieval Operations ──
console.log('\n--- Group 3: Save & Retrieval Operations ---');
clearFarmOutcomes();

const saved1 = saveFarmOutcome({
  actionId: 'action-spraying-avoid',
  actionCategory: 'SPRAYING',
  actionTitle: 'Avoid evening spray',
  actionDescription: 'Rain expected within 4 hours',
  actionTaken: 'YES',
  outcome: 'IMPROVED',
  observation: 'Followed advice, rain came at 8 PM, saved spray cost.',
  followUpNeeded: false,
  crop: 'Cotton',
  district: 'Faisalabad',
});

assert(typeof saved1.id === 'string' && saved1.id.startsWith('outcome-'), '14. saveFarmOutcome creates valid ID');
assert(saved1.actionTaken === 'YES', '15. Preserves actionTaken state');
assert(saved1.outcome === 'IMPROVED', '16. Preserves outcome state');
assert(saved1.crop === 'Cotton', '17. Preserves crop snapshot');

const listAfter1 = getFarmOutcomes();
assert(listAfter1.length === 1 && listAfter1[0].id === saved1.id, '18. getFarmOutcomes retrieves single saved record');

// ── 4. Action Connection & State Coverage ──
console.log('\n--- Group 4: Action Connection & State Coverage ---');

const statesActionTaken = ['YES', 'NO', 'PARTIAL', 'NOT_SURE'] as const;
const statesOutcome = ['IMPROVED', 'NO_CHANGE', 'WORSE', 'TOO_EARLY', 'UNKNOWN'] as const;

let stateTestIndex = 19;
for (const at of statesActionTaken) {
  for (const oc of statesOutcome) {
    const outcomeRecord = saveFarmOutcome({
      actionId: `action-test-${at}-${oc}`,
      actionCategory: 'DISEASE',
      actionTaken: at,
      outcome: oc,
    });
    assert(
      outcomeRecord.actionTaken === at && outcomeRecord.outcome === oc,
      `${stateTestIndex++}. Correctly records state pair (${at}, ${oc})`
    );
  }
}

// ── 5. Deterministic Chronological Sorting ──
console.log('\n--- Group 5: Deterministic Chronological Sorting ---');
clearFarmOutcomes();

const olderDate = new Date('2026-08-01T10:00:00Z').toISOString();
const newerDate = new Date('2026-09-01T10:00:00Z').toISOString();
const newestDate = new Date('2026-09-03T12:00:00Z').toISOString();

saveFarmOutcome({
  id: 'record-old',
  actionId: 'act-1',
  actionCategory: 'IRRIGATION',
  actionTaken: 'YES',
  outcome: 'IMPROVED',
  recordedAt: olderDate,
});

saveFarmOutcome({
  id: 'record-newest',
  actionId: 'act-1',
  actionCategory: 'IRRIGATION',
  actionTaken: 'PARTIAL',
  outcome: 'TOO_EARLY',
  recordedAt: newestDate,
});

saveFarmOutcome({
  id: 'record-newer',
  actionId: 'act-2',
  actionCategory: 'WEATHER',
  actionTaken: 'NO',
  outcome: 'NO_CHANGE',
  recordedAt: newerDate,
});

const sorted = getFarmOutcomes();
assert(sorted.length === 3, '40. All 3 records retrieved');
assert(sorted[0].id === 'record-newest', '41. Newest record appears first (index 0)');
assert(sorted[1].id === 'record-newer', '42. Middle record appears second (index 1)');
assert(sorted[2].id === 'record-old', '43. Oldest record appears last (index 2)');

// ── 6. Update & Edit Operations ──
console.log('\n--- Group 6: Update & Edit Operations ---');
const updated = updateFarmOutcome('record-old', {
  outcome: 'WORSE',
  observation: 'Condition degraded after heatwave',
  followUpNeeded: true,
});

assert(updated !== null && updated.outcome === 'WORSE', '44. updateFarmOutcome changes outcome state');
assert(updated?.followUpNeeded === true, '45. updateFarmOutcome updates followUpNeeded flag');
assert(Boolean(updated?.updatedAt), '46. updateFarmOutcome timestamps updatedAt');

const notFoundUpdate = updateFarmOutcome('non-existent-id', { outcome: 'IMPROVED' });
assert(notFoundUpdate === null, '47. updateFarmOutcome gracefully returns null for non-existent ID');

// ── 7. Delete & Clear Operations ──
console.log('\n--- Group 7: Delete & Clear Operations ---');
const deleted = deleteFarmOutcome('record-newer');
assert(deleted === true, '48. deleteFarmOutcome returns true for existing record');
assert(getFarmOutcomes().length === 2, '49. Record count decrements after deletion');

const notFoundDelete = deleteFarmOutcome('record-newer');
assert(notFoundDelete === false, '50. deleteFarmOutcome returns false if record already deleted');

clearFarmOutcomes();
assert(getFarmOutcomes().length === 0, '51. clearFarmOutcomes removes all records');

// ── 8. Historical Context Signal & Provenance ──
console.log('\n--- Group 8: Historical Context Signal & Provenance ---');
saveFarmOutcome({
  actionId: 'action-wheat-rust-spray',
  actionCategory: 'DISEASE',
  actionTitle: 'Apply Propiconazole fungicide',
  actionTaken: 'YES',
  outcome: 'IMPROVED',
  observation: 'Yellow rust pustules dried within 48h',
  recordedAt: new Date('2026-09-02T10:00:00Z').toISOString(),
});

const histSignal = getOutcomeHistoricalContext('action-wheat-rust-spray', 'DISEASE');
assert(histSignal !== null, '52. Historical context returned when outcome exists');
assert(histSignal?.previousCount === 1, '53. Reports accurate previousCount');
assert(histSignal?.contextText.includes('Followed'), '54. contextText reflects action taken');
assert(histSignal?.contextText.includes('Improved'), '55. contextText reflects observed outcome');
assert(histSignal?.disclaimer.includes('Farmer-reported observation'), '56. Context carries mandatory disclaimer');

// ── 9. Corrupted Storage Graceful Recovery ──
console.log('\n--- Group 9: Corrupted Storage Recovery ---');
localStorage.setItem(FARM_OUTCOMES_STORAGE_KEY, '{ invalid json garbage');
const recoveredFromGarbage = getFarmOutcomes();
assert(Array.isArray(recoveredFromGarbage) && recoveredFromGarbage.length === 0, '57. Corrupted JSON recovers to empty array');

localStorage.setItem(FARM_OUTCOMES_STORAGE_KEY, JSON.stringify([
  { valid: false },
  { id: 'good-1', actionId: 'act-1', actionCategory: 'SPRAYING', actionTaken: 'YES', outcome: 'IMPROVED', recordedAt: new Date().toISOString() },
  'not-an-object',
]));
const recoveredFromMixed = getFarmOutcomes();
assert(recoveredFromMixed.length === 1 && recoveredFromMixed[0].id === 'good-1', '58. Filters out malformed objects from mixed array');

// ── 10. Privacy & Scientific Integrity Guarantees ──
console.log('\n--- Group 10: Privacy & Scientific Integrity Guarantees ---');
assert(FARM_OUTCOMES_STORAGE_KEY === 'saathi-farm-outcomes', '59. Stores strictly in local storage key');
assert(formatOutcomeLabel('IMPROVED') === 'Improved', '60. Format helper labels Improved');
assert(formatOutcomeLabel('TOO_EARLY') === 'Too early to tell', '61. Format helper labels Too early');
assert(formatActionTakenLabel('PARTIAL') === 'Partially followed', '62. Format helper labels Partial');

console.log('\n============================================================');
console.log(`🏁 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('============================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
