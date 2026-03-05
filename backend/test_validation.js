/**
 * Validation Test: Input Validation and Integrity
 * 
 * Verifies that required fields are checked and invalid values are rejected.
 */

const BASE_URL = 'http://localhost:5000/api';

async function runValidationTest() {
    console.log('=== STARTING VALIDATION TEST ===\n');

    try {
        // 1. Test Registration Validation
        console.log('1. Testing registration with missing fields...');
        const regRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Only Name' })
        });
        if (regRes.ok) {
            console.error('❌ ERROR: Registration succeeded with missing fields!');
        } else {
            const errorData = await regRes.json();
            console.log(`✅ Correctly rejected: ${regRes.status} ${errorData.message}`);
        }

        // Register a user for subsequent tests
        const userRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Valid User',
                email: `valid_${Date.now()}@test.com`,
                password: 'password123'
            })
        });
        const userData = await userRes.json();
        const token = userData.token;

        // 2. Test Trade Creation Validation
        console.log('\n2. Testing trade creation with invalid type...');
        const createRes = await fetch(`${BASE_URL}/trades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                pair: 'BTCUSD',
                type: 'INVALID',
                marketType: 'Forex'
            })
        });
        if (createRes.ok) {
            console.error('❌ ERROR: Trade creation succeeded with invalid type!');
        } else {
            const errorData = await createRes.json();
            console.log(`✅ Correctly rejected: ${createRes.status} ${errorData.message}`);
        }

        // 3. Test Trade Update Validation
        console.log('\n3. Testing trade update with invalid marketType...');
        // Create a valid trade first
        const validTradeRes = await fetch(`${BASE_URL}/trades`, {
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
        const validTradeData = await validTradeRes.json();
        const tradeId = validTradeData._id;

        const updateRes = await fetch(`${BASE_URL}/trades/${tradeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ marketType: 'Mars_Market' })
        });
        if (updateRes.ok) {
            console.error('❌ ERROR: Trade update succeeded with invalid marketType!');
        } else {
            const errorData = await updateRes.json();
            console.log(`✅ Correctly rejected: ${updateRes.status} ${errorData.message}`);
        }

        console.log('\n=== VALIDATION TEST COMPLETE ===');

    } catch (error) {
        console.error('Test Execution Error:', error.message);
    }
}

runValidationTest();
