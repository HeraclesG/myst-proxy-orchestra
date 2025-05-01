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
  status: ConnectionStatus;
  lastChecked?: Date;
  node: NodeClient | undefined;
  is_running: boolean;
}

class ProxyService {
  public proxies: Proxy[] = [];

  // Add a new proxy
  addProxy(proxyData: Omit<Proxy, 'id' | 'status' | 'lastChecked' | 'node'>): Proxy {
    const newProxy: Proxy = {
      id: Date.now().toString(),
      status: ConnectionStatus.NOT_CONNECTED,
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
    proxy.status = ConnectionStatus.NOT_CONNECTED;
  }

  // Connect to all proxies
  async connectAllProxies() {
    const connectPromises = this.proxies.map(async (proxy) => {
      try {
          // Ensure node exists before attempting to authenticate
          if (!proxy.node) {
              console.warn(`No node found for proxy ${proxy.id}`);
              return null;
          }
          // await proxy.node.auth();
          // await proxy.node.cancelConnection();
          // return proxy;
          const result = await this.checkProxyStatus(proxy.id);

          // Connect if inactive
          if(!result) return null;
          if (result && result.status === ConnectionStatus.NOT_CONNECTED) {
            await this.connectProxy(proxy.id);
            return proxy;
          } else {
            return proxy;
          }
      } catch (error) {
          console.error(`Error processing proxy ${proxy.id}:`, error);
          return null;
      }
    });
    Promise.all(connectPromises);
  }


  // Reconnect to a specific proxy
  async reconnectProxy(proxyId: string) {
    console.log('reconnectProxy', proxyId);
    const proxy = this.getProxyById(proxyId);
    if (!proxy) return null;
    // proxy.node = await buildNodeClient(proxy.port);
    try {
      await proxy.node?.auth();
      proxy.status = ConnectionStatus.CONNECTING;
      const connectResult = await proxy.node?.reconnectToCurrent(proxy.proxyPort);
      if (connectResult) {
        proxy.status = connectResult;
        return proxy
      } else {
        proxy.status = ConnectionStatus.NOT_CONNECTED;
        return await this.reconnectCountryProxy(proxy.id, proxy.country);
         
      }
    } catch (err: any) {
      proxy.status = ConnectionStatus.NOT_CONNECTED;
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
      proxy.status = ConnectionStatus.CONNECTING;
      const connectResult = await proxy.node?.quickConnectTo(proxy.country, { proxyPort: proxy.proxyPort, retries: 5 });
      if (connectResult) {
        proxy.status = connectResult;
      } else {
        proxy.status = ConnectionStatus.NOT_CONNECTED;
      }
      return proxy
    } catch (err: any) {
      proxy.status = ConnectionStatus.NOT_CONNECTED;
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
      proxy.status = ConnectionStatus.CONNECTING;
      const connectResult = await proxy.node?.quickConnectTo(proxy.country, { proxyPort: proxy.proxyPort, retries: 5 });
      if (connectResult) {
        proxy.status = connectResult;
      } else {
        proxy.status = ConnectionStatus.NOT_CONNECTED;
      }
      return proxy
    } catch (err: any) {
      proxy.status = ConnectionStatus.NOT_CONNECTED;
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
      proxy.status = ConnectionStatus.CONNECTING;
      const connectResult = await proxy.node?.quickConnectTo(proxy.country, { proxyPort: proxy.proxyPort, retries: 5 });
      console.log(`Connecting Result to proxy. ${proxy.host}:${proxy.port} ${connectResult}`);
      if (connectResult) {
        proxy.status = connectResult;
      } else {
        proxy.status = ConnectionStatus.NOT_CONNECTED;
      }
    } catch (error) {
      console.error('Error connecting to proxy:', error);
      proxy.status = ConnectionStatus.NOT_CONNECTED;
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
    proxy.status = status as ConnectionStatus;
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
      // const connectionStatus = await proxy.node?.api.connectionStatus();
      // proxy.status = connectionStatus?.status as ConnectionStatus;
      if (proxy.status !== ConnectionStatus.CONNECTING) {
        const response = await axios.get('https://api.ipify.org?format=json', {
          proxy: {
            host: proxy.host,
            port: proxy.proxyPort,
            protocol: 'http'
          },
          timeout: 5000
        });
        if (response.status === 200) {
          proxy.status = ConnectionStatus.CONNECTED;
        } else {
          proxy.status = ConnectionStatus.NOT_CONNECTED;
        }
      }
      console.log(`${proxy.host}:${proxy.port} - ${proxy.status}`);
      proxy.lastChecked = new Date();
      return proxy;
    } catch (error) {
      console.log(`${proxy.host}:${proxy.port} - Error Checking Status: ${error}`);
      proxy.status = ConnectionStatus.NOT_CONNECTED;
      proxy.lastChecked = new Date();
      return proxy;
    }
  }

  // Check and reconnect to inactive proxies

  async getProposals(count: number) {
    
      const node = await buildNodeClient(20001);
      await node.auth();
      let res = false;
      while(!res){
        try {
          const countries = await node?.getProposals(count)
          console.log(countries)
          return countries
        } catch (err: any) {
            console.log(`Fetch proposal failed`);
            res = false
        }
    }
    
  }
  
  async checkAndReconnect(proxyId: string) {
    const proxy = this.getProxyById(proxyId);
    if (!proxy) return;
    const result = await this.checkProxyStatus(proxyId);
    // console.log(`${proxy.host}:${proxy.port} - ${result?.status}`);
    if (result && result.status === ConnectionStatus.NOT_CONNECTED) await this.connectProxy(proxyId);
  }

  async checkAllProxiesAndReconnect() {
    const checkPromises = this.proxies.map(proxy => 
      this.checkAndReconnect(proxy.id).catch(error => {
          console.error(`Error checking proxy ${proxy.id}:`, error);
          return null;
      })
    );
    Promise.all(checkPromises);
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

  async makeProxiesManual() {
    // Read start and end from .env, with fallback default values
    dotenv.config();
    const startId = parseInt(process.env.PROXY_START_ID || '1', 10);
    const endId = parseInt(process.env.PROXY_END_ID || '400', 10);
    const baseHost = process.env.PROXY_HOST || '78.46.80.162';
    const baseProxyPort = parseInt(process.env.PROXY_BASE_PORT || '10000', 10);
    const baseAPIPort = parseInt(process.env.API_BASE_PORT || '20000', 10);
    const defaultCountry = process.env.PROXY_COUNTRY || 'IT';
    const countries = await this.getProposals(endId - startId + 1)
      
    
    let currentCountryIndex = 0;
    let currentCountryCount = 0;
    // Loop from start to end
    for (let i = startId; i <= endId; i++) {
      const proxyInfo: Proxy = {
        id: i.toString(),
        host: baseHost,
        port: baseAPIPort + i,
        proxyPort: baseProxyPort + i,
        country: countries?.countries[currentCountryIndex].country || defaultCountry,
        status: ConnectionStatus.NOT_CONNECTED,
        lastChecked: undefined,
        node: undefined,
        is_running: false
      }
      this.proxies.push(proxyInfo);
      currentCountryCount++;
      if (currentCountryCount >= (countries?.countries[currentCountryIndex]?.distCont ?? 0)) {
        currentCountryIndex = (currentCountryIndex + 1) % (countries?.countries?.length ?? 1);
        currentCountryCount = 0;
      }
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
