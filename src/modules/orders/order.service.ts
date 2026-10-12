import { query, logger, pool } from '../../database/db';
import { KillSwitchService } from '../system/killSwitch.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeBroadcaster } from '../realtime/eventStream';

export class OrderService {
  private static instance: OrderService;

  public static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  public async getOrders(limit = 50): Promise<any[]> {
    const res = await query(
      `SELECT id, external_order_id as "externalOrderId", status, amount, currency, 
              created_at as "createdAt", updated_at as "updatedAt"
       FROM orders
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  }

  public async createOrder(externalOrderId: string, amount: number, currency = 'THB'): Promise<any> {
    const res = await query(
      `INSERT INTO orders (external_order_id, status, amount, currency, created_at, updated_at)
       VALUES ($1, 'pending', $2, $3, NOW(), NOW())
       ON CONFLICT (external_order_id) DO UPDATE SET updated_at = NOW()
       RETURNING id, external_order_id as "externalOrderId", status, amount, currency, created_at as "createdAt"`,
      [externalOrderId, amount, currency]
    );

    const order = res.rows[0];

    // Record order event
    await query(
      `INSERT INTO order_events (order_id, event_type, payload, created_at)
       VALUES ($1, 'ORDER_CREATED', $2, NOW())`,
      [order.id, JSON.stringify({ amount, currency, status: 'pending' })]
    );

    RealtimeBroadcaster.getInstance().broadcast('order_created', order);
    return order;
  }

  /**
   * Concurrency-safe Order Dispatch using SELECT ... FOR UPDATE SKIP LOCKED
   */
  public async dispatchNextOrder(botId: string): Promise<any> {
    // 1. Check Global Kill-Switch
    if (!KillSwitchService.getInstance().isOrderProcessingAllowed()) {
      logger.warn(`Order dispatch rejected: Global Kill-Switch is ACTIVE`);
      return { success: false, reason: 'KILL_SWITCH_ACTIVE', message: 'System is currently halted by Kill-Switch' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Atomic lock first pending order
      const orderRes = await client.query(
        `SELECT id, external_order_id as "externalOrderId", amount, currency
         FROM orders
         WHERE status = 'pending'
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`
      );

      if (orderRes.rows.length === 0) {
        await client.query('COMMIT');
        return { success: false, reason: 'NO_PENDING_ORDERS', message: 'No pending orders in queue' };
      }

      const order = orderRes.rows[0];

      // Update order status to processing
      await client.query(
        `UPDATE orders SET status = 'processing', updated_at = NOW() WHERE id = $1`,
        [order.id]
      );

      // Record order event
      await client.query(
        `INSERT INTO order_events (order_id, event_type, payload, created_at)
         VALUES ($1, 'ORDER_DISPATCHED_TO_BOT', $2, NOW())`,
        [order.id, JSON.stringify({ botId, status: 'processing' })]
      );

      await client.query('COMMIT');

      await AuditService.getInstance().log(
        'DISPATCHER',
        'DISPATCH_ORDER_TO_BOT',
        'ORDER',
        order.externalOrderId,
        { botId, orderId: order.id }
      );

      RealtimeBroadcaster.getInstance().broadcast('order_dispatched', {
        orderId: order.id,
        externalOrderId: order.externalOrderId,
        botId,
        status: 'processing',
      });

      return {
        success: true,
        orderId: order.id,
        externalOrderId: order.externalOrderId,
        assignedBotId: botId,
        status: 'processing',
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      logger.error('Order dispatch error', { error: err.message });
      throw err;
    } finally {
      client.release();
    }
  }

  public async completeOrder(orderId: number): Promise<any> {
    await query(
      `UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [orderId]
    );

    await query(
      `INSERT INTO order_events (order_id, event_type, payload, created_at)
       VALUES ($1, 'ORDER_COMPLETED', $2, NOW())`,
      [orderId, JSON.stringify({ status: 'completed' })]
    );

    RealtimeBroadcaster.getInstance().broadcast('order_completed', { orderId, status: 'completed' });
    return { success: true, orderId, status: 'completed' };
  }
}
