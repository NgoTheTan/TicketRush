// src/hooks/useWebSocket.js
// STOMP WebSocket hook cho seat & order realtime updates.
// Dùng @stomp/stompjs + sockjs-client.
// Backend endpoint: /ws (configured via VITE_WS_URL)

import { useEffect, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws';

/**
 * useWebSocket — subscribe tới một STOMP topic và nhận messages.
 *
 * @param {string|null} topic   - Topic để subscribe, ví dụ "/topic/admin/seats/1"
 * @param {function}    onMessage - Callback khi nhận message: (payload: object) => void
 * @param {boolean}     enabled   - Có kết nối hay không (mặc định true)
 * @param {function}    onConnect - Callback khi kết nối thành công (optional)
 * @returns {{ connected: boolean }} - Trạng thái kết nối
 */
export function useWebSocket(topic, onMessage, enabled = true, onConnect) {
  const clientRef  = useRef(null);
  const subRef     = useRef(null);
  const onMsgRef   = useRef(onMessage);
  const onConRef   = useRef(onConnect);
  const connectedRef = useRef(false);

  // Keep callback refs fresh
  useEffect(() => { onMsgRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onConRef.current = onConnect; }, [onConnect]);

  const connect = useCallback(() => {
    if (!topic || !enabled) return;

    Promise.all([
      import('@stomp/stompjs'),
      import('sockjs-client'),
    ]).then(([{ Client }, { default: SockJS }]) => {
      if (clientRef.current?.active) return; // already connected

      const client = new Client({
        webSocketFactory: () => new SockJS(WS_URL),
        reconnectDelay: 5000,
        onConnect: () => {
          connectedRef.current = true;
          // Notify caller immediately on connect
          onConRef.current?.();
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
          connectedRef.current = false;
          console.debug('[WS] Disconnected from', topic);
        },
      });

      client.activate();
      clientRef.current = client;
    }).catch(err => {
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
      connectedRef.current = false;
    };
  }, [connect]);
}

/**
 * useMultiWebSocket — subscribe nhiều topics cùng lúc trên một STOMP connection.
 *
 * @param {string[]} topics   - Danh sách topics
 * @param {function} onMessage - Callback: (topic: string, payload: object) => void
 * @param {boolean}  enabled
 */
export function useMultiWebSocket(topics, onMessage, enabled = true) {
  const clientRef = useRef(null);
  const subsRef   = useRef([]);
  const onMsgRef  = useRef(onMessage);

  useEffect(() => { onMsgRef.current = onMessage; }, [onMessage]);

  const topicsKey = topics.join(',');

  useEffect(() => {
    if (!enabled || !topics.length) return;

    Promise.all([
      import('@stomp/stompjs'),
      import('sockjs-client'),
    ]).then(([{ Client }, { default: SockJS }]) => {
      const client = new Client({
        webSocketFactory: () => new SockJS(WS_URL),
        reconnectDelay: 5000,
        onConnect: () => {
          // Unsubscribe từ subs cũ nếu có
          subsRef.current.forEach(s => s.unsubscribe?.());
          subsRef.current = [];

          topics.forEach(topic => {
            const sub = client.subscribe(topic, (frame) => {
              try {
                const payload = JSON.parse(frame.body);
                onMsgRef.current?.(topic, payload);
              } catch (e) {
                console.warn('[WS] Parse error on topic', topic, e);
              }
            });
            subsRef.current.push(sub);
          });
        },
        onStompError: (frame) => {
          console.warn('[WS] STOMP error', frame.headers?.message);
        },
      });

      client.activate();
      clientRef.current = client;
    }).catch(err => {
      console.warn('[WS] WebSocket not available:', err.message);
    });

    return () => {
      subsRef.current.forEach(s => s.unsubscribe?.());
      subsRef.current = [];
      if (clientRef.current?.active) clientRef.current.deactivate();
      clientRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicsKey, enabled]);
}
