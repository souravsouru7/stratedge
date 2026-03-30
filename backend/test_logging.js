// Test script to verify logging functionality
const { logger } = require('./utils/logger');
const { jobFailureTracker } = require('./utils/jobFailureTracker');

console.log('=== Testing Structured Logging System ===\n');

// Test 1: Basic logging
console.log('Test 1: Basic logging at different levels');
logger.info('This is an info message', { test: 'info', timestamp: new Date().toISOString() });
logger.warn('This is a warning message', { test: 'warn', timestamp: new Date().toISOString() });
logger.error('This is an error message', { test: 'error', timestamp: new Date().toISOString() });

// Test 2: Job failure tracking
console.log('\nTest 2: Job failure tracking');
const testError = new Error('Test job failure');
testError.stack = 'Error: Test job failure\n    at testScript.js:15:12';

jobFailureTracker.recordFailure('test-job-001', testError, 'trade-123');
jobFailureTracker.recordFailure('test-job-001', testError, 'trade-123'); // Repeat failure

console.log('Failure count for test-job-001:', jobFailureTracker.getFailureCount('test-job-001'));
console.log('Is repeated failure?', jobFailureTracker.isRepeatedFailure('test-job-001'));

// Test 3: Get stats
console.log('\nTest 3: Job failure tracker stats');
const stats = jobFailureTracker.getStats();
console.log(JSON.stringify(stats, null, 2));

// Test 4: Error with metadata
console.log('\nTest 4: Structured error logging');
try {
  throw new Error('Test error for demonstration');
} catch (error) {
  logger.error('Caught test error', {
    errorCode: 'TEST_001',
    severity: 'high',
    userId: 'test-user',
    action: 'testing_logging',
    error: error.message,
    stack: error.stack,
  });
}

console.log('\n=== Tests Complete ===');
console.log('Check backend/logs/combined.log and backend/logs/error.log for logged messages');
