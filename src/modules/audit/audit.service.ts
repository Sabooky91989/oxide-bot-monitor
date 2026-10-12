import { query, logger } from '../../database/db';
import { RealtimeBroadcaster } from '../realtime/eventStream';

export class AuditService {
  private static instance: AuditService;

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  public async log(
    actor: string,
    action: string,
    targetType: string,
    targetId?: string,
    metadata?: any
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO audit_logs (actor, action, target_type, target_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [actor, action, targetType, targetId || null, metadata ? JSON.stringify(metadata) : null]
      );

      RealtimeBroadcaster.getInstance().broadcast('audit_log', {
        actor,
        action,
        targetType,
        targetId,
        metadata,
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      logger.error('Failed to write audit log', { error: err.message });
    }
  }

  public async getRecentLogs(limit = 20): Promise<any[]> {
    const res = await query(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return res.rows;
  }
}
