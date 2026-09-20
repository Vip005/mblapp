import type { NavigatorScreenParams } from '@react-navigation/native';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  isLoggedIn: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  itemCount: number;
  icon?: string;
  color?: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  unit: string;
  price: number;
  originalPrice: number;
  stock: number;
  isAvailable: boolean;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
  description: string;
  highlights?: string[];
  image: string;
  gallery?: string[];
  rating: number;
  reviewCount: number;
  stock: number;
  isAvailable: boolean;
  tags: string[];
  originalPrice: number;
  sellingPrice: number;
  discount: number; // percentage e.g. 20
  variants: ProductVariant[];
  isFeatured?: boolean;
  isFlashDeal?: boolean;
  isPopular?: boolean;
  storeId?: number;
}

export interface Brand {
  id: string;
  name: string;
  code: string;
  storeId: number;
  image?: string;
  isActive: boolean;
}

export interface BackendCartMaster {
  cartID: number;
  storeID: number;
  customerId: number;
  deliveryFee: number | null;
  platformFee: number | null;
  taxPercentage: number | null;
  createdDate?: string | null;
  modifiedDate?: string | null;
}

export interface BackendCartItemMaster {
  cartItemID: number;
  cartID: number;
  productVariantID: number;
  productID: number;
  quantity: number;
  price: number;
  createdBy?: string | null;
  modifiedBy?: string | null;
  createdDate?: string | null;
  modifiedDate?: string | null;
}

export interface CartItem {
  id: string; // unique item id e.g. productId_variantId
  backendCartItemId?: number;
  backendCartId?: number;
  productId: string;
  variantId: string;
  product: Product;
  variant: ProductVariant;
  quantity: number;
  price: number;
  totalPrice: number;
  storeId?: number;
}

export interface Coupon {
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  expiryDate?: string;
}

export interface CartSummary {
  subtotal: number;
  productDiscount: number;
  couponDiscount: number;
  deliveryCharge: number;
  platformFee: number;
  taxPercentage: number;
  tax: number;
  total: number;
  appliedCoupon: Coupon | null;
  freeDeliveryThreshold: number;
  freeDeliveryRemaining: number;
}

export type AddressType = 'Home' | 'Work' | 'Other';

export interface Address {
  id: string;
  name: string;
  phone: string;
  doorFlat: string;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  type: AddressType;
  isDefault: boolean;
}

export interface Store {
  id: number;
  storeCode: string;
  name: string;
  ownerName?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  addressLine3?: string | null;
  email?: string;
  phone?: string;
  district?: string;
  state?: string;
  pincode: string;
  isActive: boolean;
  logoUrl?: string | null;
}

export interface DeliverySlot {
  id: string;
  dateLabel: string; // e.g. "Today", "Tomorrow"
  timeWindow: string; // e.g. "10:00 AM - 12:00 PM"
  isAvailable: boolean;
}

export type PaymentMethodType = 'cod' | 'upi' | 'card' | 'wallet';

export interface PaymentMethodOption {
  id: PaymentMethodType;
  title: string;
  description: string;
  icon: string;
}

export type OrderStatus =
  | 'Placed'
  | 'Confirmed'
  | 'Preparing'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export interface OrderStatusStep {
  status: OrderStatus;
  label: string;
  date?: string;
  completed: boolean;
  current: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  brand: string;
  image: string;
  variantName: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "ORD-20260915-001"
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponDiscount: number;
  deliveryCharge: number;
  tax: number;
  total: number;
  address: Address;
  deliverySlot: DeliverySlot;
  paymentMethod: PaymentMethodType;
  appliedCoupon?: Coupon | null;
  trackingSteps: OrderStatusStep[];
  estimatedDelivery: string;
  storeId?: number;
}

export type BannerActionType = 'CATEGORY' | 'PRODUCT' | 'BRAND' | 'OFFER' | 'NONE';

export interface BannerMasterDto {
  bannerID?: number;
  bannerTitle?: string;
  bannerSubtitle?: string | null;
  discountText?: string | null;
  buttonText?: string | null;
  imageUrl?: string | null;
  cloudinaryPublicID?: string | null;
  actionType?: string | null;
  actionValue?: string | null;
  storeID?: number | null;
  displayOrder?: number | null;
  isActive?: boolean | null;
  startDate?: string | null;
  endDate?: string | null;
  storeName?: string | null;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  discountText?: string;
  buttonText?: string;
  image?: string;
  cloudinaryPublicID?: string;
  actionType: BannerActionType;
  actionValue?: string;
  storeId?: number;
  displayOrder: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  badge?: string;
  categoryId?: string;
  backgroundColor?: string;
}


export interface Offer {
  id: string;
  title: string;
  code: string;
  description: string;
  discountPercent?: number;
  minOrder?: number;
  image?: string;
  categoryId?: string;
  validUntil?: string;
  type: 'coupon' | 'deal' | 'combo';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  type: 'order' | 'offer' | 'promo' | 'system';
  orderId?: string;
}

export interface FilterOptions {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStockOnly?: boolean;
  brand?: string;
}

export type SortOption =
  | 'popularity'
  | 'price_asc'
  | 'price_desc'
  | 'rating'
  | 'newest';

// Navigation Param Lists
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ProductListing: { categoryId?: string; title?: string; query?: string; offerId?: string; brand?: string };
  ProductDetails: { productId: string };
  Search: undefined;
  Wishlist: undefined;
  Cart: undefined;
  Checkout: undefined;
  OrderSuccess: { orderId: string };
  OrderDetails: { orderId: string };
  Orders: undefined;
  Addresses: undefined;
  Notifications: undefined;
  Offers: undefined;
  Settings: undefined;
  EditProfile: undefined;
  NameUpdate: undefined;
  PrimaryAddress: undefined;
  StoreSelection: { customerPincode?: string } | undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  Otp: { phone: string; devOtp?: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  CategoriesTab: undefined;
  CartTab: undefined;
  OrdersTab: undefined;
  ProfileTab: undefined;
};
