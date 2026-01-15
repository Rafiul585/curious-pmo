import { useEffect, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const socket: Socket | null = useMemo(() => {
    const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';
    return io(url, { transports: ['websocket'] });
  }, []);

  useEffect(() => {
    return () => {
      socket?.disconnect();
    };
  }, [socket]);

  return socket;
};
