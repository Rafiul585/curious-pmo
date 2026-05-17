import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { selectAccessToken } from '../store/slices/authSlice';
import { api } from '../utils/api';

const WS_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api')
  .replace(/^http/, 'ws')
  .replace(/\/api\/?$/, '');

/**
 * Opens a persistent WebSocket to /ws/notifications/ and invalidates
 * the Notification RTK Query cache when the server pushes a new_notification
 * event.  Reconnects automatically after 5 s on disconnect.
 */
export const useSocket = () => {
  const token = useAppSelector(selectAccessToken);
  const dispatch = useAppDispatch();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a stable ref to the latest token so the reconnect closure isn't stale
  const tokenRef = useRef(token);
  tokenRef.current = token;

  useEffect(() => {
    if (!token) return;

    const connect = () => {
      const currentToken = tokenRef.current;
      if (!currentToken) return;

      const ws = new WebSocket(`${WS_BASE}/ws/notifications/?token=${currentToken}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.type === 'new_notification') {
            dispatch(api.util.invalidateTags(['Notification']));
          }
        } catch {
          // Ignore malformed frames
        }
      };

      ws.onclose = () => {
        reconnectRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close(); // triggers onclose → reconnect
      };
    };

    connect();

    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [token, dispatch]);
};
