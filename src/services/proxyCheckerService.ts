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
    cron.schedule('*/1 * * * *', async () => {
      if (this.isRunning) {
        console.log('Previous proxy check still in progress. Skipping this interval.');
        return;
      }
      console.log('Starting periodic proxy check...');
      try {
        this.isRunning = true;
        await this.proxyService.checkAllProxiesAndReconnect();
      } catch (error) {
        console.error('Error during periodic proxy check:', error);
        this.isRunning = false;
      } finally {
        // Reset running flag
        this.isRunning = false;
      }
    });
  }
}

export { ProxyCheckerService };