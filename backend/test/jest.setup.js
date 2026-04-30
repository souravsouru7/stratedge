// Jest setup file - runs before each test file
const mongoose = require('mongoose');

// Increase timeout for database operations
jest.setTimeout(30000);

// Suppress console logs during tests (optional - comment out to debug)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

// Global teardown on test failure
afterEach(async () => {
  // Clear any remaining database connections
  if (mongoose.connection.readyState === 1) {
    // Don't disconnect here - let individual tests manage their connections
  }
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection in tests:', error);
});
