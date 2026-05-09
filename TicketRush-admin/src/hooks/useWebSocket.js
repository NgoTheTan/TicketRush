// src/hooks/useWebSocket.js
// STOMP WebSocket hook cho seat realtime updates.
// Dùng @stomp/stompjs + sockjs-client.
// Backend endpoint: /ws (configured via VITE_WS_URL)

import { useEffect, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws';

/**
 * useWebSocket — subscribe tới một STOMP topic và nhận messages.
 *
 * @param {string|null} topic   - Topic để subscribe, ví dụ "/topic/seats/1"
 * @param {function}    onMessage - Callback khi nhận message: (payload: object) => void
 * @param {boolean}     enabled   - Có kết nối hay không (mặc định true)
 */
export function useWebSocket(topic, onMessage, enabled = true) {
  const clientRef  = useRef(null);
  const subRef     = useRef(null);
  const onMsgRef   = useRef(onMessage); // avoid reconnect on every render

  // Keep callback ref fresh
  useEffect(() => { onMsgRef.current = onMessage; }, [onMessage]);

  const connect = useCallback(() => {
    if (!topic || !enabled) return;

    // Lazy import để tránh lỗi khi package chưa install
    Promise.all([
      import('@stomp/stompjs'),
      import('sockjs-client'),
    ]).then(([{ Client }, { default: SockJS }]) => {
      const client = new Client({
        webSocketFactory: () => new SockJS(WS_URL),
        reconnectDelay: 5000,
        onConnect: () => {
          subRef.current = client.subscribe(topic, (frame) => {
            try {
              const payload = JSON.parse(frame.body);
              onMsgRef.current?.(payload);
            } catch (e) {
              console.warn('[WS] Failed to parse message', e);
            }
          });
        },
        onStompError: (frame) => {
          console.warn('[WS] STOMP error', frame.headers?.message);
        },
        onDisconnect: () => {
          console.debug('[WS] Disconnected from', topic);
        },
      });

      client.activate();
      clientRef.current = client;
    }).catch(err => {
      // @stomp/stompjs chưa install — warn và graceful degrade
      console.warn('[WS] WebSocket packages not available:', err.message,
        '\nRun: npm install @stomp/stompjs sockjs-client');
    });
  }, [topic, enabled]);

  useEffect(() => {
    connect();
    return () => {
      subRef.current?.unsubscribe();
      if (clientRef.current?.active) {
        clientRef.current.deactivate();
      }
      clientRef.current = null;
    };
  }, [connect]);
}
