import { apiClient } from './apiClient';
import { Order, OrderStatus, OrderStatusStep, User } from '../../types';
import { mapOrder, getUpdatedTrackingSteps } from './adapters';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { generateOrderId } from '../../utils/formatters';
import { storeService } from './storeService';
import { addressService } from './addressService';
import { productService } from './productService';

export interface OrderMasterBackendDto {
  orderID?: number;
  orderId?: number;
  OrderID?: number;
  id?: number | string;
  orderNumber?: string;
  OrderNumber?: string;
  userID?: number;
  userId?: number;
  UserID?: number;
  customerId?: number | string;
  CustomerId?: number | string;
  status?: string;
  Status?: string;
  [key: string]: unknown;
}

export interface CreateOrderResponse {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string;
  orderID?: number;
  OrderID?: number;
  orderId?: number;
  orderNumber?: string;
  OrderNumber?: string;
  result?: OrderMasterBackendDto | OrderMasterBackendDto[];
}

export interface CreateOrderItemResponse {
  isSuccess?: boolean;
  statusCode?: number;
  message?: string;
  result?: Array<{ orderItemID?: number; [key: string]: unknown }>;
}

const getCustomerOrdersKey = (customerId?: string | number | null): string => {
  return customerId ? `${STORAGE_KEYS.ORDERS}_${customerId}` : STORAGE_KEYS.ORDERS;
};

let isCheckoutInProgress = false;

export const orderService = {
  getCustomerOrdersKey,

  async getOrders(targetCustomerId?: string, storeId?: number): Promise<Order[]> {
    let customerId = targetCustomerId;
    if (!customerId) {
      const user = await storage.get<User | null>(STORAGE_KEYS.USER, null);
      customerId = user?.id;
    }
    if (!customerId) {
      return [];
    }

    let backendOrders: Order[] = [];
    const cacheKey = getCustomerOrdersKey(customerId);

    try {
      const queryParams = new URLSearchParams();
      queryParams.append('customerId', customerId);
      if (storeId && Number(storeId) > 0) {
        queryParams.append('storeId', String(storeId));
      }

      const endpoint = `/api/OrderMaster?${queryParams.toString()}`;
      const res = await apiClient.get<OrderMasterBackendDto[] | { result?: OrderMasterBackendDto[] }>(endpoint);
      const items: OrderMasterBackendDto[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.result)
        ? res.result
        : [];

      if (items.length > 0) {
        // Multi-user security: filter orders strictly for current customer
        backendOrders = items
          .filter((o: OrderMasterBackendDto) => {
            const rawId = o.userID ?? o.userId ?? o.UserID ?? o.customerId ?? o.CustomerId;
            return rawId != null && String(rawId) === String(customerId);
          })
          .map((o: OrderMasterBackendDto) => mapOrder(o));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[orderService.getOrders] Backend error:', msg);
    }

    const saved = await storage.get<Order[] | null>(cacheKey, null);
    // Never fall back to mock initialOrders for authenticated customers
    const localOrders = saved || [];

    if (backendOrders.length > 0) {
      // Merge: backend status and authoritative financial values update local order
      const backendMap = new Map(backendOrders.map((o) => [o.id, o]));
      const merged: Order[] = [];

      for (const loc of localOrders) {
        const backendMatch = backendMap.get(loc.id);
        if (backendMatch) {
          const mergedItems = (backendMatch.items || []).map((bItem) => {
            const locItem = loc.items?.find((l) => String(l.productId) === String(bItem.productId));
            return {
              ...bItem,
              image: bItem.image || locItem?.image || '',
            };
          });

          merged.push({
            ...loc,
            ...backendMatch,
            address: (loc.address?.doorFlat || loc.address?.phone || loc.address?.street)
              ? loc.address
              : backendMatch.address,
            items: mergedItems.length > 0 ? mergedItems : loc.items,
            status: backendMatch.status,
            subtotal: backendMatch.subtotal,
            discount: backendMatch.discount,
            deliveryCharge: backendMatch.deliveryCharge,
            tax: backendMatch.tax,
            total: backendMatch.total,
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

      await storage.set(cacheKey, merged);
      return merged;
    }

    return localOrders;
  },

  async getOrderById(id: string, targetCustomerId?: string): Promise<Order | null> {
    let customerId = targetCustomerId;
    if (!customerId) {
      const user = await storage.get<User | null>(STORAGE_KEYS.USER, null);
      customerId = user?.id;
    }

    const cacheKey = getCustomerOrdersKey(customerId);

    if (/^\d+$/.test(id)) {
      try {
        const res = await apiClient.get<OrderMasterBackendDto | { result?: OrderMasterBackendDto }>(`/api/OrderMaster/${id}`);
        const dto = (res && typeof res === 'object' && 'result' in res && res.result ? res.result : res) as OrderMasterBackendDto | null;
        if (dto && (dto.orderID || dto.orderId || dto.OrderID || dto.id)) {
          // Verify customer ownership defense-in-depth
          const rawCustomerId = dto.userID ?? dto.userId ?? dto.UserID ?? dto.customerId ?? dto.CustomerId;
          if (rawCustomerId != null && customerId && String(rawCustomerId) !== String(customerId)) {
            console.warn(`[orderService.getOrderById] Security violation: Order ${id} does not belong to customer ${customerId}`);
            return null;
          }

          // Fetch items for this order from backend if available
          let orderItemsDto: any[] = [];
          try {
            const itemsRes = await apiClient.get<any[] | { result?: any[] }>(`/api/OrderItemMaster?orderId=${id}`);
            orderItemsDto = Array.isArray(itemsRes)
              ? itemsRes
              : Array.isArray((itemsRes as any)?.result)
              ? (itemsRes as any).result
              : [];
          } catch (itemsErr) {
            console.warn(`[orderService.getOrderById] Could not fetch order items for ${id}:`, itemsErr);
          }

          const fresh = mapOrder(dto, orderItemsDto);
          const saved = await storage.get<Order[] | null>(cacheKey, null);
          const savedItem = saved?.find((o) => o.id === id || o.orderNumber === id);

          // 1. Preserve delivery address: use saved checkout address or lookup from addressService
          if (savedItem?.address && (savedItem.address.doorFlat || savedItem.address.phone || savedItem.address.street)) {
            fresh.address = savedItem.address;
          } else if ((!fresh.address.phone || !fresh.address.doorFlat) && (dto.addressId || dto.AddressId)) {
            try {
              const targetAddrId = String(dto.addressId || dto.AddressId);
              const userAddresses = await addressService.getAddresses(customerId);
              const matchedAddr = userAddresses.find((a) => String(a.id) === targetAddrId);
              if (matchedAddr) {
                fresh.address = matchedAddr;
              }
            } catch {
              // Graceful fallback to default mapped address
            }
          }

          // 2. Preserve & merge item images: merge images from cached items where backend items lack imageUrl
          if (savedItem?.items && savedItem.items.length > 0) {
            if (!fresh.items || fresh.items.length === 0) {
              fresh.items = savedItem.items;
            } else {
              fresh.items = fresh.items.map((fItem) => {
                const savedMatch = savedItem.items.find(
                  (s) => String(s.productId) === String(fItem.productId)
                );
                return {
                  ...fItem,
                  image: fItem.image || savedMatch?.image || '',
                };
              });
            }
          }

          // 3. Resilient fallback: Hydrate missing product images from catalog
          if (fresh.items && fresh.items.length > 0) {
            const missingImageItems = fresh.items.filter((it) => !it.image && it.productId);
            if (missingImageItems.length > 0) {
              await Promise.all(
                missingImageItems.map(async (it) => {
                  try {
                    const catalogProduct = await productService.getProductById(String(it.productId));
                    if (catalogProduct?.image) {
                      it.image = catalogProduct.image;
                    }
                  } catch {
                    // Ignore catalog lookup error, SafeImage will render fallback icon
                  }
                })
              );
            }
          }

          if (saved) {
            const updated = saved.map((o) =>
              o.id === id || o.orderNumber === id
                ? {
                    ...o,
                    ...fresh,
                    address: fresh.address,
                    items: fresh.items && fresh.items.length > 0 ? fresh.items : o.items,
                    status: fresh.status,
                    trackingSteps: getUpdatedTrackingSteps(fresh.status, o.trackingSteps),
                  }
                : o
            );
            await storage.set(cacheKey, updated);
          }
          return fresh;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[orderService.getOrderById] Backend error for id ${id}:`, msg);
        return null;
      }
    }

    const orders = await this.getOrders(customerId);
    const order = orders.find((o) => o.id === id || o.orderNumber === id);
    if (order) return order;

    return null;
  },

  async createOrder(
    data: Omit<Order, 'id' | 'orderNumber' | 'date' | 'status' | 'trackingSteps' | 'estimatedDelivery'>
  ): Promise<Order> {
    if (isCheckoutInProgress) {
      throw new Error('Order submission is already in progress. Please wait.');
    }
    isCheckoutInProgress = true;

    try {
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

      const validPaymentMethods = ['cod', 'razorpay', 'online', 'upi', 'card', 'wallet'];
      if (!validPaymentMethods.includes(data.paymentMethod)) {
        throw new Error(`Order placement failed at frontend validation: Invalid payment method "${data.paymentMethod}".`);
      }

      const isOnlinePayment = data.paymentMethod !== 'cod';
      const backendPaymentMode = isOnlinePayment ? 'RAZORPAY' : 'COD';

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

      // SellingPrice subtotal contract:
      // ItemTotal = sum(SellingPrice * Quantity)
      // DiscountTotal includes only valid coupon/order-level discounts
      const computedItemTotal = Number(
        data.items.reduce((sum, it) => sum + Number(it.price) * Number(it.quantity), 0).toFixed(2)
      );
      const itemTotal = computedItemTotal > 0 ? computedItemTotal : Number((data.subtotal || 0).toFixed(2));
      const orderLevelDiscount = Number(
        Math.min(itemTotal, Math.max(0, data.couponDiscount || 0)).toFixed(2)
      );
      const deliveryFee = Number((data.deliveryCharge || 0).toFixed(2));
      const platformFee = Number((data.platformFee || 0).toFixed(2));
      const taxes = Number((data.tax || 0).toFixed(2));
      const expectedGrandTotal = Number(
        Math.max(0, itemTotal - orderLevelDiscount + deliveryFee + platformFee + taxes).toFixed(2)
      );

      const orderMasterDto = {
        orderID: 0,
        orderNumber,
        customerId: parsedCustomerId,
        addressId: parsedAddressId,
        AddressId: parsedAddressId,
        paymentMode: backendPaymentMode,
        status: 'Pending',
        itemTotal,
        deliveryFee,
        platformFee,
        taxes,
        grandTotal: expectedGrandTotal,
        cancellationReason: '',
        createdDate: now.toISOString(),
        modifiedDate: now.toISOString(),
        storeID: Number(selectedStoreId),
        paymentStatus: 'Pending',
        paymentTransactionID: '',
        discountTotal: orderLevelDiscount,
      };

      const itemsDto = data.items.map((it) => ({
        orderItemID: 0,
        orderID: 0,
        productID: parseInt(it.productId, 10),
        productVariantID: parseInt(it.variantId!, 10),
        productName: it.productName,
        variantLabel: it.variantName || 'Standard',
        price: Number(it.price),
        quantity: it.quantity,
        total: Number((Number(it.price) * it.quantity).toFixed(2)),
        createdDate: now.toISOString(),
      }));

      let confirmedOrderID: string | number | undefined;
      let confirmedOrderNumber: string | undefined = orderNumber;

      // Atomic single-transaction checkout: POST /api/OrderMaster/checkout
      console.log('[ORDER DEBUG]', {
        step: 'OrderMaster checkout (atomic) request',
        endpoint: '/api/OrderMaster/checkout',
      });

      const atomicRes: any = await apiClient.post('/api/OrderMaster/checkout', {
        order: orderMasterDto,
        items: itemsDto,
      });

      const resOrder =
        atomicRes?.result?.order ??
        atomicRes?.order ??
        atomicRes?.Order ??
        atomicRes?.result?.Order ??
        atomicRes?.result ??
        atomicRes;

      if (resOrder && (resOrder.orderID || resOrder.OrderID || resOrder.orderId)) {
        confirmedOrderID = resOrder.orderID ?? resOrder.OrderID ?? resOrder.orderId;
        confirmedOrderNumber = resOrder.orderNumber ?? resOrder.OrderNumber ?? orderNumber;
        console.log('[ORDER DEBUG]', {
          step: 'OrderMaster checkout (atomic) succeeded',
          parsedOrderID: confirmedOrderID,
          parsedOrderNumber: confirmedOrderNumber,
        });
      }

      if (!confirmedOrderID || Number(confirmedOrderID) <= 0) {
        throw new Error(
          `Order placement failed at checkout response parsing: server did not return a valid numeric OrderID. Response: ${JSON.stringify(atomicRes)}`
        );
      }

      const backendOrderId = String(confirmedOrderID);
      const serverGrandTotal =
        resOrder.grandTotal != null
          ? Number(resOrder.grandTotal)
          : resOrder.GrandTotal != null
          ? Number(resOrder.GrandTotal)
          : expectedGrandTotal;
      const serverItemTotal =
        resOrder.itemTotal != null
          ? Number(resOrder.itemTotal)
          : resOrder.ItemTotal != null
          ? Number(resOrder.ItemTotal)
          : itemTotal;
      const serverDiscountTotal =
        resOrder.discountTotal != null
          ? Number(resOrder.discountTotal)
          : resOrder.DiscountTotal != null
          ? Number(resOrder.DiscountTotal)
          : orderLevelDiscount;
      const serverDeliveryFee =
        resOrder.deliveryFee != null
          ? Number(resOrder.deliveryFee)
          : resOrder.DeliveryFee != null
          ? Number(resOrder.DeliveryFee)
          : deliveryFee;
      const serverPlatformFee =
        resOrder.platformFee != null
          ? Number(resOrder.platformFee)
          : resOrder.PlatformFee != null
          ? Number(resOrder.PlatformFee)
          : platformFee;
      const serverTaxes =
        resOrder.taxes != null
          ? Number(resOrder.taxes)
          : resOrder.Taxes != null
          ? Number(resOrder.Taxes)
          : taxes;

      const newOrder: Order = {
        ...data,
        id: backendOrderId,
        orderNumber: String(confirmedOrderNumber),
        date: resOrder.createdDate || resOrder.CreatedDate || now.toISOString(),
        status: 'Placed',
        paymentMethod: data.paymentMethod,
        paymentMode: backendPaymentMode,
        paymentStatus: resOrder.paymentStatus || 'Pending',
        subtotal: serverItemTotal,
        discount: serverDiscountTotal,
        couponDiscount: 0,
        deliveryCharge: serverDeliveryFee,
        platformFee: serverPlatformFee,
        tax: serverTaxes,
        total: serverGrandTotal,
        trackingSteps,
        storeId: Number(selectedStoreId),
        customerId: String(parsedCustomerId),
      };

      const cacheKey = getCustomerOrdersKey(parsedCustomerId);
      const currentOrders = await this.getOrders(String(parsedCustomerId));
      const updated = [newOrder, ...currentOrders.filter((o) => o.id !== newOrder.id)];
      await storage.set(cacheKey, updated);

      return newOrder;
    } finally {
      isCheckoutInProgress = false;
    }
  },

  async cancelOrder(orderId: string): Promise<Order> {
    const user = await storage.get<User | null>(STORAGE_KEYS.USER, null);
    const customerId = user?.id;
    const cacheKey = getCustomerOrdersKey(customerId);

    const parsedOrderId = parseInt(String(orderId), 10);
    if (!/^\d+$/.test(String(orderId)) || isNaN(parsedOrderId) || parsedOrderId <= 0) {
      throw new Error('Invalid order ID for cancellation.');
    }

    // Use backend status-based PUT /api/OrderMaster cancellation workflow (OrderMasterEdit).
    // Do NOT catch and swallow errors: if the API request fails, local state must not be marked Cancelled.
    await apiClient.put('/api/OrderMaster', {
      orderID: parsedOrderId,
      status: 'Cancelled',
      cancellationReason: 'Cancelled by customer',
    });

    const orders = await this.getOrders(customerId);
    let updatedOrder: Order | null = null;

    const updatedList = orders.map((o) => {
      if (o.id === String(orderId) || o.orderNumber === String(orderId)) {
        updatedOrder = {
          ...o,
          status: 'Cancelled' as OrderStatus,
          trackingSteps: getUpdatedTrackingSteps('Cancelled', o.trackingSteps),
        };
        return updatedOrder;
      }
      return o;
    });

    if (!updatedOrder) {
      throw new Error('Order not found');
    }

    await storage.set(cacheKey, updatedList);
    return updatedOrder;
  },

  async clearOrdersCache(customerId?: string): Promise<void> {
    if (customerId) {
      await storage.remove(getCustomerOrdersKey(customerId));
    }
    await storage.remove(STORAGE_KEYS.ORDERS);
  },

  async saveVerifiedOrder(order: Order, targetCustomerId?: string): Promise<void> {
    let customerId = targetCustomerId;
    if (!customerId) {
      const user = await storage.get<User | null>(STORAGE_KEYS.USER, null);
      customerId = user?.id;
    }
    const cacheKey = getCustomerOrdersKey(customerId);
    const existing = (await storage.get<Order[] | null>(cacheKey, null)) || [];
    const updated = [order, ...existing.filter((o) => o.id !== order.id && o.orderNumber !== order.orderNumber)];
    await storage.set(cacheKey, updated);
  },
};
