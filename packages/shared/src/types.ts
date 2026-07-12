export type Platform = 'ubereats' | 'thuisbezorgd';

// --- Restaurants & Menus ---

export interface Restaurant {
  id: string;
  platform: Platform;
  name: string;
  cuisine: string[];
  rating: number;
  delivery_time_min: number;
  delivery_fee: number;   // cents
  min_order: number;      // cents
  image_url?: string;
  source_id?: string;
  address?: {
    city?: string;
    street?: string;
    postcode?: string;
    latitude?: number;
    longitude?: number;
  };
  rating_count?: number;
  is_new?: boolean;
  distance_meters?: number;
  opening_time?: string;
  delivery_opening_time?: string;
  supports_delivery?: boolean;
  supports_collection?: boolean;
  open_for_delivery_now?: boolean;
  open_for_collection_now?: boolean;
  open_for_preorder_now?: boolean;
  temporarily_offline?: boolean;
  delivery_eta?: {
    approximate?: number;
    min?: number;
    max?: number;
  };
  delivery_fee_bands?: Array<{ minimum_order: number; fee: number }>;
  service_options?: Array<'delivery' | 'collection' | 'preorder'>;
  deals?: Array<{ description?: string; type?: string }>;
  tags?: unknown[];
  availability?: unknown;
  banner_url?: string;
  is_premier?: boolean;
  source_data?: Record<string, unknown>;
}

export interface MenuItemOption {
  id: string;
  name: string;
  price_delta: number;   // cents; 0 = free
}

export interface MenuOptionGroup {
  id: string;
  name: string;           // e.g. "Choose your size"
  required: boolean;
  min_selections: number;
  max_selections: number;
  options: MenuItemOption[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;          // base price in cents
  category: string;
  option_groups: MenuOptionGroup[];
  image_url?: string;
}

export interface MenuCategory {
  name: string;
  items: MenuItem[];
}

export interface RestaurantWithMenu extends Restaurant {
  categories: MenuCategory[];
}

// --- Cart ---

export interface CartItemOption {
  group_id: string;
  option_id: string;
}

export interface CartItem {
  item_id: string;
  name: string;
  quantity: number;
  unit_price: number;             // cents
  selected_options: CartItemOption[];
}

export interface Cart {
  restaurant_id: string;
  platform: Platform;
  items: CartItem[];
  subtotal: number;               // cents
  delivery_fee: number;           // cents
  total: number;                  // cents
}

// --- Orders ---

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'picked_up'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  platform: Platform;
  status: OrderStatus;
  restaurant_name: string;
  items: CartItem[];
  total: number;                  // cents
  placed_at: string;              // ISO 8601
  estimated_delivery?: string;    // ISO 8601
}

export interface OrderTracking {
  status: OrderStatus;
  details: string;
  raw_status?: string;
  is_active?: boolean;
  is_recent?: boolean;
  is_delayed?: boolean;
  delay?: string;
  initial_due_date?: string | null;
  current_due_date?: string | null;
  estimated_start?: string;
  estimated_end?: string;
  confidence?: string;
  service_type?: string;
  delivery_model?: string;
  is_for_delivery?: boolean;
  courier_tracking_available?: boolean;
  courier_chat_available?: boolean;
  history?: Array<{
    status: string;
    timestamp?: string;
    due_date?: string | null;
    confidence?: string;
    reason?: string;
  }>;
  upcoming?: string[];
}

// --- Account ---

export interface Address {
  id: string;
  label?: string;
  formatted: string;
  lat?: number;
  lng?: number;
}

export interface AddressInput {
  label?: string;
  street: string;
  street_number: string;
  postcode: string;
  city: string;
  floor?: string;
  apartment?: string;
  access_code?: string;
  notes?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'ideal' | 'cash' | 'other';
  label: string;                  // e.g. "Visa •••• 4242"
  is_default: boolean;
}

// --- Client contract ---

export interface SearchParams {
  location: string;
  cuisine?: string;
  query?: string;
  sort_by?: 'rating' | 'delivery_time' | 'delivery_fee';
  service_type?: 'delivery' | 'collection';
  open_now?: boolean;
}

export interface PlatformClient {
  searchRestaurants(params: SearchParams): Promise<Restaurant[]>;
  getRestaurant(restaurantId: string): Promise<RestaurantWithMenu>;
  getCart(): Promise<Cart | null>;
  addToCart(
    restaurantId: string,
    itemId: string,
    quantity: number,
    options?: CartItemOption[],
  ): Promise<Cart>;
  clearCart(): Promise<void>;
  getSavedAddresses(): Promise<Address[]>;
  addAddress?(address: AddressInput): Promise<Address>;
  updateAddress?(addressId: string, address: AddressInput): Promise<Address>;
  deleteAddress?(addressId: string): Promise<void>;
  getPaymentMethods(): Promise<PaymentMethod[]>;
  placeOrder(addressId: string, paymentMethodId: string): Promise<Order>;
  trackOrder(orderId: string): Promise<OrderTracking>;
  getOrderHistory(limit?: number): Promise<Order[]>;
  cancelOrder(orderId: string): Promise<void>;
}
