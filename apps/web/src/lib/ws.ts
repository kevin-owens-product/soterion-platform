type MessageHandler = (data: unknown) => void;

interface WSClientOptions {
  url: string;
  onMessage: MessageHandler;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: Event) => void;
  maxRetries?: number;
}

export class WSClient {
  private ws: WebSocket | null = null;
  private retryCount = 0;
  private maxRetries: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;

  private url: string;
  private onMessage: MessageHandler;
  private onOpen?: () => void;
  private onClose?: () => void;
  private onError?: (err: Event) => void;

  constructor(options: WSClientOptions) {
    this.url = options.url;
    this.onMessage = options.onMessage;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.onError = options.onError;
    this.maxRetries = options.maxRetries ?? 3;
  }

  connect(): void {
    this.intentionallyClosed = false;
    this.retryCount = 0;
    this._connect();
  }

  private _connect(): void {
    try {
      const token = localStorage.getItem("soterion_token");
      const urlWithToken = token
        ? `${this.url}?token=${encodeURIComponent(token)}`
        : this.url;

      this.ws = new WebSocket(urlWithToken);

      this.ws.onopen = () => {
        this.retryCount = 0;
        this.onOpen?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const raw: unknown = JSON.parse(event.data as string);
          const data = camelizeKeys(raw);
          this.onMessage(data);
        } catch {
          console.warn("[WS] Failed to parse message:", event.data);
        }
      };

      this.ws.onclose = () => {
        this.onClose?.();
        if (!this.intentionallyClosed) {
          this._scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        this.onError?.(err);
      };
    } catch (err) {
      console.warn("[WS] Failed to create WebSocket connection:", err);
      if (!this.intentionallyClosed) {
        this._scheduleReconnect();
      }
    }
  }

  private _scheduleReconnect(): void {
    if (this.retryCount >= this.maxRetries) {
      console.warn("[WS] Max reconnect attempts reached");
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s ... capped at 30s
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30_000);
    this.retryCount++;

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.retryCount})`);
    this.reconnectTimer = setTimeout(() => this._connect(), delay);
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// ── Helper factories ────────────────────────────────────

import type { AnomalyEvent } from "@/types";
import { camelizeKeys } from "@/lib/camelize";
import { DEMO_MODE } from "@/lib/api";

function getWsBase(): string {
  const apiUrl = import.meta.env.VITE_API_URL || "";
  if (apiUrl) {
    // Convert https://host to wss://host, http://host to ws://host
    return apiUrl.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}`;
}

export function connectAlerts(
  facilityId: string,
  onAlert: (alert: AnomalyEvent) => void,
  onConnected?: () => void,
  onDisconnected?: () => void,
): WSClient {
  const client = new WSClient({
    url: `${getWsBase()}/ws/alerts`,
    onMessage: (data) => {
      const msg = data as { type?: string; payload?: AnomalyEvent };
      if (msg.type === "alert" && msg.payload) {
        onAlert(msg.payload);
      }
    },
    onOpen: onConnected,
    onClose: onDisconnected,
  });
  if (DEMO_MODE) {
    // In demo mode, don't attempt WebSocket connections
    onConnected?.();
    return client;
  }
  try {
    client.connect();
  } catch (err) {
    console.warn("[WS] Failed to connect alerts WebSocket:", err);
  }
  return client;
}

export function connectSensor(
  sensorId: string,
  onFrame: (frame: Record<string, unknown>) => void,
): WSClient {
  const client = new WSClient({
    url: `${getWsBase()}/ws/live/${sensorId}`,
    onMessage: (data) => {
      const msg = data as { type?: string; payload?: Record<string, unknown> };
      if (msg.payload) {
        onFrame(msg.payload);
      }
    },
  });
  if (DEMO_MODE) {
    // In demo mode, don't attempt WebSocket connections
    return client;
  }
  try {
    client.connect();
  } catch (err) {
    console.warn("[WS] Failed to connect sensor WebSocket:", err);
  }
  return client;
}
