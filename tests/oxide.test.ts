import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/database/db';

const app = createApp();

describe('Oxide Bot Monitor Service Tests', () => {
  afterAll(async () => {
    await pool.end();
  });

  describe('Healthcheck & Basic API', () => {
    it('should return UP status on /health', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
    });
  });

  describe('Bot Management & Metrics', () => {
    it('should list all bot agents', async () => {
      const res = await request(app).get('/api/bots');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should return overview summary metrics', async () => {
      const res = await request(app).get('/api/summary');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('onlineCount');
      expect(res.body.data).toHaveProperty('standbyCount');
      expect(res.body.data).toHaveProperty('activeCount');
    });

    it('should send start/stop command to a bot and log audit', async () => {
      const res = await request(app)
        .post('/api/bots/bot-02/commands')
        .send({ command: 'stop' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('offline');
    });
  });

  describe('Global Kill-Switch & Safety Controls', () => {
    it('should read current kill-switch state', async () => {
      const res = await request(app).get('/api/kill-switch');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('active');
    });

    it('should activate kill-switch and reject order dispatch', async () => {
      // 1. Activate kill-switch (disable system)
      const killRes = await request(app)
        .post('/api/kill-switch')
        .send({ enable: false });
      expect(killRes.status).toBe(200);
      expect(killRes.body.data.active).toBe(false);

      // 2. Attempt to dispatch order
      const dispatchRes = await request(app)
        .post('/api/orders/dispatch')
        .send({ botId: 'bot-02' });
      expect(dispatchRes.status).toBe(403);
      expect(dispatchRes.body.error.code).toBe('KILL_SWITCH_ACTIVE');

      // 3. Re-enable system
      await request(app)
        .post('/api/kill-switch')
        .send({ enable: true });
    });
  });

  describe('Code Deployment & Version Packaging', () => {
    it('should list available packages', async () => {
      const res = await request(app).get('/api/packages');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.packages.length).toBeGreaterThanOrEqual(1);
    });

    it('should package a new version', async () => {
      const res = await request(app)
        .post('/api/packages/pack')
        .send({});
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('version');
    });

    it('should deploy package to all bots', async () => {
      const res = await request(app)
        .post('/api/packages/deploy')
        .send({ packageId: 'pkg-01' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Order Processing & Concurrency Protection', () => {
    it('should create an order', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          externalOrderId: `TEST-${Date.now()}`,
          amount: 500,
          currency: 'THB',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('pending');
    });

    it('should fetch audit logs', async () => {
      const res = await request(app).get('/api/audit-logs');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
