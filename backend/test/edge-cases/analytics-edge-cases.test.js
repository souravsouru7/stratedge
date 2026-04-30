/**
 * Edge Case Tests - Analytics Safety
 * Tests division by zero, type coercion, and edge case data handling
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let testUser;
let authToken;

// Mock dependencies
jest.mock('../config/redis', () => ({
  client: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
  isRedisReady: jest.fn(() => false),
  bullmqConnection: {},
  connectRedis: jest.fn()
}));

describe('Analytics Edge Cases', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
    
    jest.resetModules();
    app = require('../server');
    
    const User = require('../models/Users');
    testUser = await User.create({
      name: 'Analytics Test User',
      email: 'analytics-test@example.com',
      password: 'hashed_password_123',
      authProvider: 'local'
    });
    
    const jwt = require('jsonwebtoken');
    const { appConfig } = require('../config');
    authToken = jwt.sign(
      { id: testUser._id, role: 'user', tokenVersion: 0 },
      appConfig.jwt.secret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const Trade = require('../models/Trade');
    await Trade.deleteMany({});
  });

  describe('Edge Case 1: Zero Trades', () => {
    it('should return valid JSON with 0 values when user has no trades', async () => {
      const res = await request(app)
        .get('/api/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('totalTrades', 0);
      expect(res.body.totalProfit).toBe('0.00');
      expect(res.body.winRate).toBe('0.0');
      expect(res.body.avgWin).toBe('0.00');
      expect(res.body.avgLoss).toBe('0.00');
    });

    it('should not crash on risk/reward analysis with 0 trades', async () => {
      const res = await request(app)
        .get('/api/analytics/risk-reward')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('avgRR');
      expect(res.body).toHaveProperty('actualRR');
    });

    it('should not crash on performance metrics with 0 trades', async () => {
      const res = await request(app)
        .get('/api/analytics/performance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.largestWin).toBe('0.00');
      expect(res.body.largestLoss).toBe('0.00');
    });

    it('should not crash on drawdown analysis with 0 trades', async () => {
      const res = await request(app)
        .get('/api/analytics/drawdown')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.currentDrawdown).toBe('0');
      expect(res.body.maxDrawdown).toBe('0');
    });
  });

  describe('Edge Case 2: String Type Coercion', () => {
    it('should handle profit stored as string correctly', async () => {
      const Trade = require('../models/Trade');
      await Trade.create({
        user: testUser._id,
        pair: 'EURUSD',
        type: 'BUY',
        profit: '150',  // String instead of number
        commission: '5',
        swap: '2',
        status: 'completed',
        marketType: 'Forex',
        tradeDate: new Date()
      });

      const res = await request(app)
        .get('/api/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      
      // Should parse string as number, not concatenate
      const totalProfit = parseFloat(res.body.totalProfit);
      expect(totalProfit).toBe(150);  // Not "0150"
      
      const totalCosts = parseFloat(res.body.totalCosts);
      expect(totalCosts).toBe(7);  // 5 + 2
    });

    it('should handle mixed string and number profits', async () => {
      const Trade = require('../models/Trade');
      await Trade.insertMany([
        {
          user: testUser._id,
          pair: 'EURUSD',
          type: 'BUY',
          profit: 100,  // Number
          status: 'completed',
          marketType: 'Forex',
          tradeDate: new Date()
        },
        {
          user: testUser._id,
          pair: 'GBPUSD',
          type: 'SELL',
          profit: '-50',  // String
          status: 'completed',
          marketType: 'Forex',
          tradeDate: new Date()
        },
        {
          user: testUser._id,
          pair: 'USDJPY',
          type: 'BUY',
          profit: 75.5,  // Float
          status: 'completed',
          marketType: 'Forex',
          tradeDate: new Date()
        }
      ]);

      const res = await request(app)
        .get('/api/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(parseFloat(res.body.totalProfit)).toBe(125.5);  // 100 - 50 + 75.5
    });

    it('should handle NaN and Infinity values gracefully', async () => {
      const Trade = require('../models/Trade');
      await Trade.create({
        user: testUser._id,
        pair: 'EURUSD',
        type: 'BUY',
        profit: NaN,
        status: 'completed',
        marketType: 'Forex',
        tradeDate: new Date()
      });

      const res = await request(app)
        .get('/api/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.totalProfit).toBe('0.00');  // NaN treated as 0
    });
  });

  describe('Edge Case 3: Division by Zero', () => {
    it('should handle win rate calculation with 0 trades', async () => {
      const res = await request(app)
        .get('/api/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.winRate).toBe('0.0');
      expect(res.body.winRate).not.toBe('NaN');
      expect(res.body.winRate).not.toBe('Infinity');
    });

    it('should handle profit factor with no losing trades', async () => {
      const Trade = require('../models/Trade');
      await Trade.insertMany([
        {
          user: testUser._id,
          pair: 'EURUSD',
          type: 'BUY',
          profit: 100,
          status: 'completed',
          marketType: 'Forex',
          tradeDate: new Date()
        },
        {
          user: testUser._id,
          pair: 'GBPUSD',
          type: 'BUY',
          profit: 200,
          status: 'completed',
          marketType: 'Forex',
          tradeDate: new Date()
        }
      ]);

      const res = await request(app)
        .get('/api/analytics/performance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // Should return null or a number, not "∞"
      expect(res.body.profitFactor).toBeDefined();
      expect(typeof res.body.profitFactor).toMatch(/number|string|null/);
    });

    it('should handle risk/reward with zero risk (entryPrice === stopLoss)', async () => {
      const Trade = require('../models/Trade');
      await Trade.create({
        user: testUser._id,
        pair: 'EURUSD',
        type: 'BUY',
        profit: 50,
        entryPrice: 1.2000,
        stopLoss: 1.2000,  // Same as entry = zero risk
        takeProfit: 1.2050,
        status: 'completed',
        marketType: 'Forex',
        tradeDate: new Date()
      });

      const res = await request(app)
        .get('/api/analytics/risk-reward')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('avgRR');
      expect(res.body.avgRR).not.toBe('Infinity');
      expect(res.body.avgRR).not.toBe('NaN');
    });

    it('should handle standard deviation with single trade', async () => {
      const Trade = require('../models/Trade');
      await Trade.create({
        user: testUser._id,
        pair: 'EURUSD',
        type: 'BUY',
        profit: 100,
        status: 'completed',
        marketType: 'Forex',
        tradeDate: new Date()
      });

      const res = await request(app)
        .get('/api/analytics/risk-reward')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('riskAdjustedReturn');
      // Should handle stdDev = 0 gracefully
    });
  });

  describe('Edge Case 4: Extreme Values', () => {
    it('should handle very large profit values', async () => {
      const Trade = require('../models/Trade');
      await Trade.create({
        user: testUser._id,
        pair: 'EURUSD',
        type: 'BUY',
        profit: 999999999.99,
        status: 'completed',
        marketType: 'Forex',
        tradeDate: new Date()
      });

      const res = await request(app)
        .get('/api/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(parseFloat(res.body.totalProfit)).toBeGreaterThan(999999999);
    });

    it('should handle very small profit values', async () => {
      const Trade = require('../models/Trade');
      await Trade.create({
        user: testUser._id,
        pair: 'EURUSD',
        type: 'BUY',
        profit: 0.001,
        status: 'completed',
        marketType: 'Forex',
        tradeDate: new Date()
      });

      const res = await request(app)
        .get('/api/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      // Should round to 2 decimal places
      expect(res.body.totalProfit).toBe('0.00');
    });

    it('should handle negative profit (loss)', async () => {
      const Trade = require('../models/Trade');
      await Trade.create({
        user: testUser._id,
        pair: 'EURUSD',
        type: 'BUY',
        profit: -250.50,
        status: 'completed',
        marketType: 'Forex',
        tradeDate: new Date()
      });

      const res = await request(app)
        .get('/api/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(parseFloat(res.body.totalProfit)).toBe(-250.50);
      expect(res.body.losingTrades).toBe(1);
      expect(res.body.winningTrades).toBe(0);
    });
  });

  describe('Edge Case 5: Session Overlap Classification', () => {
    it('should classify Asia session trades correctly (0-8 UTC)', async () => {
      const Trade = require('../models/Trade');
      await Trade.create({
        user: testUser._id,
        pair: 'USDJPY',
        profit: 100,
        status: 'completed',
        marketType: 'Forex',
        createdAt: new Date('2024-01-01T05:00:00Z')  // 5 UTC
      });

      const res = await request(app)
        .get('/api/analytics/time')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.bySession).toHaveProperty('Asia Session');
      expect(res.body.bySession['Asia Session'].total).toBe(1);
    });

    it('should classify London/NY overlap trades correctly (13-16 UTC)', async () => {
      const Trade = require('../models/Trade');
      await Trade.create({
        user: testUser._id,
        pair: 'EURUSD',
        profit: 150,
        status: 'completed',
        marketType: 'Forex',
        createdAt: new Date('2024-01-01T14:00:00Z')  // 14 UTC = OVERLAP
      });

      const res = await request(app)
        .get('/api/analytics/time')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.bySession).toHaveProperty('London/NY Overlap');
      expect(res.body.bySession['London/NY Overlap'].total).toBe(1);
      
      // Should NOT be classified as London
      if (res.body.bySession['London Session']) {
        expect(res.body.bySession['London Session'].total).toBe(0);
      }
    });

    it('should classify NY session trades correctly (16-21 UTC)', async () => {
      const Trade = require('../models/Trade');
      await Trade.create({
        user: testUser._id,
        pair: 'EURUSD',
        profit: 200,
        status: 'completed',
        marketType: 'Forex',
        createdAt: new Date('2024-01-01T18:00:00Z')  // 18 UTC
      });

      const res = await request(app)
        .get('/api/analytics/time')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.bySession).toHaveProperty('NY Session');
      expect(res.body.bySession['NY Session'].total).toBe(1);
    });
  });

  describe('Edge Case 6: ISO Week Calculation', () => {
    it('should calculate ISO week numbers correctly', async () => {
      const Trade = require('../models/Trade');
      
      // Create trades in different weeks
      await Trade.insertMany([
        {
          user: testUser._id,
          pair: 'EURUSD',
          profit: 100,
          status: 'completed',
          marketType: 'Forex',
          createdAt: new Date('2024-01-01T10:00:00Z')  // Week 1
        },
        {
          user: testUser._id,
          pair: 'GBPUSD',
          profit: 150,
          status: 'completed',
          marketType: 'Forex',
          createdAt: new Date('2024-01-15T10:00:00Z')  // Week 3
        }
      ]);

      const res = await request(app)
        .get('/api/analytics/weekly-stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      
      // Should have proper ISO week keys (YYYY-Www format)
      const weeks = Object.keys(res.body);
      expect(weeks.length).toBeGreaterThan(0);
      
      // Check format matches ISO week (e.g., "2024-W01")
      weeks.forEach(week => {
        expect(week).toMatch(/^\d{4}-W\d{2}$/);
      });
    });
  });

  describe('Edge Case 7: Missing or Null Fields', () => {
    it('should handle trades with null profit', async () => {
      const Trade = require('../models/Trade');
      await Trade.create({
        user: testUser._id,
        pair: 'EURUSD',
        type: 'BUY',
        profit: null,
        status: 'completed',
        marketType: 'Forex',
        tradeDate: new Date()
      });

      const res = await request(app)
        .get('/api/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.totalProfit).toBe('0.00');
    });

    it('should handle trades with undefined profit', async () => {
      const Trade = require('../models/Trade');
      await Trade.create({
        user: testUser._id,
        pair: 'EURUSD',
        type: 'BUY',
        status: 'completed',
        marketType: 'Forex',
        tradeDate: new Date()
      });

      const res = await request(app)
        .get('/api/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should handle trades with missing createdAt', async () => {
      const Trade = require('../models/Trade');
      await Trade.create({
        user: testUser._id,
        pair: 'EURUSD',
        profit: 100,
        status: 'completed',
        marketType: 'Forex'
        // No createdAt - will use default
      });

      const res = await request(app)
        .get('/api/analytics/time')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });
  });
});
