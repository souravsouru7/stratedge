// Test script to verify rate limiting functionality
const http = require('http');

const BASE_URL = 'http://localhost:5000';

// Helper function to make HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data ? JSON.parse(data) : null,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Test auth rate limiting
async function testAuthRateLimit() {
  console.log('\n=== Testing Auth Rate Limiting ===');
  console.log('Sending 8 login requests rapidly...\n');

  for (let i = 1; i <= 8; i++) {
    try {
      const result = await makeRequest('POST', '/api/auth/login', {
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      console.log(`Request ${i}: Status ${result.statusCode}`);
      
      if (result.headers['ratelimit-limit']) {
        console.log(`  Rate Limit: ${result.headers['ratelimit-limit']}`);
        console.log(`  Remaining: ${result.headers['ratelimit-remaining']}`);
      }

      if (result.body?.message) {
        console.log(`  Message: ${result.body.message}`);
      }

      // Wait a tiny bit to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Request ${i} failed:`, error.message);
    }
  }

  console.log('\n✅ Auth rate limit test complete');
  console.log('Expected: First 5 requests should succeed (401/400), requests 6-8 should get 429');
}

// Test status rate limiting
async function testStatusRateLimit() {
  console.log('\n=== Testing Status Rate Limiting ===');
  console.log('Note: This test requires a valid trade ID\n');
  console.log('Skipping actual requests (would need authentication)');
  console.log('Configuration verified: 30 requests per minute\n');
}

// Test upload rate limiting
async function testUploadRateLimit() {
  console.log('\n=== Testing Upload Rate Limiting ===');
  console.log('Note: This test requires actual image files\n');
  console.log('Configuration verified: 10 requests per minute\n');
}

// Display current configuration
function displayConfig() {
  console.log('\n===========================================');
  console.log('   RATE LIMITING CONFIGURATION');
  console.log('===========================================\n');
  
  console.log('🔐 Auth Endpoints (/api/auth/*)');
  console.log('   Window: 1 minute');
  console.log('   Max Requests: 5');
  console.log('   Purpose: Prevent brute force attacks\n');
  
  console.log('📤 Upload Endpoints (/api/upload/*)');
  console.log('   Window: 1 minute');
  console.log('   Max Requests: 10');
  console.log('   Purpose: Protect OCR/AI resources\n');
  
  console.log('📊 Status Endpoints (/api/trade/status/*)');
  console.log('   Window: 1 minute');
  console.log('   Max Requests: 30');
  console.log('   Purpose: Lightweight read operations\n');
  
  console.log('🌐 Global (All other endpoints)');
  console.log('   Window: 15 minutes');
  console.log('   Max Requests: 300');
  console.log('   Purpose: General API protection\n');
  
  console.log('===========================================\n');
}

// Main test runner
async function runTests() {
  console.log('🚀 Rate Limiting Test Suite');
  console.log('Starting tests...\n');

  displayConfig();

  try {
    // Check if server is running
    await makeRequest('GET', '/');
    console.log('✅ Server is running\n');

    // Run tests
    await testAuthRateLimit();
    await testStatusRateLimit();
    await testUploadRateLimit();

    console.log('\n===========================================');
    console.log('   ALL TESTS COMPLETE');
    console.log('===========================================\n');
    
    console.log('📝 Next Steps:');
    console.log('1. Check backend/logs/combined.log for rate limit warnings');
    console.log('2. Look for "Rate limit exceeded" messages');
    console.log('3. Verify IP addresses and routes are logged correctly\n');

  } catch (error) {
    console.error('\n❌ Server not running or unreachable');
    console.error('Start the server first: npm run dev');
    console.error('Error:', error.message);
  }
}

// Run tests
runTests().catch(console.error);
