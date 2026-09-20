import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { storage } from '../../utils/storage';

export type OrderStatusUpdatedEvent = {
  orderId: number;
  status: string;
};

type StatusUpdateCallback = (data: OrderStatusUpdatedEvent) => void;

const HUB_URL =
  'https://greenmartapi-aqfedue2dte2dccy.malaysiawest-01.azurewebsites.net/hubs/order';

class OrderHubService {
  private connection: HubConnection | null = null;
  private connectingPromise: Promise<void> | null = null;
  private readonly listeners: Set<StatusUpdateCallback> = new Set();
  private readonly activeOrders: Set<number> = new Set();

  private getConnection(): HubConnection {
    if (!this.connection) {
      this.connection = new HubConnectionBuilder()
        .withUrl(HUB_URL, {
          accessTokenFactory: async () => {
            const token = await storage.getAuthToken();
            return token ?? '';
          },
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build();

      this.connection.on('OrderStatusUpdated', (data: any) => {
        console.log('[OrderHub] Status updated');
        const rawOrderId = data?.orderId ?? data?.OrderId ?? 0;
        const rawStatus = data?.status ?? data?.Status ?? '';

        const event: OrderStatusUpdatedEvent = {
          orderId: Number(rawOrderId),
          status: String(rawStatus),
        };

        this.listeners.forEach((callback) => {
          try {
            callback(event);
          } catch (err) {
            console.warn('[OrderHub] Listener callback error:', err);
          }
        });
      });

      this.connection.onreconnecting((err) => {
        console.log('[OrderHub] Reconnecting...', err?.message ?? '');
      });

      this.connection.onreconnected(async (connectionId) => {
        console.log('[OrderHub] Reconnected. Connection ID:', connectionId);
        // Rejoin all active order groups after automatic reconnect
        for (const orderId of this.activeOrders) {
          try {
            if (this.connection?.state === HubConnectionState.Connected) {
              await this.connection.invoke('JoinOrderGroup', orderId);
              console.log(`[OrderHub] Joined order-${orderId}`);
            }
          } catch (err: any) {
            console.warn(`[OrderHub] Failed to rejoin order-${orderId} after reconnect:`, err?.message ?? err);
          }
        }
      });

      this.connection.onclose((err) => {
        if (err) {
          console.warn('[OrderHub] Connection closed with error:', err?.message ?? err);
        } else {
          console.log('[OrderHub] Disconnected');
        }
      });
    }

    return this.connection;
  }

  /**
   * Establish SignalR connection using existing JWT authentication
   */
  async connect(): Promise<void> {
    const token = await storage.getAuthToken();
    if (!token) {
      console.warn('[OrderHub] Cannot connect: No authentication token found.');
      return;
    }

    const conn = this.getConnection();

    if (conn.state === HubConnectionState.Connected) {
      return;
    }

    if (conn.state === HubConnectionState.Connecting || conn.state === HubConnectionState.Reconnecting) {
      if (this.connectingPromise) {
        await this.connectingPromise;
      }
      return;
    }

    console.log('[OrderHub] Connecting...');

    this.connectingPromise = (async () => {
      try {
        await conn.start();
        console.log('[OrderHub] Connected');
      } catch (err: any) {
        console.warn('[OrderHub] Connection failed:', err?.message ?? err);
        throw err;
      } finally {
        this.connectingPromise = null;
      }
    })();

    await this.connectingPromise;
  }

  /**
   * Join an order-specific SignalR group
   */
  async joinOrder(orderId: number | string): Promise<void> {
    const numericId = Number(orderId);
    if (isNaN(numericId) || numericId <= 0) {
      return;
    }

    this.activeOrders.add(numericId);

    try {
      const conn = this.getConnection();
      if (conn.state !== HubConnectionState.Connected) {
        await this.connect();
      }

      if (conn.state === HubConnectionState.Connected) {
        await conn.invoke('JoinOrderGroup', numericId);
        console.log(`[OrderHub] Joined order-${numericId}`);
      }
    } catch (err: any) {
      console.warn(`[OrderHub] Failed to join order-${numericId}:`, err?.message ?? err);
    }
  }

  /**
   * Leave an order-specific SignalR group
   */
  async leaveOrder(orderId: number | string): Promise<void> {
    const numericId = Number(orderId);
    if (isNaN(numericId) || numericId <= 0) {
      return;
    }

    this.activeOrders.delete(numericId);

    try {
      if (this.connection?.state === HubConnectionState.Connected) {
        await this.connection.invoke('LeaveOrderGroup', numericId);
        console.log(`[OrderHub] Left order-${numericId}`);
      }
    } catch (err: any) {
      console.warn(`[OrderHub] Failed to leave order-${numericId}:`, err?.message ?? err);
    }
  }

  /**
   * Register a listener for order status changes
   */
  onStatusUpdated(callback: StatusUpdateCallback): void {
    this.listeners.add(callback);
  }

  /**
   * Unregister an order status change listener
   */
  offStatusUpdated(callback?: StatusUpdateCallback): void {
    if (callback) {
      this.listeners.delete(callback);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Stop connection cleanly
   */
  async disconnect(): Promise<void> {
    if (
      this.connection &&
      (this.connection.state === HubConnectionState.Connected ||
        this.connection.state === HubConnectionState.Connecting)
    ) {
      try {
        await this.connection.stop();
        console.log('[OrderHub] Disconnected');
      } catch (err: any) {
        console.warn('[OrderHub] Disconnect error:', err?.message ?? err);
      }
    }
  }
}

export const orderHub = new OrderHubService();
