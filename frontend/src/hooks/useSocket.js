import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

let socketInstance = null;

export function useSocket() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const ref = useRef(null);

  useEffect(() => {
    if (!token) return;
    if (socketInstance) { ref.current = socketInstance; return; }

    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => console.log('[WS] connected'));
    socket.on('disconnect', () => console.warn('[WS] disconnected'));

    socket.on('critical_request', ({ request }) => {
      toast.error(`🚨 Критичний запит: ${request.resource_name || 'новий запит'}`, {
        duration: 8000,
        style: { background: '#450a0a', color: '#fca5a5', border: '1px solid #991b1b' },
      });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    socket.on('request_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    socket.on('stock_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    });

    socketInstance = socket;
    ref.current = socket;

    return () => {};
  }, [token, queryClient]);

  return ref.current;
}
