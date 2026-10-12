import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { BotController } from './modules/bots/bot.controller';
import { SystemController } from './modules/system/system.controller';
import { OrderController } from './modules/orders/order.controller';
import { AuditService } from './modules/audit/audit.service';
import { RealtimeBroadcaster } from './modules/realtime/eventStream';

export function createApp(): Application {
  const app: Application = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const publicDir = fs.existsSync(path.join(__dirname, 'public'))
    ? path.join(__dirname, 'public')
    : path.join(process.cwd(), 'src/public');

  // Serve static Dashboard UI
  app.use(express.static(publicDir));

  // Healthcheck
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'oxide-bot-monitor',
      timestamp: new Date().toISOString(),
    });
  });

  const botController = new BotController();
  const systemController = new SystemController();
  const orderController = new OrderController();

  // API Routes
  const router = express.Router();

  // Bots & Metrics
  router.get('/bots', botController.getAll);
  router.get('/bots/:id', botController.getById);
  router.post('/bots/:id/commands', botController.sendCommand);
  router.get('/summary', botController.getSummary);

  // System & Deployment
  router.get('/kill-switch', systemController.getKillSwitch);
  router.post('/kill-switch', systemController.setKillSwitch);
  router.get('/packages', systemController.getPackages);
  router.post('/packages/deploy', systemController.deployPackage);
  router.post('/packages/pack', systemController.packNewVersion);

  // Orders
  router.get('/orders', orderController.getOrders);
  router.post('/orders', orderController.create);
  router.post('/orders/dispatch', orderController.dispatch);
  router.post('/orders/:id/complete', orderController.complete);

  // Audit Logs
  router.get('/audit-logs', async (req: Request, res: Response) => {
    const logs = await AuditService.getInstance().getRecentLogs();
    res.status(200).json({ success: true, data: logs });
  });

  // Real-Time SSE Stream
  router.get('/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    RealtimeBroadcaster.getInstance().addClient(res);

    // Initial ping
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`);
  });

  app.use('/api', router);

  // Fallback to Dashboard index.html
  app.get('*', (req: Request, res: Response, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // Centralized Error Handler
  app.use((err: any, req: Request, res: Response, next: any) => {
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred',
      },
    });
  });

  return app;
}
