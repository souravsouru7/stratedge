/**
 * Security Test: IDOR (Insecure Direct Object Reference)
 * 
 * Verifies that User B cannot access, update, or delete User A's trades.
 */

const BASE_URL = 'http://localhost:5000/api';

async function runSecurityTest() {
    console.log('=== STARTING SECURITY IDOR TEST ===\n');

    try {
        // 1. Register User A
        console.log('1. Registering User A...');
        const userARes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'User A',
                email: `userA_${Date.now()}@test.com`,
                password: 'password123'
            })
        });
        const userAData = await userARes.json();
        const tokenA = userAData.token;
        console.log('✅ User A registered');

        // 2. Register User B
        console.log('2. Registering User B...');
        const userBRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'User B',
                email: `userB_${Date.now()}@test.com`,
                password: 'password123'
            })
        });
        const userBData = await userBRes.json();
        const tokenB = userBData.token;
        console.log('✅ User B registered');

        // 3. User A creates a trade
        console.log('3. User A creating a trade...');
        const tradeRes = await fetch(`${BASE_URL}/trades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenA}`
            },
            body: JSON.stringify({
                pair: 'BTCUSD',
                type: 'BUY',
                entryPrice: 50000,
                marketType: 'Forex'
            })
        });
        const tradeData = await tradeRes.json();
        const tradeId = tradeData._id;
        console.log(`✅ User A trade created with ID: ${tradeId}`);

        // 4. User B attempts to FETCH User A's trade
        console.log('\n4. User B attempting to FETCH User A\'s trade (should fail)...');
        const fetchRes = await fetch(`${BASE_URL}/trades/${tradeId}`, {
            headers: { Authorization: `Bearer ${tokenB}` }
        });
        if (fetchRes.ok) {
            console.error('❌ ERROR: User B successfully fetched User A\'s trade!');
        } else {
            const errorData = await fetchRes.json();
            console.log(`✅ Correctly rejected: ${fetchRes.status} ${errorData.message}`);
        }

        // 5. User B attempts to UPDATE User A's trade
        console.log('\n5. User B attempting to UPDATE User A\'s trade (should fail)...');
        const updateRes = await fetch(`${BASE_URL}/trades/${tradeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenB}`
            },
            body: JSON.stringify({ pair: 'HACKED' })
        });
        if (updateRes.ok) {
            console.error('❌ ERROR: User B successfully updated User A\'s trade!');
        } else {
            const errorData = await updateRes.json();
            console.log(`✅ Correctly rejected: ${updateRes.status} ${errorData.message}`);
        }

        // 6. User B attempts to DELETE User A's trade
        console.log('\n6. User B attempting to DELETE User A\'s trade (should fail)...');
        const deleteRes = await fetch(`${BASE_URL}/trades/${tradeId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${tokenB}` }
        });
        if (deleteRes.ok) {
            console.error('❌ ERROR: User B successfully deleted User A\'s trade!');
        } else {
            const errorData = await deleteRes.json();
            console.log(`✅ Correctly rejected: ${deleteRes.status} ${errorData.message}`);
        }

        console.log('\n=== SECURITY IDOR TEST COMPLETE ===');

    } catch (error) {
        console.error('Test Execution Error:', error.message);
    }
}

runSecurityTest();
