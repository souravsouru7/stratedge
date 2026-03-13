const testEmail = 'test@example.com';
const BASE_URL = 'http://localhost:5000/api';

async function testPasswordReset() {
  try {
    console.log('1. Testing Forgot Password...');
    const forgotRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const forgotData = await forgotRes.json();
    console.log('   Status:', forgotRes.status);
    console.log('   Response:', forgotData.message);

    if (forgotRes.status === 404) {
      console.log('\n[INFO] User not found. This is expected if test@example.com does not exist.');
      console.log('Please create a user with this email or use an existing one to test fully.');
    } else {
      console.log('\n[NEXT STEPS] Check backend console logs for OTP.');
      console.log('Then call verifyOTP and resetPassword using the OTP.');
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testPasswordReset();
