import { Response } from 'express';

export class RealtimeBroadcaster {
  private static instance: RealtimeBroadcaster;
  private clients: Set<Response> = new Set();

  public static getInstance(): RealtimeBroadcaster {
    if (!RealtimeBroadcaster.instance) {
      RealtimeBroadcaster.instance = new RealtimeBroadcaster();
    }
    return RealtimeBroadcaster.instance;
  }

  public addClient(res: Response): void {
    this.clients.add(res);
    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  public broadcast(eventType: string, data: any): void {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      client.write(payload);
    }
  }
}
