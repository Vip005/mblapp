import {
  Category,
  Product,
  ProductVariant,
  Address,
  AddressType,
  Store,
  Brand,
  Coupon,
  Offer,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusStep,
  Banner,
  BannerActionType,
  BannerMasterDto,
} from '../../types';
import { API_CONFIG } from './config';

/**
 * Resolves a raw image URL from the backend.
 * Handles full URLs, relative URLs (prefixed with BASE_URL), and returns empty string if missing.
 * Eliminates third-party mock fallbacks (Unsplash).
 */
export const resolveImageUrl = (rawPath?: string | null): string => {
  if (!rawPath || typeof rawPath !== 'string') return '';
  const trimmed = rawPath.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed)) {
    return trimmed;
  }
  const base = API_CONFIG.BASE_URL.replace(/\/+$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
};

export const mapCategory = (dto: any): Category => {
  const rawImg = dto.imageUrl || dto.imageURL || dto.ImageUrl || dto.image || dto.imagePath;
  return {
    id: String(dto.productCategoryID || dto.id || ''),
    name: dto.categoryName || dto.name || '',
    slug:
      dto.categoryCode?.toLowerCase() ||
      (dto.categoryName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    image: resolveImageUrl(rawImg),
    itemCount: dto.itemCount || 0,
    color: '#E8F5E9',
  };
};

export const mapProduct = (dto: any): Product => {
  const rawVariants = Array.isArray(dto.variants) ? dto.variants : [];

  const variants: ProductVariant[] = rawVariants.map((v: any) => {
    const mrp = Number(v.price?.mrp ?? v.mrp ?? 0);
    const sp = Number(v.price?.sellingPrice ?? v.sellingPrice ?? mrp);
    const stock = Number(v.stock ?? v.availableStock ?? 0);

    return {
      id: String(v.productVariantID || v.id || ''),
      name: v.variantLabel || `${v.quantity || ''} ${v.unit || ''}`.trim() || 'Standard',
      unit: v.unit || 'unit',
      price: sp,
      originalPrice: mrp > 0 ? mrp : sp,
      stock,
      isAvailable: v.isAvailable !== false && stock > 0,
    };
  });

  const firstVariant = variants[0];
  const sellingPrice = firstVariant ? firstVariant.price : Number(dto.sellingPrice || 0);
  const originalPrice = firstVariant
    ? firstVariant.originalPrice
    : Number(dto.originalPrice || sellingPrice);

  const discount =
    originalPrice > sellingPrice && originalPrice > 0
      ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
      : 0;

  const rawImages: any[] = Array.isArray(dto.images)
    ? dto.images
    : Array.isArray(dto.productImages)
    ? dto.productImages
    : [];

  const rawVariantImages: any[] = rawVariants
    .flatMap((v: any) => (Array.isArray(v.images) ? v.images : []));

  const allRawImages = [...rawImages, ...rawVariantImages];

  const extractedImages: string[] = allRawImages
    .map((img: any) => {
      if (typeof img === 'string') return resolveImageUrl(img);
      const url = img?.imageUrl || img?.imageURL || img?.ImageUrl || img?.imagePath || img?.image;
      return resolveImageUrl(url);
    })
    .filter((url): url is string => Boolean(url && url.length > 0));

  const directImage = resolveImageUrl(
    dto.imageUrl || dto.imageURL || dto.ImageUrl || dto.productImage || dto.image || dto.imagePath
  );

  const candidateImages = [...(directImage ? [directImage] : []), ...extractedImages];
  const images = Array.from(new Set(candidateImages));
  const primaryImage = images[0] || '';

  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);

  return {
    id: String(dto.productID || dto.id || ''),
    name: dto.productName || dto.name || '',
    brand: dto.brandName || dto.brand || 'Fresh Daily',
    categoryId: String(dto.productCategoryID || dto.categoryId || ''),
    description: dto.productDescription || dto.description || '',
    image: primaryImage,
    gallery: images.length > 0 ? images : (primaryImage ? [primaryImage] : []),
    rating: Number(dto.rating || 0),
    reviewCount: Number(dto.reviewCount || 0),
    stock: totalStock,
    isAvailable: dto.isActive !== false && (variants.length > 0 ? variants.some((v) => v.isAvailable) : totalStock > 0),
    tags: [dto.categoryName, dto.brandName].filter(Boolean),
    originalPrice: originalPrice > 0 ? originalPrice : sellingPrice,
    sellingPrice,
    discount,
    variants:
      variants.length > 0
        ? variants
        : [
            {
              id: `${dto.productID || dto.id}_default`,
              name: 'Standard',
              unit: 'pack',
              price: sellingPrice,
              originalPrice,
              stock: totalStock,
              isAvailable: dto.isActive !== false && totalStock > 0,
            },
          ],
    isFeatured: Boolean(dto.isFeatured),
    isPopular: Boolean(dto.isPopular),
    isFlashDeal: Boolean(dto.isFlashDeal || discount >= 15),
    storeId: dto.storeID != null ? Number(dto.storeID) : (dto.storeId != null ? Number(dto.storeId) : undefined),
  };
};

export const mapAddress = (dto: any): Address => {
  return {
    id: String(dto.addressId || dto.id || ''),
    name: dto.contactPerson || dto.name || '',
    phone: dto.contactPhoneNumber || dto.phone || '',
    doorFlat: dto.addressLine1 || dto.doorFlat || '',
    street: dto.addressLine2 || dto.street || '',
    area: dto.area || '',
    city: dto.city || 'Chennai',
    state: dto.state || 'Tamil Nadu',
    pincode: dto.pincode || '',
    type: (dto.addressType as AddressType) || 'Home',
    isDefault: !!dto.isPrimary || !!dto.isDefault,
  };
};

export const mapAddressToDto = (
  addr: Address,
  customerId: string | number,
  selectedStoreId?: number | null
) => {
  const numericId = parseInt(addr.id, 10);
  const numericCustomerId = Number(customerId);
  if (!numericCustomerId || isNaN(numericCustomerId) || numericCustomerId <= 0) {
    throw new Error('Valid customer ID is required to map address');
  }
  return {
    addressId: !isNaN(numericId) ? numericId : 0,
    customerId: numericCustomerId,
    addressType: addr.type || 'Home',
    addressLine1: addr.doorFlat || '',
    addressLine2: addr.street || '',
    area: addr.area || '',
    city: addr.city || '',
    state: addr.state || '',
    pincode: addr.pincode || '',
    isPrimary: !!addr.isDefault,
    contactPerson: addr.name || '',
    contactPhoneNumber: addr.phone || '',
    selectedStoreId: selectedStoreId ? Number(selectedStoreId) : undefined,
  };
};

export const mapOfferToCoupon = (dto: any): Coupon => {
  const isPercentage =
    dto.discountTypeID === 1 ||
    dto.discountTypeID === 2 ||
    dto.discountTypeName?.toLowerCase().includes('percent');
  return {
    code: dto.couponCode || `OFFER${dto.offerID}`,
    title: dto.offerName || 'Special Discount',
    description: dto.offerMessage || dto.offerName || 'Valid on all grocery products',
    discountType: isPercentage ? 'percentage' : 'flat',
    discountValue: Number(dto.discountValue || 0),
    minOrderValue: Number(dto.minPurchaseAmount || 0),
    maxDiscount: dto.maxDiscountAmount ? Number(dto.maxDiscountAmount) : undefined,
    expiryDate: dto.validTo || undefined,
  };
};

export const mapOffer = (dto: any): Offer => {
  const coupon = mapOfferToCoupon(dto);
  const firstCat = dto.categories && dto.categories.length > 0 ? dto.categories[0] : null;
  const firstProd = dto.products && dto.products.length > 0 ? dto.products[0] : null;

  return {
    id: String(dto.offerID || dto.id || ''),
    title: dto.offerName || '',
    code: coupon.code,
    description: coupon.description,
    discountPercent: coupon.discountType === 'percentage' ? coupon.discountValue : undefined,
    discountValue: Number(dto.discountValue || 0),
    discountTypeName: dto.discountTypeName || (coupon.discountType === 'percentage' ? 'PERCENTAGE' : 'FLAT'),
    minOrder: coupon.minOrderValue,
    maxDiscount: coupon.maxDiscount,
    image: resolveImageUrl(dto.imageUrl || dto.image || '') || undefined,
    offerScope: dto.offerScope || undefined,
    offerType: dto.offerType || undefined,
    categoryId: firstCat ? String(firstCat.categoryID) : undefined,
    categoryName: firstCat ? firstCat.categoryName : undefined,
    productId: firstProd ? String(firstProd.productID) : undefined,
    productName: firstProd ? firstProd.productName : undefined,
    validFrom: dto.validFrom || undefined,
    validUntil: dto.validTo || undefined,
    type: dto.couponCode ? 'coupon' : 'deal',
    isActive: typeof dto.isActive === 'boolean' ? dto.isActive : true,
    isExpired: typeof dto.isExpired === 'boolean' ? dto.isExpired : false,
    applicableDaysReadable: dto.applicableDaysReadable || undefined,
    offerMessage: dto.offerMessage || dto.offerName || '',
    categories: dto.categories?.map((c: any) => ({
      id: String(c.categoryID),
      name: c.categoryName,
    })),
    products: dto.products?.map((p: any) => ({
      id: String(p.productID),
      name: p.productName,
    })),
  };
};

export const mapBackendStatusToOrderStatus = (backendStatus: string): OrderStatus => {
  const s = (backendStatus || '').trim().toLowerCase();
  switch (s) {
    case 'pending':
    case 'placed':
      return 'Placed';
    case 'confirmed':
      return 'Confirmed';
    case 'processing':
    case 'preparing':
      return 'Preparing';
    case 'shipped':
    case 'out for delivery':
      return 'Out for Delivery';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
    case 'canceled':
      return 'Cancelled';
    default:
      return 'Placed';
  }
};

export const getUpdatedTrackingSteps = (
  newStatus: OrderStatus,
  currentSteps?: OrderStatusStep[]
): OrderStatusStep[] => {
  const baseSteps: { status: OrderStatus; label: string; defaultDate: string }[] = [
    { status: 'Placed', label: 'Order Placed', defaultDate: 'Order placed' },
    { status: 'Confirmed', label: 'Order Confirmed', defaultDate: 'Order confirmed' },
    { status: 'Preparing', label: 'Packed & Dispatched', defaultDate: 'Packed & dispatched' },
    { status: 'Out for Delivery', label: 'Out for Delivery', defaultDate: 'Out for delivery' },
    { status: 'Delivered', label: 'Delivered', defaultDate: 'Delivered' },
  ];

  if (newStatus === 'Cancelled') {
    const existing = currentSteps || [];
    const hasCancelled = existing.some((s) => s.status === 'Cancelled');
    if (hasCancelled) return existing;
    return [
      ...existing.map((s) => ({ ...s, current: false })),
      {
        status: 'Cancelled',
        label: 'Cancelled',
        date: 'Order was cancelled',
        completed: true,
        current: true,
      },
    ];
  }

  const statusOrder: OrderStatus[] = [
    'Placed',
    'Confirmed',
    'Preparing',
    'Out for Delivery',
    'Delivered',
  ];

  const targetIndex = statusOrder.indexOf(newStatus);

  return baseSteps.map((base, idx) => {
    const existingMatch = currentSteps?.find((s) => s.status === base.status);
    const isCompleted = idx <= targetIndex;
    const isCurrent = idx === targetIndex;

    return {
      status: base.status,
      label: base.label,
      date: isCurrent
        ? 'Current status'
        : existingMatch?.date || (isCompleted ? base.defaultDate : undefined),
      completed: isCompleted,
      current: isCurrent,
    };
  });
};

export const mapOrder = (masterDto: any, itemsDto: any[] = []): Order => {
  const items: OrderItem[] = itemsDto.map((item: any) => {
    const rawImg = item.imageUrl || item.imageURL || item.ImageUrl || item.image || item.productImage;
    return {
      id: String(item.orderItemID || item.id || ''),
      productId: String(item.productID || item.productId || ''),
      productName: item.productName || 'Grocery Item',
      brand: item.brandName || item.brand || 'Fresh Daily',
      image: resolveImageUrl(rawImg),
      variantName: item.variantLabel || item.unit || 'Standard',
      quantity: Number(item.quantity || 1),
      price: Number(item.price || 0),
      totalPrice: Number(item.total || item.price * (item.quantity || 1)),
    };
  });

  const mappedStatus = mapBackendStatusToOrderStatus(masterDto.status);
  const trackingSteps: OrderStatusStep[] = getUpdatedTrackingSteps(mappedStatus);

  const subtotal = Number(masterDto.itemTotal || 0);
  const discount = Number(masterDto.discountTotal || 0);
  const deliveryCharge = Number(masterDto.deliveryFee || 0);
  const tax = Number(masterDto.taxes || 0);
  const total = masterDto.grandTotal != null ? Number(masterDto.grandTotal) : Math.max(0, subtotal - discount + deliveryCharge + tax);

  return {
    id: String(masterDto.orderID || masterDto.id || ''),
    orderNumber: masterDto.orderNumber || `ORD-${masterDto.orderID}`,
    date: masterDto.createdDate || new Date().toISOString(),
    status: mappedStatus,
    items,
    subtotal,
    discount,
    couponDiscount: 0,
    deliveryCharge,
    tax,
    total,
    address: {
      id: String(masterDto.AddressId || ''),
      name: 'Registered Address',
      phone: '',
      doorFlat: '',
      street: '',
      area: '',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '',
      type: 'Home',
      isDefault: true,
    },
    paymentMethod: (masterDto.paymentMode?.toLowerCase() as any) || 'cod',
    trackingSteps,
    // estimatedDelivery: 'Today, 6:00 PM - 8:00 PM',
    storeId: masterDto.storeID != null ? Number(masterDto.storeID) : undefined,
    customerId:
      masterDto.userID != null || masterDto.userId != null || masterDto.customerId != null
        ? String(masterDto.userID ?? masterDto.userId ?? masterDto.customerId)
        : undefined,
  };
};

export const mapStore = (dto: any): Store => {
  return {
    id: Number(dto.storeID ?? dto.id ?? 0),
    storeCode: dto.storeCode || '',
    name: (dto.storeName || dto.name || '').trim(),
    ownerName: dto.ownerName || undefined,
    addressLine1: dto.addressLine1 || undefined,
    addressLine2: dto.addressLine2 || undefined,
    addressLine3: dto.addressLine3 || undefined,
    email: dto.email || undefined,
    phone: dto.phone || undefined,
    district: dto.district || undefined,
    state: dto.state || undefined,
    pincode: dto.pincode ? String(dto.pincode).trim() : '',
    isActive: dto.isActive !== false,
    logoUrl: dto.effectiveLogoUrl || dto.storeLogoUrl || undefined,
  };
};

export const mapBrand = (dto: any): Brand => {
  const rawImg = dto.imageUrl || dto.image || dto.logoUrl;
  return {
    id: String(dto.productBrandMasterID || dto.id || ''),
    name: dto.productBrandName || dto.name || '',
    code: dto.brandCode || '',
    storeId: Number(dto.storeID || dto.storeId || 0),
    image: resolveImageUrl(rawImg) || undefined,
    isActive: dto.isActive !== false,
  };
};

export const normalizeActionType = (raw?: string | null): BannerActionType => {
  if (!raw) return 'NONE';
  const upper = raw.trim().toUpperCase();
  if (upper === 'CATEGORY' || upper === 'PRODUCT' || upper === 'BRAND' || upper === 'OFFER') {
    return upper as BannerActionType;
  }
  return 'NONE';
};

export const isBannerDateValid = (startDate?: string | null, endDate?: string | null): boolean => {
  const now = new Date();
  if (startDate) {
    const start = new Date(startDate);
    if (!isNaN(start.getTime()) && start > now) {
      return false;
    }
  }
  if (endDate) {
    const end = new Date(endDate);
    if (!isNaN(end.getTime()) && end < now) {
      return false;
    }
  }
  return true;
};

export const mapBanner = (dto: any): Banner => {
  const actionType = normalizeActionType(dto.actionType);
  const actionVal = dto.actionValue != null ? String(dto.actionValue).trim() : undefined;
  const rawTitle = dto.bannerTitle || dto.title || '';
  const rawSub = dto.bannerSubtitle || dto.subtitle || undefined;
  const rawDiscount = dto.discountText || dto.badge || undefined;
  const rawBtn = dto.buttonText || undefined;
  const rawImg = dto.imageUrl || dto.image || undefined;
  const resolvedBannerImg = resolveImageUrl(rawImg);

  return {
    id: String(dto.bannerID || dto.id || ''),
    title: rawTitle ? String(rawTitle).trim() : '',
    subtitle: rawSub ? String(rawSub).trim() : undefined,
    discountText: rawDiscount ? String(rawDiscount).trim() : undefined,
    buttonText: rawBtn ? String(rawBtn).trim() : undefined,
    image: resolvedBannerImg || undefined,
    cloudinaryPublicID: dto.cloudinaryPublicID || undefined,
    actionType,
    actionValue: actionVal || undefined,
    storeId: dto.storeID != null ? Number(dto.storeID) : undefined,
    displayOrder: Number(dto.displayOrder ?? 0),
    isActive: dto.isActive !== false,
    startDate: dto.startDate || undefined,
    endDate: dto.endDate || undefined,
    badge: rawDiscount ? String(rawDiscount).trim() : undefined,
    categoryId: actionType === 'CATEGORY' && actionVal ? actionVal : undefined,
    backgroundColor: dto.backgroundColor || undefined,
  };
};

