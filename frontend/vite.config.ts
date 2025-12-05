import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// On macOS, Docker host networking doesn't work, so we need to connect through the container
// Option 1: Use the proxy server (run: node proxy-server.js)
// Option 2: Use direct connection if port 8933 is accessible
function getJstzTarget() {
  // Try proxy server first (if running), then fall back to direct connection
  return process.env.JSTZ_PROXY_PORT 
    ? `http://127.0.0.1:${process.env.JSTZ_PROXY_PORT}`
    : 'http://127.0.0.1:8933'
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/jstz': {
        target: 'http://127.0.0.1:8934', // Use proxy server port (run: node proxy-server.js)
        // Or use direct: 'http://127.0.0.1:8933' if port is accessible
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/jstz/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
})


