import { apiClient } from './apiClient';
import { Order, OrderStatus, OrderStatusStep, User } from '../../types';
import { mapOrder, getUpdatedTrackingSteps } from './adapters';
import { initialOrders } from '../../data/orders';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { generateOrderId } from '../../utils/formatters';
import { storeService } from './storeService';

export const orderService = {
  async getOrders(): Promise<Order[]> {
    const user = await storage.get<User | null>(STORAGE_KEYS.USER, null);
    const customerId = user?.id;
    if (!customerId) {
      return [];
    }

    let backendOrders: Order[] = [];

    try {
      const res = await apiClient.get('/api/OrderMaster');
      const items = Array.isArray(res) ? res : res?.result || [];

      if (items.length > 0) {
        // Multi-user security: filter orders for current customer
        backendOrders = items
          .filter((o: any) => String(o.customerId) === String(customerId))
          .map((o: any) => mapOrder(o));
      }
    } catch (e: any) {
      console.warn('[orderService.getOrders] Backend error:', e.message);
    }

    const saved = await storage.get<Order[] | null>(STORAGE_KEYS.ORDERS, null);
    const localOrders = saved || initialOrders;

    if (backendOrders.length > 0) {
      // Merge: backend status updates local order tracking steps and status
      const backendMap = new Map(backendOrders.map((o) => [o.id, o]));
      const merged: Order[] = [];

      for (const loc of localOrders) {
        const backendMatch = backendMap.get(loc.id);
        if (backendMatch) {
          merged.push({
            ...loc,
            status: backendMatch.status,
            trackingSteps: getUpdatedTrackingSteps(backendMatch.status, loc.trackingSteps),
          });
          backendMap.delete(loc.id);
        } else {
          merged.push(loc);
        }
      }

      for (const rem of backendMap.values()) {
        merged.push(rem);
      }

      return merged;
    }

    return localOrders;
  },

  async getOrderById(id: string): Promise<Order | null> {
    if (/^\d+$/.test(id)) {
      try {
        const res = await apiClient.get(`/api/OrderMaster/${id}`);
        const dto = res?.result || res;
        if (dto && (dto.orderID || dto.id)) {
          const fresh = mapOrder(dto);
          const saved = await storage.get<Order[] | null>(STORAGE_KEYS.ORDERS, null);
          if (saved) {
            const updated = saved.map((o) =>
              o.id === id || o.orderNumber === id
                ? {
                    ...o,
                    status: fresh.status,
                    trackingSteps: getUpdatedTrackingSteps(fresh.status, o.trackingSteps),
                  }
                : o
            );
            await storage.set(STORAGE_KEYS.ORDERS, updated);
          }
          return fresh;
        }
      } catch (e: any) {
        console.warn(`[orderService.getOrderById] Backend error for id ${id}:`, e.message);
      }
    }

    const orders = await this.getOrders();
    const order = orders.find((o) => o.id === id || o.orderNumber === id);
    if (order) return order;

    return null;
  },

  async createOrder(
    data: Omit<Order, 'id' | 'orderNumber' | 'date' | 'status' | 'trackingSteps' | 'estimatedDelivery'>
  ): Promise<Order> {
    // Step 1: Frontend Validation
    const user = await storage.get<User | null>(STORAGE_KEYS.USER, null);
    const customerId = user?.id;
    if (!customerId) {
      throw new Error('Order placement failed at frontend validation: Authentication required. Please log in to place an order.');
    }

    const parsedCustomerId = parseInt(customerId, 10);
    if (isNaN(parsedCustomerId) || parsedCustomerId <= 0) {
      throw new Error('Order placement failed at frontend validation: Invalid user session. Please log in again.');
    }

    const selectedStoreId = data.storeId || (await storeService.getSelectedStoreId());
    if (!selectedStoreId || Number(selectedStoreId) <= 0) {
      throw new Error('Order placement failed at frontend validation: Please select a store before placing your order.');
    }

    const parsedAddressId = parseInt(data.address?.id, 10);
    if (!data.address?.id || isNaN(parsedAddressId) || parsedAddressId <= 0) {
      throw new Error('Order placement failed at frontend validation: Invalid delivery address. Please select a valid address.');
    }

    if (data.paymentMethod !== 'cod') {
      throw new Error('Order placement failed at frontend validation: Online payment is currently unavailable. Please choose Cash on Delivery.');
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('Order placement failed at frontend validation: Your cart is empty. Please add items before checkout.');
    }

    // Validate product IDs, variant IDs, and quantities strictly before sending requests
    for (const it of data.items) {
      const parsedProdId = parseInt(it.productId, 10);
      const rawVarId = it.variantId;
      const parsedVarId = rawVarId ? parseInt(rawVarId, 10) : NaN;

      if (isNaN(parsedProdId) || parsedProdId <= 0) {
        throw new Error(`Order placement failed at frontend validation: Invalid product ID "${it.productId}" for item "${it.productName}".`);
      }
      if (isNaN(parsedVarId) || parsedVarId <= 0) {
        throw new Error(`Order placement failed at frontend validation: Invalid product variant ID "${rawVarId || ''}" for item "${it.productName}".`);
      }
      if (!it.quantity || it.quantity <= 0) {
        throw new Error(`Order placement failed at frontend validation: Invalid quantity "${it.quantity}" for item "${it.productName}".`);
      }
    }

    const orderNumber = generateOrderId();
    const now = new Date();

    const trackingSteps: OrderStatusStep[] = [
      { status: 'Placed', label: 'Order Placed', date: 'Just now', completed: true, current: false },
      { status: 'Confirmed', label: 'Order Confirmed', date: 'Estimated in 5 mins', completed: true, current: true },
      { status: 'Preparing', label: 'Packed & Dispatched', completed: false, current: false },
      { status: 'Out for Delivery', label: 'Out for Delivery', completed: false, current: false },
      { status: 'Delivered', label: 'Delivered', completed: false, current: false },
    ];

    // Step 2: Submit OrderMaster as a SINGLE OBJECT (not an array)
    const orderMasterDto = {
      orderID: 0,
      orderNumber,
      customerId: parsedCustomerId,
      addressId: parsedAddressId,
      AddressId: parsedAddressId,
      paymentMode: 'COD',
      status: 'Pending',
      itemTotal: data.subtotal,
      deliveryFee: data.deliveryCharge,
      platformFee: 0,
      taxes: data.tax,
      grandTotal: data.total,
      cancellationReason: '',
      createdDate: now.toISOString(),
      modifiedDate: now.toISOString(),
      storeID: Number(selectedStoreId),
      paymentStatus: 'Pending',
      paymentTransactionID: '',
      discountTotal: (data.discount || 0) + (data.couponDiscount || 0),
    };

    console.log('[ORDER DEBUG]', {
      step: 'OrderMaster request',
      request: {
        endpoint: '/api/OrderMaster',
        method: 'POST',
        payload: orderMasterDto,
      },
    });

    let res: any;
    try {
      res = await apiClient.post('/api/OrderMaster', orderMasterDto);
    } catch (err: any) {
      console.log('[ORDER DEBUG]', {
        step: 'OrderMaster request failed',
        status: err?.statusCode || 500,
        error: err.message,
      });
      throw new Error(`Order placement failed at OrderMaster request: ${err.message}`);
    }

    // Step 3: OrderMaster response parsing
    const confirmedOrderID =
      (res && typeof res === 'object' && (res.orderID ?? res.OrderID ?? res.orderId)) ??
      (res && typeof res === 'object' && res.result && (res.result.orderID ?? res.result.OrderID ?? res.result.orderId)) ??
      (Array.isArray(res) && (res[0]?.orderID ?? res[0]?.OrderID ?? res[0]?.orderId)) ??
      (Array.isArray(res?.result) && (res.result[0]?.orderID ?? res.result[0]?.OrderID ?? res.result[0]?.orderId));

    const confirmedOrderNumber =
      (res && typeof res === 'object' && (res.orderNumber ?? res.OrderNumber)) ??
      (res && typeof res === 'object' && res.result && (res.result.orderNumber ?? res.result.OrderNumber)) ??
      (Array.isArray(res) && (res[0]?.orderNumber ?? res[0]?.OrderNumber)) ??
      orderNumber;

    console.log('[ORDER DEBUG]', {
      step: 'OrderMaster response parsing',
      status: 201,
      response: res,
      parsedOrderID: confirmedOrderID,
      parsedOrderNumber: confirmedOrderNumber,
    });

    if (!confirmedOrderID || Number(confirmedOrderID) <= 0) {
      throw new Error(
        `Order placement failed at OrderMaster response parsing: server did not return a valid numeric OrderID. Response: ${JSON.stringify(res)}`
      );
    }

    const backendOrderId = String(confirmedOrderID);

    // Step 4: Submit OrderItemMaster as an ARRAY
    const itemsDto = data.items.map((it) => ({
      orderItemID: 0,
      orderID: Number(confirmedOrderID),
      productID: parseInt(it.productId, 10),
      productVariantID: parseInt(it.variantId!, 10),
      productName: it.productName,
      variantLabel: it.variantName || 'Standard',
      price: it.price,
      quantity: it.quantity,
      total: it.totalPrice,
      createdDate: now.toISOString(),
    }));

    console.log('[ORDER DEBUG]', {
      step: 'OrderItemMaster request',
      request: {
        endpoint: '/api/OrderItemMaster',
        method: 'POST',
        payload: itemsDto,
      },
    });

    let itemRes: any;
    try {
      itemRes = await apiClient.post('/api/OrderItemMaster', itemsDto);
    } catch (err: any) {
      console.log('[ORDER DEBUG]', {
        step: 'OrderItemMaster request failed',
        status: err?.statusCode || 500,
        error: err.message,
      });
      throw new Error(`Order placement failed at OrderItemMaster request: ${err.message}`);
    }

    // Step 5: OrderItemMaster response parsing
    const savedItems = Array.isArray(itemRes)
      ? itemRes
      : Array.isArray(itemRes?.result)
      ? itemRes.result
      : null;

    console.log('[ORDER DEBUG]', {
      step: 'OrderItemMaster response parsing',
      status: 201,
      response: itemRes,
      itemCount: savedItems?.length ?? 0,
    });

    if (!savedItems || savedItems.length === 0) {
      throw new Error(
        `Order placement failed at OrderItemMaster response parsing: server did not return confirmed order items. Response: ${JSON.stringify(itemRes)}`
      );
    }

    const newOrder: Order = {
      ...data,
      id: backendOrderId,
      orderNumber: String(confirmedOrderNumber),
      date: now.toISOString(),
      status: 'Placed',
      trackingSteps,
      estimatedDelivery: `${data.deliverySlot.dateLabel}, ${data.deliverySlot.timeWindow}`,
      storeId: Number(selectedStoreId),
    };

    const currentOrders = await this.getOrders();
    const updated = [newOrder, ...currentOrders.filter((o) => o.id !== newOrder.id)];
    await storage.set(STORAGE_KEYS.ORDERS, updated);

    return newOrder;
  },

  async cancelOrder(orderId: string): Promise<Order> {
    if (/^\d+$/.test(orderId)) {
      try {
        await apiClient.delete(`/api/OrderMaster/${orderId}`);
      } catch (e: any) {
        console.warn(`[orderService.cancelOrder] Backend error for id ${orderId}:`, e.message);
      }
    }

    const orders = await this.getOrders();
    let updatedOrder: Order | null = null;

    const updatedList = orders.map((o) => {
      if (o.id === orderId || o.orderNumber === orderId) {
        updatedOrder = {
          ...o,
          status: 'Cancelled' as OrderStatus,
          trackingSteps: [
            ...o.trackingSteps,
            {
              status: 'Cancelled' as OrderStatus,
              label: 'Order Cancelled',
              date: 'Cancelled by customer',
              completed: true,
              current: true,
            },
          ],
        };
        return updatedOrder;
      }
      return o;
    });

    if (!updatedOrder) {
      throw new Error('Order not found');
    }

    await storage.set(STORAGE_KEYS.ORDERS, updatedList);
    return updatedOrder;
  },
};
