import { AppNotification } from '../types/index.js';
import { TOKEN_STORAGE_KEY } from './apiFetch.js';

export type NotificationSocketEvent =
  | { type: 'notifications:init'; notifications: AppNotification[]; unreadCount: number }
  | { type: 'notification:created'; payload: AppNotification }
  | { type: 'notification:read'; payload: { id: string } }
  | { type: 'notification:read_all'; payload: { userId?: string } };

interface ConnectOptions {
  onEvent: (evt: NotificationSocketEvent) => void;
  onStatusChange?: (connected: boolean) => void;
}

export function createNotificationSocketClient(opts: ConnectOptions) {
  let ws: WebSocket | null = null;
  let closedManually = false;
  let retryAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (closedManually || typeof window === 'undefined') return;
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return;

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws/notifications?token=${encodeURIComponent(token)}`;

    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        retryAttempt = 0;
        opts.onStatusChange?.(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as NotificationSocketEvent;
          if (parsed && parsed.type) {
            opts.onEvent(parsed);
          }
        } catch {
          // Ignore malformed frame
        }
      };

      ws.onclose = (ev) => {
        opts.onStatusChange?.(false);
        ws = null;
        if (closedManually || ev.code === 4001) return;
        const delayMs = Math.min(15000, 1500 * Math.pow(2, retryAttempt));
        retryAttempt += 1;
        reconnectTimer = setTimeout(connect, delayMs);
      };

      ws.onerror = () => {
        opts.onStatusChange?.(false);
      };
    } catch {
      opts.onStatusChange?.(false);
    }
  };

  connect();

  return {
    disconnect: () => {
      closedManually = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws) {
        try {
          ws.close();
        } catch {
          // ignore
        }
        ws = null;
      }
      opts.onStatusChange?.(false);
    }
  };
}
