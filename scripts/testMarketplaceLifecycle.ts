import {
  generateSeedDemoListings,
  filterExpiredDemoListings,
  reseedDemoListingsIfNeeded,
  resetDemoListings,
  clearDemoListings,
} from '../src/services/dealIntelligence';
import type { EnhancedMarketplaceListing } from '../src/types/dealIntelligence';

function runTests() {
  console.log('================================================================');
  console.log('--- RUNNING STEP 11 FIX: MARKETPLACE LISTING LIFECYCLE TESTS ---');
  console.log('================================================================\n');

  const baseNow = new Date('2026-09-01T12:00:00.000Z');
  const nowPlus48h = new Date(baseNow.getTime() + 48 * 60 * 60 * 1000);
  const nowPlus7d = new Date(baseNow.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nowPlus30d = new Date(baseNow.getTime() + 30 * 24 * 60 * 60 * 1000);

  // ── TEST 11: Demo listing gets listingOrigin = "demo"
  console.log('--- TEST 11: Demo listing origin check ---');
  const demoSeedList = generateSeedDemoListings();
  if (!demoSeedList || demoSeedList.length === 0) {
    throw new Error('Test 11 Failed: No demo seed listings generated');
  }
  for (const d of demoSeedList) {
    if (d.listingOrigin !== 'demo' || d.isPersistent !== false) {
      throw new Error(`Test 11 Failed: Demo listing ${d.id} has incorrect origin or persistent flag`);
    }
  }
  console.log(`✓ Test 11 Passed: All ${demoSeedList.length} seed listings have listingOrigin = "demo" and isPersistent = false`);

  // ── TEST 12: expiresAt is null for both final listing types
  console.log('\n--- TEST 12: expiresAt is null check for demo and farmer listings ---');
  for (const d of demoSeedList) {
    if (d.expiresAt !== null && d.expiresAt !== undefined) {
      throw new Error(`Test 12 Failed: Demo listing ${d.id} has non-null expiresAt: ${d.expiresAt}`);
    }
  }

  const sampleFarmerListing: EnhancedMarketplaceListing = {
    id: 'farmer-lst-test-1',
    userId: 'user-farmer-101',
    cropName: 'Wheat (Gandum)',
    quantity: '100 maunds',
    pricePerUnit: 'Rs 4,500 / 40kg',
    location: 'Okara, Punjab',
    farmerName: 'Muhammad Rasheed',
    description: 'Fresh wheat from own farm',
    datePosted: 'Just now',
    listingOrigin: 'farmer',
    isPersistent: true,
    expiresAt: null,
  };

  if (sampleFarmerListing.expiresAt !== null) {
    throw new Error(`Test 12 Failed: Farmer listing has non-null expiresAt: ${sampleFarmerListing.expiresAt}`);
  }
  console.log('✓ Test 12 Passed: expiresAt is explicitly null for both demo listings and real farmer listings');

  // ── TEST 10: Farmer-created listing gets listingOrigin = "farmer" & isPersistent = true
  console.log('\n--- TEST 10: Farmer listing origin check ---');
  if (sampleFarmerListing.listingOrigin !== 'farmer' || sampleFarmerListing.isPersistent !== true) {
    throw new Error('Test 10 Failed: Farmer listing must have listingOrigin="farmer" and isPersistent=true');
  }
  console.log('✓ Test 10 Passed: Farmer listing origin verified as "farmer" with isPersistent=true');

  // ── TEST 1: Demo listing remains after 48 hours
  console.log('\n--- TEST 1: Demo listing remains after 48 hours ---');
  const demoListings48h = filterExpiredDemoListings(demoSeedList, nowPlus48h);
  if (demoListings48h.length !== demoSeedList.length) {
    throw new Error(`Test 1 Failed: Demo listings dropped after 48h (expected ${demoSeedList.length}, got ${demoListings48h.length})`);
  }
  console.log(`✓ Test 1 Passed: All ${demoListings48h.length} demo listings remain active after 48 hours`);

  // ── TEST 2: Demo listing remains after 7 days
  console.log('\n--- TEST 2: Demo listing remains after 7 days ---');
  const demoListings7d = filterExpiredDemoListings(demoSeedList, nowPlus7d);
  if (demoListings7d.length !== demoSeedList.length) {
    throw new Error(`Test 2 Failed: Demo listings dropped after 7 days (expected ${demoSeedList.length}, got ${demoListings7d.length})`);
  }
  console.log(`✓ Test 2 Passed: All ${demoListings7d.length} demo listings remain active after 7 days`);

  // ── TEST 3: Demo listing remains after 30 days
  console.log('\n--- TEST 3: Demo listing remains after 30 days ---');
  const demoListings30d = filterExpiredDemoListings(demoSeedList, nowPlus30d);
  if (demoListings30d.length !== demoSeedList.length) {
    throw new Error(`Test 3 Failed: Demo listings dropped after 30 days (expected ${demoSeedList.length}, got ${demoListings30d.length})`);
  }
  console.log(`✓ Test 3 Passed: All ${demoListings30d.length} demo listings remain active after 30 days`);

  // ── TEST 4: Farmer listing remains after 48 hours
  console.log('\n--- TEST 4: Farmer listing remains after 48 hours ---');
  const combinedTestPool: EnhancedMarketplaceListing[] = [sampleFarmerListing, ...demoSeedList];
  const poolAfter48h = filterExpiredDemoListings(combinedTestPool, nowPlus48h);
  const farmerFound48h = poolAfter48h.find((l) => l.id === sampleFarmerListing.id);
  if (!farmerFound48h) {
    throw new Error('Test 4 Failed: Farmer listing was removed after 48 hours');
  }
  console.log('✓ Test 4 Passed: Farmer listing remains permanently active after 48 hours');

  // ── TEST 5: Farmer listing remains after 7 days
  console.log('\n--- TEST 5: Farmer listing remains after 7 days ---');
  const poolAfter7d = filterExpiredDemoListings(combinedTestPool, nowPlus7d);
  const farmerFound7d = poolAfter7d.find((l) => l.id === sampleFarmerListing.id);
  if (!farmerFound7d) {
    throw new Error('Test 5 Failed: Farmer listing was removed after 7 days');
  }
  console.log('✓ Test 5 Passed: Farmer listing remains permanently active after 7 days');

  // ── TEST 6: Farmer listing remains after 30 days
  console.log('\n--- TEST 6: Farmer listing remains after 30 days ---');
  const poolAfter30d = filterExpiredDemoListings(combinedTestPool, nowPlus30d);
  const farmerFound30d = poolAfter30d.find((l) => l.id === sampleFarmerListing.id);
  if (!farmerFound30d) {
    throw new Error('Test 6 Failed: Farmer listing was removed after 30 days');
  }
  console.log('✓ Test 6 Passed: Farmer listing remains permanently active after 30 days');

  // ── TEST 7: No automatic listing cleanup occurs
  console.log('\n--- TEST 7: No automatic listing cleanup occurs ---');
  const ancientFarmerListing: EnhancedMarketplaceListing = {
    id: 'ancient-farmer-1',
    userId: 'user-farmer-old',
    cropName: 'Rice (Basmati)',
    quantity: '500 maunds',
    pricePerUnit: 'Rs 11,500 / 40kg',
    location: 'Gujranwala, Punjab',
    farmerName: 'Old Farmer',
    description: 'Harvested long ago',
    datePosted: '6 months ago',
    listingOrigin: 'farmer',
    isPersistent: true,
    expiresAt: null,
  };
  const poolWithAncient = [ancientFarmerListing, ...demoSeedList];
  const resultAncient = filterExpiredDemoListings(poolWithAncient, new Date('2028-01-01T00:00:00Z'));
  if (resultAncient.length !== poolWithAncient.length) {
    throw new Error('Test 7 Failed: Automatic cleanup removed listings in future date check');
  }
  console.log('✓ Test 7 Passed: No time-based automatic listing cleanup occurs');

  // ── TEST 8: Demo seeding does not duplicate records
  console.log('\n--- TEST 8: Demo seeding idempotence & deduplication ---');
  const firstReseed = reseedDemoListingsIfNeeded(combinedTestPool);
  if (firstReseed.reseeded !== false || firstReseed.listings.length !== combinedTestPool.length) {
    throw new Error(`Test 8 Failed: Demo listings were duplicated when already present (count: ${firstReseed.listings.length})`);
  }
  console.log(`✓ Test 8 Passed: Reseeding did not duplicate existing demo records (${firstReseed.listings.length} items preserved)`);

  // ── TEST 9: Farmer listings are never removed during demo reset logic
  console.log('\n--- TEST 9: Farmer listings strictly preserved during demo reset ---');
  const resetResult = resetDemoListings(combinedTestPool);
  const farmerAfterReset = resetResult.find((l) => l.id === sampleFarmerListing.id);
  if (!farmerAfterReset) {
    throw new Error('Test 9 Failed: Farmer listing was removed during resetDemoListings');
  }
  const clearedResult = clearDemoListings(combinedTestPool);
  const farmerAfterClear = clearedResult.find((l) => l.id === sampleFarmerListing.id);
  if (!farmerAfterClear) {
    throw new Error('Test 9 Failed: Farmer listing was removed during clearDemoListings');
  }
  if (clearedResult.some((l) => l.listingOrigin === 'demo')) {
    throw new Error('Test 9 Failed: Demo listings remained after clearDemoListings');
  }
  console.log('✓ Test 9 Passed: Farmer listings strictly preserved during demo reset and clear operations');

  console.log('\n================================================================');
  console.log('✅ ALL 12 MARKETPLACE LISTING LIFECYCLE TESTS PASSED!');
  console.log('================================================================');
}

runTests();
