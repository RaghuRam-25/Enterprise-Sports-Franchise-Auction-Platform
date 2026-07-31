import assert from 'assert';
import sharp from 'sharp';
import { auctionEngine } from './services/auctionEngine.js';
import { processAndUploadImage } from './services/imageService.js';

async function runTests() {
  console.log('--- RUNNING PLATFORM UNIT & INTEGRATION TESTS ---');

  // Test 1: Image Pipeline Sharp WebP conversion
  console.log('\n[Test 1] Sharp WebP Conversion...');
  const mockJpgBuffer = await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 3,
      background: { r: 255, g: 0, b: 0 }
    }
  }).jpeg().toBuffer();

  const webpUrl = await processAndUploadImage(mockJpgBuffer, 'test_player');
  assert(webpUrl.includes('.webp') || webpUrl.includes('/uploads/'), 'Image URL must reference webp uploaded file');
  console.log('✅ WebP conversion test passed! Generated URL:', webpUrl);

  // Test 2: Dynamic Bidding Raise Calculation
  console.log('\n[Test 2] Server-Side Bid Raise Calculation...');
  // Total purse = 100,000,000. Current bid = 1,000,000 (1%). Band 0-3% => 0.15% raise = 150,000.
  const nextBid1 = auctionEngine.calculateNextBidAmount(1000000, 100000000);
  assert.strictEqual(nextBid1, 1150000, `Expected 1,150,000 but got ${nextBid1}`);
  console.log('✅ Server-side raise calculation test passed! (1,000,000 -> 1,150,000)');

  // Test 3: Blind Bid Budget Guardrail Formula
  console.log('\n[Test 3] Blind Bid Budget Guardrail Test...');
  const mockTeam = {
    id: 'team-mock-1',
    name: 'Test FC',
    totalBudget: 100000000,
    remainingBudget: 20000000, // 20M remaining
    minRoster: 11,
    currentRosterCount: 5 // needs 11 - (5 + 1) = 5 more slots after this
  };
  const lowestBasePrice = 3000000; // 3M base price
  // Required Reserve = (11 - (5+1)) * 3M = 5 * 3M = 15M.
  // Max allowable bid = 20M - 15M = 5M.

  // Launch mock player for test
  auctionEngine.podiumPlayer = { _id: 'p-1', name: 'Test Player', basePrice: 1000000 };
  auctionEngine.mode = 'BLIND';

  const validBid = auctionEngine.placeBlindBid(mockTeam, 4000000, lowestBasePrice); // 4M <= 5M
  assert.strictEqual(validBid.success, true, 'Valid blind bid under reserve threshold should pass');

  const invalidBid = auctionEngine.placeBlindBid(mockTeam, 6000000, lowestBasePrice); // 6M > 5M
  assert.strictEqual(invalidBid.success, false, 'Invalid blind bid violating reserve threshold should fail');
  assert(invalidBid.error.includes('BLIND BID REJECTED'), 'Should return blind bid rejected error message');
  console.log('✅ Blind bid budget guardrail test passed!');

  // Test 4: Concurrent Race Condition Handling
  console.log('\n[Test 4] Race Condition Concurrent Bid Queue Test...');
  auctionEngine.podiumPlayer = { _id: 'p-2', name: 'Race Test Player', basePrice: 1000000 };
  auctionEngine.currentBid = 1000000;
  auctionEngine.mode = 'NORMAL';
  
  const { timerService } = await import('./services/timerService.js');
  timerService.status = 'RUNNING';
  timerService.isPaused = false;
  timerService.duration = 60;

  const teamA = { id: 't-1', name: 'Team A', remainingBudget: 100000000, totalBudget: 100000000 };
  const teamB = { id: 't-2', name: 'Team B', remainingBudget: 100000000, totalBudget: 100000000 };

  // Fire 5 concurrent bid promises simultaneously
  const results = await Promise.all([
    auctionEngine.placeNormalBid(teamA),
    auctionEngine.placeNormalBid(teamB),
    auctionEngine.placeNormalBid(teamA),
    auctionEngine.placeNormalBid(teamB),
    auctionEngine.placeNormalBid(teamA)
  ]);

  const successes = results.filter(r => r && r.success);
  assert.strictEqual(successes.length, 5, 'All 5 sequentialized queue bids should succeed cleanly in order');
  assert(auctionEngine.currentBid > 1000000, 'Current bid must advance properly after concurrent calls');
  console.log(`✅ Race condition test passed! Current bid after 5 concurrent bids: ${auctionEngine.currentBid}`);

  console.log('\n=============================================================');
  console.log('ALL UNIT & INTEGRATION TESTS COMPLETED SUCCESSFULLY! 🎉');
  console.log('=============================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
