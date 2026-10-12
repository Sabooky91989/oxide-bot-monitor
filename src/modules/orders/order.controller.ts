import { Request, Response, NextFunction } from 'express';
import { OrderService } from './order.service';
import { z } from 'zod';

const createOrderSchema = z.object({
  externalOrderId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default('THB'),
});

const dispatchSchema = z.object({
  botId: z.string().min(1),
});

export class OrderController {
  private orderService = OrderService.getInstance();

  public getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orders = await this.orderService.getOrders();
      res.status(200).json({ success: true, data: orders });
    } catch (err) {
      next(err);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { externalOrderId, amount, currency } = createOrderSchema.parse(req.body);
      const order = await this.orderService.createOrder(externalOrderId, amount, currency);
      res.status(201).json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  };

  public dispatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { botId } = dispatchSchema.parse(req.body);
      const result = await this.orderService.dispatchNextOrder(botId);
      if (!result.success) {
        const statusCode = result.reason === 'KILL_SWITCH_ACTIVE' ? 403 : 400;
        res.status(statusCode).json({
          success: false,
          error: {
            code: result.reason,
            message: result.message,
          },
        });
        return;
      }
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  public complete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = parseInt(req.params.id as string, 10);
      const result = await this.orderService.completeOrder(orderId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
}
