import express from 'express';
import dotenv from 'dotenv';
import { ProxyService } from './services/proxyService';
import { ProxyCheckerService } from './services/proxyCheckerService';
import { createProxyRoutes } from './routes/proxyRoutes';

// Load environment variables
dotenv.config();

class ProxyServer {
  private app: express.Application;
  private proxyService: ProxyService;
  private proxyCheckerService: ProxyCheckerService;
  private port: number;

  constructor() {
    // Initialize Express app
    this.app = express();
    this.port = this.normalizePort(process.env.PORT || 3000);

    // Create service instances
    this.proxyService = new ProxyService();
    this.proxyCheckerService = new ProxyCheckerService(this.proxyService);

    // Setup middleware and routes
    this.initializeMiddleware();
    this.initializeRoutes();
  }

  private normalizePort(val: string | number): number {
    const port = typeof val === 'string' ? parseInt(val, 10) : val;
    
    if (isNaN(port)) {
      console.error('Invalid port number');
      process.exit(1);
    }
    
    return port;
  }

  private initializeMiddleware() {
    // JSON parsing middleware
    this.app.use(express.json());
    
    // Optional: Error handling middleware
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error(err.stack);
      res.status(500).send('Something broke!');
    });
  }

  private initializeRoutes() {
    // Create and use routes
    this.app.use('/api', createProxyRoutes(this.proxyService));
  }

  private async initializeProxies() {
    try {
      // Set proxies to manual mode
      await this.proxyService.makeProxiesManual();
      // await this.proxyService.initProxies();
      
    } catch (error) {
      console.error('Failed to initialize proxies:', error);
      process.exit(1);
    }
  }

  private startPeriodicChecking() {
    // Start periodic proxy checking
    this.proxyCheckerService.startPeriodicCheck();
  }

  public async start() {
    try {
      // Initialize proxies before starting the server
      await this.initializeProxies();
      const server = this.app.listen(this.port, () => {
        console.log(`Server running on port ${this.port}`);
      });
      // this.proxyService.connectAllProxies();
      // this.startPeriodicChecking();

      // Start the server
     

      // Graceful shutdown
      this.setupGracefulShutdown(server);
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(server: any) {
    const signals = ['SIGINT', 'SIGTERM'];

    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`Received ${signal}. Shutting down gracefully...`);
        
        try {
          // Close server
          await new Promise<void>((resolve, reject) => {
            server.close((err: Error | null) => {
              if (err) reject(err);
              else resolve();
            });
          });

          // Cleanup proxies
        //   await this.proxyService.disconnectAllProxies();

          // Stop periodic checking
        //   this.proxyCheckerService.stopPeriodicCheck();

          console.log('Server shut down successfully');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    });
  }
}

// Main execution function
async function main() {
  const proxyServer = new ProxyServer();
  await proxyServer.start();
}

// Run the server
main().catch(error => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
});

export default ProxyServer;
