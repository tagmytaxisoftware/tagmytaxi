/**
 * @fileoverview HTTP server entry point.
 * Binds the Express app and Socket.IO server to a port.
 */

import { createServer } from 'http';

import { createApp } from './app';
import { LocationGateway } from './websocket/LocationGateway';

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
const app = createApp();
const httpServer = createServer(app);

const locationGateway = new LocationGateway(httpServer);
locationGateway.initialize();

httpServer.listen(PORT, () => {
  console.warn(`[api] Server listening on port ${PORT}`);
  console.warn(`[api] Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
});

// Graceful shutdown
const shutdown = (): void => {
  console.warn('[api] Shutting down gracefully...');
  httpServer.close(() => {
    console.warn('[api] HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.warn('[api] Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
