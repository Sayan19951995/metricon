import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Типы для таблиц
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  created_at: string;
}

export interface Store {
  id: string;
  user_id: string;
  name: string;
  kaspi_merchant_id?: string;
  whatsapp_connected: boolean;
  whatsapp_session?: string;
  created_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  kaspi_id?: string;
  name: string;
  sku?: string;
  price: number;
  cost_price?: number;
  quantity: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  store_id: string;
  kaspi_order_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address?: string;
  delivery_date?: string;
  status: 'new' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  items: OrderItem[];
  created_at: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

export interface MessageTemplate {
  id: string;
  store_id: string;
  trigger_type: 'order_created' | 'order_shipped' | 'order_delivered' | 'review_request';
  name: string;
  template_kz: string;
  template_ru: string;
  active: boolean;
  created_at: string;
}

export interface MessageLog {
  id: string;
  store_id: string;
  order_id: string;
  template_id: string;
  phone: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'start' | 'business' | 'pro';
  status: 'active' | 'cancelled' | 'expired';
  addons: string[];
  start_date: string;
  end_date: string;
  auto_renew: boolean;
}
