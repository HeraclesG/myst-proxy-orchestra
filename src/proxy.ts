import http from 'http';
import httpProxy from 'http-proxy';
import { buildNodeClient } from './tools/tequila';
import { log } from './tools/common';

const PROXY_PORT = 10003;

// Create a proxy server
const proxy = httpProxy.createProxyServer({});

// Create a server
const server = http.createServer(async (req, res) => {
    // Extract host and port from the request
    const host = req.headers.host; // e.g., "example.com:80"
    const target = `http://${host}`; // Construct target URL
    console.log('Request Method:', req.method);
    console.log('Request Headers:', req.headers);
    proxy.web(req, res, { target: target, changeOrigin: false }, (error: any) => {
        console.error('Proxy error:', error);
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway');
    });
});

// Listen on a specific port
const PORT = 3001; // Change to your desired port
server.listen(PORT, () => {
    console.log(`Proxy server is running on http://localhost:${PORT}`);
});