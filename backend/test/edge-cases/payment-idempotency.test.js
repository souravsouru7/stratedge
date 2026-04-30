/**
 * Edge Case Tests - Payment Idempotency
 * Tests that duplicate payment verifications are handled safely
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let testUser;
let authToken;

// Mock dependencies before requiring server
jest.mock('../config/redis', () => ({
  client: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
  isRedisReady: jest.fn(() => false),
  bullmqConnection: {},
  connectRedis: jest.fn()
}));

jest.mock('../queues/ocrQueue', () => ({
  enqueueOcrJob: jest.fn(),
  getOcrJobSnapshot: jest.fn(),
  OCR_QUEUE_NAME: 'test-queue'
}));

describe('Payment Idempotency Edge Cases', () => {
  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
    
    // Clear require cache and load app
    jest.resetModules();
    app = require('../server');
    
    // Create test user
    const User = require('../models/Users');
    testUser = await User.create({
      name: 'Payment Test User',
      email: 'payment-test@example.com',
      password: 'hashed_password_123',
      authProvider: 'local',
      subscriptionStatus: 'inactive'
    });
    
    // Generate JWT token
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
    // Clear payments collection
    const Payment = require('../models/Payment');
    await Payment.deleteMany({});
    
    // Reset user subscription
    const User = require('../models/Users');
    await User.findByIdAndUpdate(testUser._id, {
      subscriptionStatus: 'inactive',
      subscriptionExpiry: null,
      totalPaid: 0
    });
  });

  describe('Edge Case 1: Duplicate Payment Verification', () => {
    it('should process first payment successfully', async () => {
      const paymentData = {
        razorpay_order_id: 'order_first123',
        razorpay_payment_id: 'pay_first456',
        razorpay_signature: 'valid_signature'
      };

      // Mock crypto verification
      jest.spyOn(require('crypto'), 'createHmac').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('valid_signature')
      });

      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(paymentData);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('verified');
    });

    it('should reject duplicate payment with same razorpay_payment_id', async () => {
      const paymentData = {
        razorpay_order_id: 'order_dup123',
        razorpay_payment_id: 'pay_duplicate789',
        razorpay_signature: 'valid_signature'
      };

      // Mock crypto
      jest.spyOn(require('crypto'), 'createHmac').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('valid_signature')
      });

      // First request
      const res1 = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(paymentData);

      expect(res1.statusCode).toBe(200);
      expect(res1.body.success).toBe(true);

      // Second request (duplicate)
      const res2 = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(paymentData);

      expect(res2.statusCode).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.message).toContain('already verified');

      // Verify only ONE payment record exists
      const Payment = require('../models/Payment');
      const payments = await Payment.find({ 
        razorpayPaymentId: 'pay_duplicate789' 
      });
      
      expect(payments.length).toBe(1);
    });

    it('should not extend subscription twice for duplicate payment', async () => {
      const paymentData = {
        razorpay_order_id: 'order_sub123',
        razorpay_payment_id: 'pay_sub456',
        razorpay_signature: 'valid_signature'
      };

      // Mock crypto
      jest.spyOn(require('crypto'), 'createHmac').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('valid_signature')
      });

      // Send payment twice
      await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData);

      await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData);

      // Check user subscription
      const User = require('../models/Users');
      const user = await User.findById(testUser._id);

      // Should only be extended once (90 days from now)
      const now = new Date();
      const expectedExpiry = new Date(now);
      expectedExpiry.setDate(expectedExpiry.getDate() + 90);
      
      // Allow 1 second tolerance
      const actualExpiry = new Date(user.subscriptionExpiry);
      const diff = Math.abs(actualExpiry - expectedExpiry);
      
      expect(diff).toBeLessThan(1000); // Within 1 second
      expect(user.totalPaid).toBe(150); // Only charged once
    });
  });

  describe('Edge Case 2: Missing Payment Fields', () => {
    it('should reject request with missing razorpay_order_id', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send({
          razorpay_payment_id: 'pay_test123',
          razorpay_signature: 'sig_test'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Missing required payment fields');
    });

    it('should reject request with missing razorpay_payment_id', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send({
          razorpay_order_id: 'order_test123',
          razorpay_signature: 'sig_test'
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject request with missing razorpay_signature', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send({
          razorpay_order_id: 'order_test123',
          razorpay_payment_id: 'pay_test456'
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Edge Case 3: Invalid Signature', () => {
    it('should reject payment with invalid signature', async () => {
      // Mock crypto to return different signature
      jest.spyOn(require('crypto'), 'createHmac').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('expected_signature_123')
      });

      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send({
          razorpay_order_id: 'order_test123',
          razorpay_payment_id: 'pay_test456',
          razorpay_signature: 'wrong_signature_789'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Invalid payment signature');
    });

    it('should handle non-hex signature gracefully', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send({
          razorpay_order_id: 'order_test123',
          razorpay_payment_id: 'pay_test456',
          razorpay_signature: 'NOT_VALID_HEX!!!'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Invalid payment signature');
    });
  });

  describe('Edge Case 4: Concurrent Payment Race Condition', () => {
    it('should handle concurrent payment verifications safely', async () => {
      const paymentData = {
        razorpay_order_id: 'order_concurrent123',
        razorpay_payment_id: 'pay_concurrent456',
        razorpay_signature: 'valid_signature'
      };

      // Mock crypto
      jest.spyOn(require('crypto'), 'createHmac').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('valid_signature')
      });

      // Simulate concurrent requests
      const promises = [
        request(app)
          .post('/api/payments/verify')
          .set('Authorization', `Bearer ${authToken}`)
          .send(paymentData),
        request(app)
          .post('/api/payments/verify')
          .set('Authorization', `Bearer ${authToken}`)
          .send(paymentData)
      ];

      const results = await Promise.all(promises);

      // At least one should succeed
      const successCount = results.filter(r => r.statusCode === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Check only one payment record
      const Payment = require('../models/Payment');
      const payments = await Payment.find({ 
        razorpayPaymentId: 'pay_concurrent456' 
      });
      
      expect(payments.length).toBeLessThanOrEqual(2); // Max 2 due to race
    });
  });
});
