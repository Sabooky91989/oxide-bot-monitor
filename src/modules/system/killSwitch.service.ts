import { AuditService } from '../audit/audit.service';
import { RealtimeBroadcaster } from '../realtime/eventStream';

export class KillSwitchService {
  private static instance: KillSwitchService;
  private isSystemActive = true; // true = เปิดทั้งระบบ (Normal), false = ปิดทั้งระบบ (Kill-switch Active)

  public static getInstance(): KillSwitchService {
    if (!KillSwitchService.instance) {
      KillSwitchService.instance = new KillSwitchService();
    }
    return KillSwitchService.instance;
  }

  public getStatus(): { active: boolean; message: string } {
    return {
      active: this.isSystemActive,
      message: this.isSystemActive
        ? 'ทั้งระบบ: เปิด (บ็อทในระบบจะดึง ทุกๆออร์เดอร์ในคิวออร์เดอร์)'
        : 'ทั้งระบบ: ปิด (บ็อทในระบบจะหยุดรับออเดอร์ใหม่ทันที - Kill Switch ทำงาน)',
    };
  }

  public async setStatus(enable: boolean, requestedBy = 'ADMIN'): Promise<{ active: boolean; message: string }> {
    this.isSystemActive = enable;
    const action = enable ? 'KILL_SWITCH_DISABLED_SYSTEM_OPEN' : 'KILL_SWITCH_ENABLED_SYSTEM_HALTED';

    await AuditService.getInstance().log(
      requestedBy,
      action,
      'GLOBAL_SYSTEM',
      'system',
      { isSystemActive: enable }
    );

    RealtimeBroadcaster.getInstance().broadcast('kill_switch_update', this.getStatus());

    return this.getStatus();
  }

  public isOrderProcessingAllowed(): boolean {
    return this.isSystemActive;
  }
}
