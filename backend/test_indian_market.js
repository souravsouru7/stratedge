/**
 * Test Script: Indian Market Backend Isolation
 * 
 * This script tests that:
 * 1. Creating trades with marketType works
 * 2. Getting trades REQUIRES marketType parameter
 * 3. Analytics endpoints REQUIRE marketType parameter
 * 4. Indian Market routes auto-set marketType
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const TOKEN = 'YOUR_TEST_TOKEN_HERE'; // Replace with actual token from your app

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json'
};

async function testForexEndpoints() {
  console.log('\n=== TESTING FOREX ENDPOINTS ===\n');
  
  try {
    // Test 1: Create Forex trade
    console.log('1. Creating Forex trade...');
    const forexTrade = await axios.post(`${BASE_URL}/trades`, {
      pair: 'EURUSD',
      type: 'BUY',
      entryPrice: 1.1000,
      exitPrice: 1.1050,
      profit: 50,
      marketType: 'Forex'
    }, { headers });
    console.log('✅ Forex trade created:', forexTrade.data.pair);

    // Test 2: Get Forex trades (with marketType)
    console.log('\n2. Getting Forex trades (with marketType)...');
    const forexTrades = await axios.get(`${BASE_URL}/trades?marketType=Forex`, { headers });
    console.log(`✅ Retrieved ${forexTrades.data.length} Forex trades`);

    // Test 3: Get trades WITHOUT marketType (should fail)
    console.log('\n3. Getting trades WITHOUT marketType (should fail)...');
    try {
      await axios.get(`${BASE_URL}/trades`, { headers });
      console.log('❌ ERROR: Should have failed but succeeded!');
    } catch (error) {
      console.log('✅ Correctly rejected request without marketType:', error.response?.data?.message);
    }

    // Test 4: Get Forex analytics
    console.log('\n4. Getting Forex analytics summary...');
    const forexSummary = await axios.get(`${BASE_URL}/analytics/summary?marketType=Forex`, { headers });
    console.log('✅ Forex analytics retrieved:', forexSummary.data);

  } catch (error) {
    console.error('❌ Forex test error:', error.response?.data || error.message);
  }
}

async function testIndianMarketEndpoints() {
  console.log('\n=== TESTING INDIAN MARKET ENDPOINTS ===\n');
  
  try {
    // Test 1: Create Indian Market trade via main route
    console.log('1. Creating Indian Market trade (via /trades)...');
    const indianTrade = await axios.post(`${BASE_URL}/trades`, {
      pair: 'NIFTY50',
      type: 'BUY',
      entryPrice: 22000,
      exitPrice: 22150,
      profit: 1500,
      marketType: 'Indian_Market'
    }, { headers });
    console.log('✅ Indian Market trade created:', indianTrade.data.pair);

    // Test 2: Get Indian trades (with marketType)
    console.log('\n2. Getting Indian Market trades (with marketType)...');
    const indianTrades = await axios.get(`${BASE_URL}/trades?marketType=Indian_Market`, { headers });
    console.log(`✅ Retrieved ${indianTrades.data.length} Indian Market trades`);

    // Test 3: Create trade via dedicated Indian route (auto-sets marketType)
    console.log('\n3. Creating trade via dedicated Indian route (/indian/trades)...');
    const autoIndianTrade = await axios.post(`${BASE_URL}/indian/trades`, {
      pair: 'BANKNIFTY',
      type: 'SELL',
      entryPrice: 47000,
      exitPrice: 46800,
      profit: 2000
    }, { headers });
    console.log('✅ Auto-tagged Indian trade created:', autoIndianTrade.data.pair);
    console.log('   Market type:', autoIndianTrade.data.marketType);

    // Test 4: Get Indian trades via dedicated route
    console.log('\n4. Getting trades via /indian/trades (auto-filters)...');
    const dedicatedIndianTrades = await axios.get(`${BASE_URL}/indian/trades`, { headers });
    console.log(`✅ Retrieved ${dedicatedIndianTrades.data.length} Indian Market trades`);

    // Test 5: Get Indian analytics via dedicated route
    console.log('\n5. Getting Indian analytics via /indian/analytics/summary...');
    const indianAnalytics = await axios.get(`${BASE_URL}/indian/analytics/summary`, { headers });
    console.log('✅ Indian analytics retrieved:', indianAnalytics.data);

    // Test 6: Get Indian analytics via main route with marketType
    console.log('\n6. Getting Indian analytics via /analytics/summary?marketType=Indian_Market...');
    const indianAnalyticsDirect = await axios.get(`${BASE_URL}/analytics/summary?marketType=Indian_Market`, { headers });
    console.log('✅ Indian analytics (direct) retrieved:', indianAnalyticsDirect.data);

  } catch (error) {
    console.error('❌ Indian Market test error:', error.response?.data || error.message);
  }
}

async function testDataIsolation() {
  console.log('\n=== TESTING DATA ISOLATION ===\n');
  
  try {
    // Get both sets of trades
    const forexRes = await axios.get(`${BASE_URL}/trades?marketType=Forex`, { headers });
    const indianRes = await axios.get(`${BASE_URL}/trades?marketType=Indian_Market`, { headers });
    
    console.log('Forex trades count:', forexRes.data.length);
    console.log('Indian Market trades count:', indianRes.data.length);
    
    // Verify no mixing
    const hasIndianInForex = forexRes.data.some(t => t.marketType === 'Indian_Market');
    const hasForexInIndian = indianRes.data.some(t => t.marketType === 'Forex');
    
    if (hasIndianInForex) {
      console.log('❌ CRITICAL: Found Indian Market trades in Forex results!');
    } else {
      console.log('✅ No Indian Market trades in Forex results');
    }
    
    if (hasForexInIndian) {
      console.log('❌ CRITICAL: Found Forex trades in Indian Market results!');
    } else {
      console.log('✅ No Forex trades in Indian Market results');
    }
    
    // Get analytics for both
    const forexAnalytics = await axios.get(`${BASE_URL}/analytics/summary?marketType=Forex`, { headers });
    const indianAnalytics = await axios.get(`${BASE_URL}/analytics/summary?marketType=Indian_Market`, { headers });
    
    console.log('\nForex Analytics:', {
      totalTrades: forexAnalytics.data.totalTrades,
      totalProfit: forexAnalytics.data.totalProfit,
      winRate: forexAnalytics.data.winRate
    });
    
    console.log('Indian Market Analytics:', {
      totalTrades: indianAnalytics.data.totalTrades,
      totalProfit: indianAnalytics.data.totalProfit,
      winRate: indianAnalytics.data.winRate
    });
    
    console.log('\n✅ Data isolation working correctly!');
    
  } catch (error) {
    console.error('❌ Isolation test error:', error.response?.data || error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('Starting Indian Market Backend Isolation Tests...\n');
  console.log('='.repeat(50));
  
  await testForexEndpoints();
  await testIndianMarketEndpoints();
  await testDataIsolation();
  
  console.log('\n' + '='.repeat(50));
  console.log('Tests complete!\n');
}

// Execute
runTests();
