import { createApp } from './app';
import { ENV } from './config/env';
import { logger } from './database/db';
import { BotService } from './modules/bots/bot.service';

async function bootstrap() {
  const app = createApp();
  const botService = BotService.getInstance();

  const server = app.listen(ENV.PORT, () => {
    logger.info(`Oxide Bot Monitor server running on port ${ENV.PORT}`);
    logger.info(`Environment: ${ENV.NODE_ENV}`);
    logger.info(`Database connected at localhost:55432/oxide_monitor`);
    logger.info(`Bot Simulator target: ${ENV.BOT_SIMULATOR_URL}`);
  });

  // Initial sync with bot simulator
  await botService.syncWithSimulator();

  // Watchdog: Check heartbeat timeouts every 10 seconds
  const watchdogInterval = setInterval(async () => {
    try {
      await botService.checkHeartbeatTimeouts();
    } catch (err: any) {
      logger.error('Watchdog heartbeat check error', { error: err.message });
    }
  }, 10000);

  const shutdown = () => {
    logger.info('Shutting down Oxide Bot Monitor gracefully...');
    clearInterval(watchdogInterval);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch(err => {
  logger.error('Fatal bootstrap error', { error: err.message, stack: err.stack });
  process.exit(1);
});
