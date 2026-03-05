/**
 * Regression Test: Data Isolation (Forex vs Indian Market)
 * 
 * Verifies that Forex trades and Indian Market trades are correctly isolated.
 */

const BASE_URL = 'http://localhost:5000/api';

async function runIsolationTest() {
    console.log('=== STARTING DATA ISOLATION REGRESSION TEST ===\n');

    try {
        // 1. Register User
        console.log('1. Registering Test User...');
        const userRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Isolation Tester',
                email: `iso_${Date.now()}@test.com`,
                password: 'password123'
            })
        });
        const userData = await userRes.json();
        const token = userData.token;
        console.log('✅ User registered');

        // 2. Create Forex Trade
        console.log('2. Creating Forex trade...');
        await fetch(`${BASE_URL}/trades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                pair: 'EURUSD',
                type: 'BUY',
                marketType: 'Forex'
            })
        });

        // 3. Create Indian Market Trade
        console.log('3. Creating Indian Market trade...');
        await fetch(`${BASE_URL}/indian/trades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                pair: 'NIFTY50',
                type: 'BUY'
            })
        });

        // 4. Verify Forex results only show Forex
        console.log('4. Verifying Forex trades...');
        const forexRes = await fetch(`${BASE_URL}/trades?marketType=Forex`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const forexTrades = await forexRes.json();
        const hasIndianInForex = forexTrades.some(t => t.marketType === 'Indian_Market');
        console.log(`✅ Forex trades count: ${forexTrades.length}`);
        if (hasIndianInForex) console.error('❌ ERROR: Found Indian Market trade in Forex results!');
        else console.log('✅ No Indian Market trades in Forex results');

        // 5. Verify Indian Market results only show Indian Market
        console.log('5. Verifying Indian Market trades...');
        const indianRes = await fetch(`${BASE_URL}/trades?marketType=Indian_Market`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const indianTrades = await indianRes.json();
        const hasForexInIndian = indianTrades.some(t => t.marketType === 'Forex');
        console.log(`✅ Indian Market trades count: ${indianTrades.length}`);
        if (hasForexInIndian) console.error('❌ ERROR: Found Forex trade in Indian Market results!');
        else console.log('✅ No Forex trades in Indian Market results');

        console.log('\n=== DATA ISOLATION TEST COMPLETE ===');

    } catch (error) {
        console.error('Test Execution Error:', error.message);
    }
}

runIsolationTest();
