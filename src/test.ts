import http from 'http';
import httpProxy from 'http-proxy';
import { buildNodeClient } from './tools/tequila';
import { log } from './tools/common';
import axios, { AxiosRequestConfig }  from 'axios';

const PROXY_PORT = 10005;

// Create a proxy server
const proxy = httpProxy.createProxyServer({});

// Create a server
const server = http.createServer(async (req, res) => {
    // Extract host and port from the request
    const host = req.headers.host; // e.g., "example.com:80"
    const target = `http://${host}`; // Construct target URL
    console.log('Request Method:', req.method);
    console.log('Request Headers:', req.headers);

    const node = await buildNodeClient(2000); // Initialize node client
    try {
        await node.quickConnectTo("IT", { proxyPort: PROXY_PORT, retries: 3 });
        const {host, otherHeaders} = req.headers;
        // Proxy the request
        proxy.web(req, res, {
            target: `http://95.217.234.2:${PROXY_PORT}`,
            changeOrigin: false, // Do not change the origin of the host header
            toProxy: true,
            prependPath: false
        }, (error: Error) => {
            console.error('Proxy error:', error);
            res.writeHead(502, { 'Content-Type': 'text/plain' });
            res.end('Bad Gateway');
        });
    } catch (error) {
        console.error('Connection error:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    } finally {
        // await node.cancelConnection(); // Ensure the connection is canceled
        log(`connection closed`);
    }
});

// Listen on a specific port
const PORT = 3005; // Change to your desired port

server.listen(PORT, async () => {
    const url = `http://136.243.175.139:8080/api/category`; // Replace with your actual URL
        
        try {
            const config: AxiosRequestConfig = {
            };
        
            const response = await axios.get(url, config);
    
            console.log('Response data:', response.data);
        } catch (error) {
            console.error('Error occurred:', error);
        }
});