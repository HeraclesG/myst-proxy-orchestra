import axios from 'axios';
import { buildNodeClient, NodeClient } from '../tools/tequila';
import { ConnectionStatus } from 'mysterium-vpn-js';
import dotenv from 'dotenv';
dotenv.config();
interface Proxy {
  id: string;
  host: string;
  port: number;
  proxyPort: number;
  country: string;
  status: string;
  lastChecked?: Date;
  node: NodeClient | undefined;
}

class ProxyService {
  private proxies: Proxy[] = [];

  // Add a new proxy
  addProxy(proxyData: Omit<Proxy, 'id' | 'status' | 'lastChecked' | 'node'>): Proxy {
    const newProxy: Proxy = {
      id: Date.now().toString(),
      status: 'unknown',
      lastChecked: undefined,
      node: undefined,
      ...proxyData
    };

    this.proxies.push(newProxy);
    return newProxy;
  }

  // Get all proxies
  getAllProxies(): Proxy[] {
    return this.proxies;
  }

  // Connect to all proxies
  async initProxies() {
    for (const proxy of this.proxies) {
      await this.initProxy(proxy.id);
    }
  }

  // Initialize a single proxy
  async initProxy(proxyId: string) {
    const proxy = this.getProxyById(proxyId);
    if (!proxy) return;
    proxy.node = await buildNodeClient(proxy.port);
  }

  // Connect to all proxies
  async connectAllProxies() {
    for (const proxy of this.proxies) {
      await proxy.node?.auth();
      // await proxy.node?.cancelConnection();
      const result = await this.checkProxyStatus(proxy.id);
      if (result && result.status === 'inactive') await this.connectProxy(proxy.id);

      else console.log(`${proxy.host}:${proxy.port} - ${result?.status}`);
    }
  }


  // Reconnect to a specific proxy
  async reconnectProxy(proxyId: string) {
    console.log('reconnectProxy', proxyId);
    const proxy = this.getProxyById(proxyId);
    if (!proxy) return null;
    // proxy.node = await buildNodeClient(proxy.port);
    try {
      await proxy.node?.auth();
      const connectResult = await proxy.node?.reconnectToCurrent(proxy.proxyPort);
      if (connectResult) {
        proxy.status = 'active';
        return proxy
      } else {
        proxy.status = 'inactive';
        return await this.reconnectCountryProxy(proxy.id, proxy.country);
         
      }
    } catch (err: any) {
      console.error(`failed to reconnect, error: ${err}`);
      return null
    }
  }

  async reconnectCountryProxy(proxyId: string, country: string) {
    const proxy = this.getProxyById(proxyId);
    if (!proxy) return null;
    // proxy.node = await buildNodeClient(proxy.port);
    try {
      await proxy.node?.auth();
      proxy.country = country;
      const connectResult = await proxy.node?.quickConnectTo(proxy.country, { proxyPort: proxy.proxyPort, retries: 5 });
      if (connectResult) {
        proxy.status = 'active';
      } else {
        proxy.status = 'inactive';
      }
      return proxy
    } catch (err: any) {
      console.error(`failed to reconnect to country ${country}, error: ${err}`);
      return null
    }
  }

  async reconnectRandomProxyToCountry(country: string) {
    console.log('reconnectRandomProxyToCountry', country);
    const len = this.proxies.length;
    const proxyId = Math.floor(Math.random() * len);
    const proxy = this.proxies[proxyId];
    if (!proxy) return null;
    // proxy.node = await buildNodeClient(proxy.port);
    try {
      await proxy.node?.auth();
      proxy.country = country;
      const connectResult = await proxy.node?.quickConnectTo(proxy.country, { proxyPort: proxy.proxyPort, retries: 5 });
      if (connectResult) {
        proxy.status = 'active';
      } else {
        proxy.status = 'inactive';
      }
      return proxy
    } catch (err: any) {
      console.error(`failed to reconnect to country ${country}, error: ${err}`);
      return null
    }
  }
  // Connect to a specific proxy
  async connectProxy(proxyId: string) {
    const proxy = this.getProxyById(proxyId);
    if (!proxy) return;
    // proxy.node = await buildNodeClient(proxy.port);
    try {
      await proxy.node?.auth();
      // await proxy.node?.cancelConnection();
      // const connectResult = false;
      const connectResult = await proxy.node?.quickConnectTo(proxy.country, { proxyPort: proxy.proxyPort, retries: 5 });
      
      if (connectResult) {
        proxy.status = 'active';
      } else {
        proxy.status = 'inactive';
      }
    } catch (error) {
      console.error('Error connecting to proxy:', error);
      proxy.status = 'inactive';
    }
  }
  // Find proxy by ID
  getProxyById(id: string): Proxy | undefined {
    return this.proxies.find(proxy => proxy.id === id);
  }

  // Check individual proxy status
  async setProxyStatus(proxyId: string, status: string) {
    const proxy = this.getProxyById(proxyId);
    console.log(proxy);
    if (!proxy) return null;
    proxy.status = status;
    return proxy;
  }

  async getProxyStatus(proxyId: string) {
    const proxy = this.getProxyById(proxyId);
    console.log(proxy);
    if (!proxy) return null;
    return proxy;
  }

  async checkProxyStatus(proxyId: string): Promise<Proxy | null> {
    const proxy = this.getProxyById(proxyId);
    if (!proxy) return null;

    try {
      const connectionStatus = await proxy.node?.api.connectionStatus();
      proxy.status = connectionStatus?.status === ConnectionStatus.CONNECTED ? 'active' : 'inactive';
      const response = await axios.get('https://api.ipify.org?format=json', {
        proxy: {
          host: proxy.host,
          port: proxy.proxyPort,
          protocol: 'http'
        },
        timeout: 5000
      });
      proxy.status = 'active';
      proxy.lastChecked = new Date();
      return proxy;
    } catch (error) {
      proxy.status = 'inactive';
      proxy.lastChecked = new Date();
      return proxy;
    }
  }

  // Check and reconnect to inactive proxies
  async checkAndReconnect(proxyId: string) {
    const proxy = this.getProxyById(proxyId);
    if (!proxy) return;
    const result = await this.checkProxyStatus(proxyId);
    console.log(`${proxy.host}:${proxy.port} - ${result?.status}`);
    if (result && result.status === 'inactive') await this.connectProxy(proxyId);
  }

  async checkAllProxiesAndReconnect() {
    for (const proxy of this.proxies) {
      await this.checkAndReconnect(proxy.id);
    }
  }
  // Bulk proxy status check
  async checkAllProxiesStatus(): Promise<Proxy[]> {
    const checkedProxies: Proxy[] = [];

    for (const proxy of this.proxies) {
      const checkedProxy = await this.checkProxyStatus(proxy.id);
      if (checkedProxy) checkedProxies.push(checkedProxy);
    }

    return checkedProxies;
  }

  makeProxiesManual() {
    // Read start and end from .env, with fallback default values
    const startId = parseInt(process.env.PROXY_START_ID || '1', 10);
    const endId = parseInt(process.env.PROXY_END_ID || '400', 10);
    const baseHost = process.env.PROXY_HOST || '78.46.80.162';
    const baseProxyPort = parseInt(process.env.PROXY_BASE_PORT || '10000', 10);
    const baseAPIPort = parseInt(process.env.API_BASE_PORT || '20000', 10);
    const defaultCountry = process.env.PROXY_COUNTRY || 'IT';

    // Loop from start to end
    for (let i = startId; i <= endId; i++) {
      const proxyInfo: Proxy = {
        id: i.toString(),
        host: baseHost,
        port: baseAPIPort + i,
        proxyPort: baseProxyPort + i,
        country: defaultCountry,
        status: 'unknown',
        lastChecked: undefined,
        node: undefined
      }
      this.proxies.push(proxyInfo);
    }
  }
  // Remove a proxy
  removeProxy(proxyId: string): boolean {
    const initialLength = this.proxies.length;
    this.proxies = this.proxies.filter(proxy => proxy.id !== proxyId);
    return initialLength !== this.proxies.length;
  }
}

export { ProxyService, Proxy };
