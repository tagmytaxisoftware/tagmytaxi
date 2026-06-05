/**
 * @fileoverview Socket.IO gateway for real-time driver location tracking.
 *
 * ## Namespace: /tracking
 *
 * **Client events (driver → server)**
 * - `driver:location_update` — driver app emits GPS updates every ~2 seconds
 *
 * **Client events (passenger → server)**
 * - `ride:subscribe` — passenger app subscribes to updates for a specific ride
 * - `ride:unsubscribe` — passenger app unsubscribes
 *
 * **Server events (server → passenger)**
 * - `ride:location` — emitted to the passenger's room on every driver update
 *
 * All connections are authenticated via JWT on the Socket.IO handshake.
 * The `auth.token` field in the handshake options must contain a valid Bearer token.
 */

import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

import type { JWTPayload } from '@tagmytaxi/shared';

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'changeme-in-production';

export class LocationGateway {
  private io: SocketIOServer;

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/ws',
      transports: ['websocket', 'polling'],
    });
  }

  initialize(): void {
    const trackingNs = this.io.of('/tracking');

    // Authenticate every connection on the /tracking namespace
    trackingNs.use((socket, next) => {
      const token = socket.handshake.auth['token'] as string | undefined;
      if (!token) {
        next(new Error('Authentication token required'));
        return;
      }
      try {
        const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
        socket.data['user'] = payload;
        next();
      } catch {
        next(new Error('Invalid or expired token'));
      }
    });

    trackingNs.on('connection', (socket) => {
      const user = socket.data['user'] as JWTPayload;
      console.warn(`[ws] ${user.role} connected: ${socket.id}`);

      // Driver: publish location updates
      socket.on('driver:location_update', (update: unknown) => {
        const data = update as { activeTripId?: string };
        if (data.activeTripId) {
          trackingNs.to(`ride:${data.activeTripId}`).emit('ride:location', update);
        }
      });

      // Passenger: subscribe to a specific ride's location stream
      socket.on('ride:subscribe', async (rideId: string) => {
        await socket.join(`ride:${rideId}`);
        socket.emit('ride:subscribed', { rideId });
      });

      socket.on('ride:unsubscribe', async (rideId: string) => {
        await socket.leave(`ride:${rideId}`);
      });

      socket.on('disconnect', (reason) => {
        console.warn(`[ws] Socket disconnected: ${socket.id} (${reason})`);
      });
    });

    console.warn('[ws] LocationGateway initialized on /tracking namespace');
  }
}
