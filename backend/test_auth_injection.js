/**
 * Auth Security Test: Injection & Rate Limiting
 *
 * Verifies that auth endpoints are not vulnerable to simple NoSQL injection
 * and that the auth-specific rate-limiter is enforced.
 */

const BASE_URL = "http://localhost:5000/api";

async function registerTestUser() {
  const unique = Date.now();
  const email = `auth_inject_${unique}@test.com`;

  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Auth Injection Test User",
      email,
      password: "password123"
    })
  });

  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`Failed to register test user: ${res.status} ${JSON.stringify(data)}`);
  }

  return { email, password: "password123" };
}

async function testNoSQLInjectionOnLogin() {
  console.log("1. Testing NoSQL-style injection attempts on /auth/login...");

  const legitUser = await registerTestUser();

  // Attempt 1: email field as an object payload that would be dangerous if not validated
  const payloads = [
    {
      description: "Email as {$ne: ''} object",
      body: {
        email: { $ne: "" },
        password: "wrongpassword"
      }
    },
    {
      description: "Password as {$ne: ''} object",
      body: {
        email: legitUser.email,
        password: { $ne: "" }
      }
    }
  ];

  for (const p of payloads) {
    console.log(`\n- Attempt: ${p.description}`);
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p.body)
    });

    let data = {};
    try {
      data = await res.json();
    } catch (_) {
      // ignore JSON parse errors
    }

    if (res.ok && data.token) {
      console.error("❌ Injection attempt unexpectedly succeeded and returned a token!");
    } else {
      console.log(`✅ Injection attempt rejected: ${res.status} ${data.message || ""}`);
    }
  }
}

async function testAuthRateLimiting() {
  console.log("\n2. Testing auth rate limiting on /auth/login...");

  const { email, password } = await registerTestUser();

  const ATTEMPTS = 40; // default limiter is 30 per 15 minutes
  let first429 = null;

  for (let i = 1; i <= ATTEMPTS; i++) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: "wrong_password" // intentionally wrong to avoid real logins
      })
    });

    if (res.status === 429 && !first429) {
      first429 = i;
    }

    process.stdout.write(`Attempt ${i}: ${res.status}\n`);
  }

  if (first429) {
    console.log(`\n✅ Rate limiting enforced; first 429 at attempt #${first429}`);
  } else {
    console.error("\n❌ No 429 response observed; auth rate limiting may not be working as expected.");
  }
}

async function runAuthSecurityTests() {
  console.log("=== STARTING AUTH INJECTION & RATE LIMIT TESTS ===\n");

  try {
    await testNoSQLInjectionOnLogin();
    await testAuthRateLimiting();

    console.log("\n=== AUTH SECURITY TESTS COMPLETE ===");
  } catch (err) {
    console.error("Test Execution Error:", err.message);
  }
}

runAuthSecurityTests();

