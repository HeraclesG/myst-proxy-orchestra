import cron from 'node-cron';
import { ProxyService } from './proxyService';

class ProxyCheckerService {
  private proxyService: ProxyService;
  private isRunning: boolean = false;
  constructor(proxyService: ProxyService) {
    this.proxyService = proxyService;
  }

  // Periodic proxy checking
  startPeriodicCheck() {
    // Run every 15 minutes
    this.proxyService.proxies.forEach(proxy => {
      cron.schedule('*/10 * * * * *', async () => {
        if (proxy.is_running) {
          console.log(`Previous Check in Proces. ${proxy.host}:${proxy.port}`);
          return;
        }
        console.log(`Starting periodic proxy check. ${proxy.host}:${proxy.port}`);
        try {
          proxy.is_running = true;
          await this.proxyService.checkAndReconnect(proxy.id);
        } catch (error) {
          console.error(`Error during periodic proxy check for ${proxy.host}:${proxy.port}:`, error);
          proxy.is_running = false;
        } finally {
          // Reset running flag
          proxy.is_running = false;
        }
      });
    });
  }
}

export { ProxyCheckerService };