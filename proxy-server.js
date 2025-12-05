#!/usr/bin/env node
/**
 * Simple proxy server to forward requests to Jstz sandbox running in Docker
 * This works around the macOS Docker host networking limitation
 * 
 * Usage: node proxy-server.js
 * Then update frontend/vite.config.ts to use http://127.0.0.1:8934 as the proxy target
 */

import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PROXY_PORT = 8934;
const CONTAINER_PORT = 8933;

async function getContainerId() {
  try {
    const { stdout } = await execAsync('docker ps --filter "ancestor=ghcr.io/trilitech/jstz-cli:20240320" --format "{{.ID}}" | head -1');
    const containerId = stdout.trim();
    if (!containerId) {
      throw new Error('No Jstz container found');
    }
    return containerId;
  } catch (error) {
    throw new Error(`Failed to find container: ${error.message}`);
  }
}

function forwardRequest(containerId, req, res) {
  // Get request body if present
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      // Build the curl command to make the request inside the container
      const method = req.method || 'GET';
      const url = `http://127.0.0.1:${CONTAINER_PORT}${req.url}`;
      
      let curlCmd = `curl -s -X ${method}`;
      
      // Add headers
      if (req.headers['content-type']) {
        curlCmd += ` -H "Content-Type: ${req.headers['content-type']}"`;
      }
      
      // Add body for POST/PUT requests
      if (body && (method === 'POST' || method === 'PUT')) {
        const escapedBody = body.replace(/'/g, "'\\''").replace(/"/g, '\\"');
        curlCmd += ` -d '${escapedBody}'`;
      }
      
      curlCmd += ` ${url}`;
      
      const { stdout, stderr } = await execAsync(`docker exec ${containerId} ${curlCmd}`);
      
      if (stderr && !stdout) {
        throw new Error(stderr);
      }
      
      try {
        const data = JSON.parse(stdout);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(stdout);
      }
    } catch (error) {
      console.error('Proxy error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy error', details: error.message }));
    }
  });
}

async function startProxy() {
  try {
    const containerId = await getContainerId();
    console.log(`Found Jstz container: ${containerId}`);
    console.log(`Starting proxy server on port ${PROXY_PORT}...`);
    console.log(`Forwarding to container ${containerId} on port ${CONTAINER_PORT}`);
    
    const server = http.createServer((req, res) => {
      forwardRequest(containerId, req, res);
    });

    server.listen(PROXY_PORT, () => {
      console.log(`Proxy server running on http://127.0.0.1:${PROXY_PORT}`);
      console.log('Update frontend/vite.config.ts to use this port as the proxy target');
    });
  } catch (error) {
    console.error('Failed to start proxy:', error.message);
    console.error('Make sure the Jstz sandbox is running: jstz sandbox start');
    process.exit(1);
  }
}

startProxy();

