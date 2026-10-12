INSERT INTO oxide_bot_agents (id, name, device_name, status, cpu_percent, memory_percent, uptime_seconds, last_heartbeat)
VALUES
  ('bot-01', 'Kaotam BOT', 'LAPTOP-8CV23L', 'offline', 0.0, 0.0, 0, NOW() - INTERVAL '30 minutes'),
  ('bot-02', 'Kaotam Bot 02', 'DESKTOP-94BC71', 'online', 12.5, 38.4, 86400, NOW()),
  ('bot-03', 'Kaotam Bot 03', 'DESKTOP-5DDE42', 'online', 18.2, 42.1, 54000, NOW()),
  ('bot-04', 'Kaotam Bot 04', 'DESKTOP-DE8E90', 'online', 9.8, 31.0, 12000, NOW()),
  ('bot-05', 'Kaotam Bot 05', 'DESKTOP-1A2B3C', 'online', 14.1, 35.7, 24000, NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  device_name = EXCLUDED.device_name,
  status = EXCLUDED.status,
  cpu_percent = EXCLUDED.cpu_percent,
  memory_percent = EXCLUDED.memory_percent,
  uptime_seconds = EXCLUDED.uptime_seconds,
  last_heartbeat = EXCLUDED.last_heartbeat;

INSERT INTO orders (external_order_id, status, amount, currency)
VALUES
  ('TEST-ORDER-1092', 'completed', 1092.00, 'THB'),
  ('TEST-ORDER-1093', 'processing', 500.00, 'THB'),
  ('TEST-ORDER-1094', 'pending', 750.00, 'THB'),
  ('TEST-ORDER-1095', 'pending', 1200.00, 'THB')
ON CONFLICT (external_order_id) DO NOTHING;

