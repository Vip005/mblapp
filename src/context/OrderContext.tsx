import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Order, OrderStatus, OrderStatusStep } from '../types';
import { orderService } from '../services/api/orderService';

interface OrderContextType {
  orders: Order[];
  isLoading: boolean;
  placeOrder: (
    details: Omit<Order, 'id' | 'orderNumber' | 'date' | 'status' | 'trackingSteps' | 'estimatedDelivery'>
  ) => Promise<Order>;
  getOrderById: (id: string) => Order | undefined;
  cancelOrder: (id: string) => Promise<Order>;
  refreshOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string | number, status: OrderStatus, trackingSteps?: OrderStatusStep[]) => void;
}

export const OrderContext = createContext<OrderContextType>({
  orders: [],
  isLoading: true,
  placeOrder: async () => ({} as Order),
  getOrderById: () => undefined,
  cancelOrder: async () => ({} as Order),
  refreshOrders: async () => {},
  updateOrderStatus: () => {},
});

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const list = await orderService.getOrders();
      setOrders(list);
    } catch (e) {
      console.warn('Failed to load orders:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const placeOrder = async (
    details: Omit<Order, 'id' | 'orderNumber' | 'date' | 'status' | 'trackingSteps' | 'estimatedDelivery'>
  ) => {
    const newOrder = await orderService.createOrder(details);
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const getOrderById = (id: string): Order | undefined => {
    return orders.find((o) => o.id === id || o.orderNumber === id);
  };

  const cancelOrder = async (id: string): Promise<Order> => {
    const updated = await orderService.cancelOrder(id);
    setOrders((prev) => prev.map((o) => (o.id === id || o.orderNumber === id ? updated : o)));
    return updated;
  };

  const updateOrderStatus = (
    orderId: string | number,
    status: OrderStatus,
    trackingSteps?: OrderStatusStep[]
  ) => {
    const targetIdStr = String(orderId);
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === targetIdStr || o.orderNumber === targetIdStr) {
          return {
            ...o,
            status,
            trackingSteps: trackingSteps || o.trackingSteps,
          };
        }
        return o;
      })
    );
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        isLoading,
        placeOrder,
        getOrderById,
        cancelOrder,
        refreshOrders: loadOrders,
        updateOrderStatus,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};
