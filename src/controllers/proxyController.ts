import { Request, Response } from 'express';
import { ProxyService } from '../services/proxyService';

class ProxyController {
  private proxyService: ProxyService;

  constructor(proxyService: ProxyService) {
    this.proxyService = proxyService;
    this.getAllProxies = this.getAllProxies.bind(this);
    this.checkProxyStatus = this.checkProxyStatus.bind(this);
    this.removeProxy = this.removeProxy.bind(this);
    this.setProxyStatus = this.setProxyStatus.bind(this);
    this.reconnectCurrentProxy = this.reconnectCurrentProxy.bind(this);
    this.reconnectRandomToCountryProxy = this.reconnectRandomToCountryProxy.bind(this);
  }

  
  // Get all proxies
  async getAllProxies(req: Request, res: Response): Promise<void> {
    try {
      const proxies = this.proxyService.getAllProxies();
      const retProxies: any[] = [];
      for (const proxy of proxies) {
        retProxies.push({
          id: proxy.id,
          host: proxy.host,
          port: proxy.port,
          proxyPort: proxy.proxyPort,
          country: proxy.country,
          status: proxy.status
        })
      }
      res.json({
        data: retProxies
      });
    } catch (error: Error | any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  // Check specific proxy status
  async checkProxyStatus(req: Request, res: Response): Promise<void> {
    try {
      const proxyId = req.params.id;
      const proxy = await this.proxyService.checkProxyStatus(proxyId);
      
      if (!proxy) {
        res.status(400).json({
          success: false,
          message: 'Invalid proxy ID',
          error: 'Proxy ID is required'
        });
        return;
      }
      res.json(proxy);
    } catch (error: Error | any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getProxyStatus(req: Request, res: Response): Promise<void> {
    try {
      console.log(req.params);
      const proxyId = req.params.id;
      const proxy = await this.proxyService.getProxyStatus(proxyId);
      
      if (!proxy) {
        res.status(400).json({
          success: false,
          message: 'Invalid proxy ID',
          error: 'Proxy ID is required'
        });
        return;
      }
      res.json(proxy);
    } catch (error: Error | any) {
      res.status(500).json({ error: error.message });
    }
  }

  async reconnectCurrentProxy(req: Request, res: Response): Promise<void> {
    try {
      console.log(req.params);
      const proxyId = req.params.id;
      const proxy = await this.proxyService.reconnectProxy(proxyId);
      
      if (!proxy) {
        res.status(400).json({
          success: false,
          message: 'Invalid proxy ID',
          error: 'Proxy ID is required'
        });
        return;
      }
      res.json(proxy);
    } catch (error: Error | any) {
      res.status(500).json({ error: error.message });
    }
  }

  async reconnectRandomToCountryProxy(req: Request, res: Response): Promise<void> {
    try {
      console.log(req.params);
      const country = req.params.country;
      const proxy = await this.proxyService.reconnectRandomProxyToCountry(country);
      
      if (!proxy) {
        res.status(400).json({
          success: false,
          message: 'Invalid proxy ID',
          error: 'Proxy ID is required'
        });
        return;
      }
      res.json(proxy);
    } catch (error: Error | any) {
      res.status(500).json({ error: error.message });
    }
  }

  async setProxyStatus(req: Request, res: Response): Promise<void> {
    try {
      console.log(req.body);
      const proxyId = req.body.id;
      const status = req.body.status;
      const proxy = await this.proxyService.setProxyStatus(proxyId, status);
      
      if (!proxy) {
        res.status(400).json({
          success: false,
          message: 'Invalid proxy ID',
          error: 'Proxy ID is required'
        });
        return;
      }
      res.json(proxy);
    } catch (error: Error | any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  // Remove a proxy
  async removeProxy(req: Request, res: Response): Promise<void> {
    try {
      const proxyId = req.params.id;
      const removed = this.proxyService.removeProxy(proxyId);
      
      if (removed) {
        res.status(200).json({ message: 'Proxy removed successfully' });
      } else {
        res.status(404).json({ error: 'Proxy not found' });
      }
    } catch (error: Error | any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export { ProxyController };