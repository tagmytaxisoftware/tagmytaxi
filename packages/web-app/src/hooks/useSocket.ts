/**
 * @fileoverview Socket.IO lifecycle hook for the passenger web app.
 * Manages connection, authentication, and graceful cleanup.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  /** JWT access token for handshake authentication */
  token: string | null;
  /** Namespace path — defaults to /tracking */
  namespace?: string;
}

interface UseSocketResult {
  socket: Socket | null;
  connected: boolean;
}

/**
 * Custom hook that establishes a Socket.IO connection to the tracking namespace.
 * Reconnects automatically when the token changes.
 * Disconnects cleanly on unmount.
 */
export function useSocket({ token, namespace = '/tracking' }: UseSocketOptions): UseSocketResult {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = io(`${process.env['NEXT_PUBLIC_API_URL'] ?? ''}${namespace}`, {
      path: '/ws',
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    return (): void => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token, namespace]);

  return { socket: socketRef.current, connected };
}
