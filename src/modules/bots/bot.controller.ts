import { Request, Response, NextFunction } from 'express';
import { BotService } from './bot.service';
import { z } from 'zod';

const commandSchema = z.object({
  command: z.enum(['start', 'stop', 'restart', 'status']),
  requestedBy: z.string().optional().default('DASHBOARD_OPERATOR'),
});

export class BotController {
  private botService = BotService.getInstance();

  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.botService.syncWithSimulator();
      const bots = await this.botService.getAllBots();
      res.status(200).json({ success: true, data: bots });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.botService.getBotById(req.params.id as string);
      if (!data) {
        res.status(404).json({ success: false, error: 'Bot not found' });
        return;
      }
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  public sendCommand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { command, requestedBy } = commandSchema.parse(req.body);
      const result = await this.botService.sendCommand(req.params.id as string, command, requestedBy);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  public getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await this.botService.getSummaryMetrics();
      res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  };
}
