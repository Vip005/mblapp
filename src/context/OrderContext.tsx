import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Order, OrderStatus, OrderStatusStep } from '../types';
import { orderService } from '../services/api/orderService';
import { useAuth } from '../hooks/useAuth';

interface OrderContextType {
  orders: Order[];
  isLoading: boolean;
  placeOrder: (
    details: Omit<Order, 'id' | 'orderNumber' | 'date' | 'status' | 'trackingSteps' | 'estimatedDelivery'>
  ) => Promise<Order>;
  getOrderById: (id: string) => Order | undefined;
  cancelOrder: (id: string) => Promise<Order>;
  refreshOrders: () => Promise<void>;
  clearOrders: () => void;
  updateOrderStatus: (orderId: string | number, status: OrderStatus, trackingSteps?: OrderStatusStep[]) => void;
  updateOrder: (order: Order) => void;
}

export const OrderContext = createContext<OrderContextType>({
  orders: [],
  isLoading: false,
  placeOrder: async () => ({} as Order),
  getOrderById: () => undefined,
  cancelOrder: async () => ({} as Order),
  refreshOrders: async () => {},
  clearOrders: () => {},
  updateOrderStatus: () => {},
  updateOrder: () => {},
});

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoggedIn } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const clearOrders = useCallback(() => {
    setOrders([]);
  }, []);

  const loadOrders = useCallback(async () => {
    if (!isLoggedIn || !user?.id) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const list = await orderService.getOrders(user.id);
      setOrders(list);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('Failed to load orders:', msg);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const placeOrder = async (
    details: Omit<Order, 'id' | 'orderNumber' | 'date' | 'status' | 'trackingSteps' | 'estimatedDelivery'>
  ) => {
    const newOrder = await orderService.createOrder(details);
    if (!user?.id || String(newOrder.customerId) === String(user.id)) {
      setOrders((prev) => [newOrder, ...prev]);
    }
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

  const updateOrder = (updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === updatedOrder.id || o.orderNumber === updatedOrder.orderNumber ? updatedOrder : o
      )
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
        clearOrders,
        updateOrderStatus,
        updateOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};
