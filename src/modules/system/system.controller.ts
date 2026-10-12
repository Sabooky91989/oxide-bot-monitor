import { Request, Response, NextFunction } from 'express';
import { KillSwitchService } from './killSwitch.service';
import { DeploymentService } from './deployment.service';
import { z } from 'zod';

const killSwitchSchema = z.object({
  enable: z.boolean(),
  requestedBy: z.string().optional().default('ADMIN'),
});

const deploySchema = z.object({
  packageId: z.string().optional(),
  targetBotId: z.string().optional(),
  requestedBy: z.string().optional().default('ADMIN'),
});

export class SystemController {
  private killSwitch = KillSwitchService.getInstance();
  private deployment = DeploymentService.getInstance();

  public getKillSwitch = (req: Request, res: Response): void => {
    res.status(200).json({ success: true, data: this.killSwitch.getStatus() });
  };

  public setKillSwitch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { enable, requestedBy } = killSwitchSchema.parse(req.body);
      const result = await this.killSwitch.setStatus(enable, requestedBy);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  public getPackages = (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      data: {
        latest: this.deployment.getLatestPackage(),
        packages: this.deployment.getPackages(),
      },
    });
  };

  public deployPackage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { packageId, targetBotId, requestedBy } = deploySchema.parse(req.body);
      const result = await this.deployment.deployPackage(packageId || 'latest', targetBotId, requestedBy);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  public packNewVersion = (req: Request, res: Response): void => {
    const pkg = this.deployment.packNewVersion('ADMIN');
    res.status(201).json({ success: true, data: pkg });
  };
}
