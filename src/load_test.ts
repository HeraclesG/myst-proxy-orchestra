import axios, { AxiosResponse, AxiosError } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as fs from 'fs';
import * as path from 'path';
import { BOOKING_CRAWL_URL } from './constant'; // Import your constant
import { EventEmitter } from 'events';

// Enhanced Proxy Request Interface
interface ProxyRequestConfig {
    url: string;
    method?: 'get' | 'post' | 'put' | 'delete';
    proxies?: string[];
    proxyFilePath?: string;
    timeout?: number;
    concurrency?: number;
    maxRequests?: number;
    payload?: any;
    headers?: Record<string, string>;
}

// Detailed Proxy Result Interface
interface ProxyRequestResult {
    proxy: string;
    success: boolean;
    response?: AxiosResponse;
    error?: string;
    responseTime?: number;
    timestamp?: number;
    requestId: string;
}

// Advanced Async Proxy Requester
class AsyncProxyRequester extends EventEmitter {
    private config: ProxyRequestConfig;
    private proxies: string[];
    private requestQueue: string[] = [];
    private activeRequests: Set<string> = new Set();
    private completedRequests: ProxyRequestResult[] = [];
    private requestCounter = 0;

    constructor(config: ProxyRequestConfig) {
        super();
        this.config = {
            method: 'get',
            timeout: 10000,
            concurrency: 5,
            maxRequests: 100,
            headers: {},
            ...config
        };

        // Load proxies
        this.proxies = config.proxies || this.loadProxiesFromFile(
            config.proxyFilePath || path.join(__dirname, 'proxies.txt')
        );

        // Initialize request queue
        // this.validateProxies(this.proxies).then(validProxies => {
        //     this.requestQueue = [...validProxies];
        //     // Start processing requests after validating proxies
        //     this.processRequestQueue();
        // });
        // this.requestQueue = [...this.proxies];
    }
    private async validateProxies(proxies: string[]): Promise<string[]> {
        const validProxies: string[] = [];

        for (const proxy of proxies) {
            try {
                const proxyAgent = new HttpsProxyAgent(proxy);
                await axios.get(this.config.url, {
                    httpsAgent: proxyAgent,
                    proxy: false,
                    timeout: this.config.timeout
                });
                validProxies.push(proxy);
            } catch (error) {
                console.error(`Invalid proxy: ${proxy}`);
            }
        }
        console.log('Valid Proxies:', validProxies);
        return validProxies;
    }
    // Load proxies from file
    private loadProxiesFromFile(filePath: string): string[] {
        try {
            return fs.readFileSync(filePath, 'utf-8')
                .split('\n')
                .filter(proxy => proxy.trim() !== '');
        } catch (error) {
            console.error('Error loading proxies:', error);
            return [];
        }
    }

    // Generate unique request ID
    private generateRequestId(): string {
        return `req_${Date.now()}_${this.requestCounter++}`;
    }

    // Async request sender with advanced error handling
    private async sendRequest(proxy: string, requestId: string): Promise<ProxyRequestResult> {
        const startTime = Date.now();

        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            
            const response = await axios({
                url: this.config.url,
                method: this.config.method,
                httpsAgent: proxyAgent,
                proxy: false,
                timeout: this.config.timeout,
                data: this.config.payload,
                headers: {
                    ...this.config.headers,
                    'User-Agent': this.generateUserAgent(),
                    'X-Request-ID': requestId
                }
            });

            const result: ProxyRequestResult = {
                proxy,
                success: true,
                response,
                responseTime: Date.now() - startTime,
                timestamp: Date.now(),
                requestId
            };

            // Emit success event
            this.emit('requestSuccess', result);

            return result;
        } catch (error) {
            const axiosError = error as AxiosError;
            
            const result: ProxyRequestResult = {
                proxy,
                success: false,
                error: axiosError.message,
                responseTime: Date.now() - startTime,
                timestamp: Date.now(),
                requestId
            };

            // Emit failure event
            this.emit('requestFailure', result);

            return result;
        }
    }

    // Generate random user agent
    private generateUserAgent(): string {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            'Mozilla/5.0 (X11; Linux x86_64)'
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    // Advanced async request processor
    private async processRequestQueue(): Promise<void> {
        // Check if we've reached max requests or queue is empty
        if (this.completedRequests.length >= (this.config.maxRequests || 100) || 
            this.requestQueue.length === 0) {
            return;
        }

        // Determine how many more requests we can send
        const availableSlots = (this.config.concurrency || 5) - this.activeRequests.size;
        
        // Process available slots
        for (let i = 0; i < availableSlots; i++) {
            // If no more proxies in queue, break
            if (this.requestQueue.length === 0) break;

            // Get next proxy
            const proxy = this.requestQueue.shift();
            if (!proxy) continue;

            // Generate unique request ID
            const requestId = this.generateRequestId();
            
            // Mark request as active
            this.activeRequests.add(requestId);

            // Send request
            const requestPromise = this.sendRequest(proxy, requestId)
                .then(result => {
                    // Remove from active requests
                    this.activeRequests.delete(requestId);
                    
                    // Store completed request
                    this.completedRequests.push(result);

                    // Recursively process queue
                        this.requestQueue.push(proxy);
                    this.processRequestQueue();

                    return result;
                })
                .catch(error => {
                    // Remove from active requests
                    this.activeRequests.delete(requestId);
                    
                    // Recursively process queue
                        this.requestQueue.push(proxy);
                    this.processRequestQueue();

                    throw error;
                });

            // Optional: Add proxy back to queue if needed
        }
    }

    // Main execution method
    getResultsByProxy(): Record<string, ProxyRequestResult[]> {
        return this.completedRequests.reduce((acc, result) => {
            if (!acc[result.proxy]) {
                acc[result.proxy] = [];
            }
            acc[result.proxy].push(result);
            return acc;
        }, {} as Record<string, ProxyRequestResult[]>);
    }


    async execute(): Promise<ProxyRequestResult[]> {
        const validProxies = await this.validateProxies(this.proxies);
    
    // Set the valid proxies to the request queue
    this.requestQueue = validProxies;
        return new Promise((resolve, reject) => {
            this.processRequestQueue()
                .then(() => {
                    const waitForCompletion = setInterval(() => {
                        if (this.activeRequests.size === 0) {
                            clearInterval(waitForCompletion);
                            resolve(this.completedRequests);
                        }
                    }, 100);
                })
                .catch(reject);
        });
    }

    getDetailedSummary(): {
        overallSummary: {
            total: number;
            successful: number;
            failed: number;
            successRate: number;
        };
        proxyPerformance: Record<string, ProxyRequestResult[]>;
    } {
        const resultsByProxy = this.getResultsByProxy();
        const proxyPerformance: Record<string, ProxyRequestResult[]> = {};
        for (const proxy in resultsByProxy) {
            proxyPerformance[proxy] = resultsByProxy[proxy];
        }

        const successfulRequests = this.completedRequests.filter(r => r.success);
        const failedRequests = this.completedRequests.filter(r => !r.success);

        return {
            overallSummary: {
                total: this.completedRequests.length,
                successful: successfulRequests.length,
                failed: failedRequests.length,
                successRate: (successfulRequests.length / this.completedRequests.length) * 100
            },
            proxyPerformance
        };
    }
    async visualizeResults() {
        const { overallSummary, proxyPerformance } = this.getDetailedSummary();
        console.log('=== Proxy Request Summary ===');
        console.log(`Total Requests: ${overallSummary.total}`);
        console.log(`Successful Requests: ${overallSummary.successful}`);
        console.log(`Failed Requests: ${overallSummary.failed}`);
        console.log(`Success Rate: ${overallSummary.successRate.toFixed(2)}%`);
    
        // Visualize results for each proxy
        for (const proxy in proxyPerformance) {
            console.log(`\n=== Proxy: ${proxy} ===`);
            const proxyResults = proxyPerformance[proxy];
    
            // Calculate success and failure counts
            const successfulResults = proxyResults.filter(result => result.success);
            const failedResults = proxyResults.filter(result => !result.success);
    
            console.log(`Total Requests: ${proxyResults.length}`);
            console.log(`Successful Requests: ${successfulResults.length}`);
            console.log(`Failed Requests: ${failedResults.length}`);
            console.log(`Success Rate: ${(successfulResults.length / proxyResults.length * 100).toFixed(2)}%`);
    
            proxyResults.forEach((result: ProxyRequestResult) => {
                console.log(`Request ID: ${result.requestId}, Status: ${result.success ? 'Success' : 'Failure'}, Response Time: ${result.responseTime}ms`);
                if (result.error) {
                    console.error(`Error: ${result.error}`);
                }
            });
        }
    }

    // Get summary of results
    getSummary() {
        const successfulRequests = this.completedRequests.filter(r => r.success);
        const failedRequests = this.completedRequests.filter(r => !r.success);

        return {
            total: this.completedRequests.length,
            successful: successfulRequests.length,
            failed: failedRequests.length,
            successRate: (successfulRequests.length / this.completedRequests.length) * 100
        };
    }
}

// Advanced Usage Example
async function main() {
    const proxies: string[] = [];
    for( let i = 1; i < 200; i++ ) {
        proxies.push(`http://78.46.80.162:${10000+i}`)
    }
    const requester = new AsyncProxyRequester({
        url: BOOKING_CRAWL_URL,
        method: 'get',
        proxies: proxies,
        timeout: 5000,
        concurrency: 199,  // Concurrent requests
        maxRequests: 1000   // Total requests to make
    });

    try {
        // Execute requests
        const results = await requester.execute();

        // Get summary
        requester.visualizeResults();

    } catch (error) {
        console.error('Async Proxy Request Error:', error);
    }
}

// Execute the script
main().catch(console.error);
