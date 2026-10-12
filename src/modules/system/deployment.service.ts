import { AuditService } from '../audit/audit.service';
import { RealtimeBroadcaster } from '../realtime/eventStream';

export interface CodePackage {
  id: string;
  filename: string;
  version: string;
  sizeMb: number;
  createdAt: string;
  createdBy: string;
  sourcePath: string;
  isLatest: boolean;
}

export class DeploymentService {
  private static instance: DeploymentService;

  private packages: CodePackage[] = [
    {
      id: 'pkg-01',
      filename: 'oxide-2026-09-17T15-48-05.zip',
      version: 'oxide-2026-09-17T15-48-05',
      sizeMb: 0.18,
      createdAt: '17/9/2569 22:48:05',
      createdBy: 'แอดมินเครือข่าย - โก๊ะแม็คเก้',
      sourcePath: '/www/project_oxide/oxide_project_git (src/ scripts/ package.json) ไม่รวม node/log_system',
      isLatest: true,
    },
    {
      id: 'pkg-02',
      filename: 'oxide-2026-09-15T10-20-00.zip',
      version: 'oxide-2026-09-15T10-20-00',
      sizeMb: 0.17,
      createdAt: '15/9/2569 10:20:00',
      createdBy: 'แอดมินเครือข่าย - โก๊ะแม็คเก้',
      sourcePath: '/www/project_oxide/oxide_project_git',
      isLatest: false,
    }
  ];

  public static getInstance(): DeploymentService {
    if (!DeploymentService.instance) {
      DeploymentService.instance = new DeploymentService();
    }
    return DeploymentService.instance;
  }

  public getPackages(): CodePackage[] {
    return this.packages;
  }

  public getLatestPackage(): CodePackage {
    return this.packages.find(p => p.isLatest) || this.packages[0];
  }

  public async deployPackage(
    packageId: string,
    targetBotId?: string,
    requestedBy = 'ADMIN'
  ): Promise<{ success: boolean; deployedTo: string[]; package: CodePackage }> {
    const pkg = this.packages.find(p => p.id === packageId) || this.getLatestPackage();
    const targets = targetBotId ? [targetBotId] : ['ALL_ONLINE_BOTS'];

    await AuditService.getInstance().log(
      requestedBy,
      'DEPLOY_CODE_PACKAGE',
      'CODE_DEPLOYMENT',
      targetBotId || 'ALL',
      { packageId: pkg.id, version: pkg.version, filename: pkg.filename }
    );

    RealtimeBroadcaster.getInstance().broadcast('code_deployment', {
      package: pkg,
      targets,
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      deployedTo: targets,
      package: pkg,
    };
  }

  public packNewVersion(requestedBy = 'ADMIN'): CodePackage {
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const version = `oxide-${dateStr}`;
    const newPkg: CodePackage = {
      id: `pkg-${Date.now()}`,
      filename: `${version}.zip`,
      version,
      sizeMb: 0.18,
      createdAt: now.toLocaleString('th-TH'),
      createdBy: requestedBy,
      sourcePath: '/www/project_oxide/oxide_project_git',
      isLatest: true,
    };

    this.packages.forEach(p => p.isLatest = false);
    this.packages.unshift(newPkg);

    RealtimeBroadcaster.getInstance().broadcast('new_package_available', newPkg);
    return newPkg;
  }
}
