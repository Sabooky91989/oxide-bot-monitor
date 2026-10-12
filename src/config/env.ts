import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://oxide:oxide_dev@localhost:55432/oxide_monitor',
  BOT_SIMULATOR_URL: process.env.BOT_SIMULATOR_URL || 'http://localhost:8788',
  HEARTBEAT_TIMEOUT_SECONDS: 30,
};
