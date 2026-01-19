export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password: string
          name: string | null
          kaspi_connected: boolean
          kaspi_merchant_id: string | null
          kaspi_api_key: string | null
          kaspi_api_secret: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password: string
          name?: string | null
          kaspi_connected?: boolean
          kaspi_merchant_id?: string | null
          kaspi_api_key?: string | null
          kaspi_api_secret?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password?: string
          name?: string | null
          kaspi_connected?: boolean
          kaspi_merchant_id?: string | null
          kaspi_api_key?: string | null
          kaspi_api_secret?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          kaspi_order_code: string
          total_price: number
          customer_name: string
          customer_phone: string | null
          delivery_address: string | null
          state: string
          created_date: string
          approved_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          kaspi_order_code: string
          total_price: number
          customer_name: string
          customer_phone?: string | null
          delivery_address?: string | null
          state: string
          created_date: string
          approved_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          kaspi_order_code?: string
          total_price?: number
          customer_name?: string
          customer_phone?: string | null
          delivery_address?: string | null
          state?: string
          created_date?: string
          approved_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      order_entries: {
        Row: {
          id: string
          order_id: string
          product_sku: string
          product_name: string
          quantity: number
          price: number
          total: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_sku: string
          product_name: string
          quantity: number
          price: number
          total: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_sku?: string
          product_name?: string
          quantity?: number
          price?: number
          total?: number
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          user_id: string
          sku: string
          name: string
          price: number
          available_amount: number
          reserved_amount: number
          image_url: string | null
          category: string | null
          brand: string | null
          min_price: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sku: string
          name: string
          price: number
          available_amount?: number
          reserved_amount?: number
          image_url?: string | null
          category?: string | null
          brand?: string | null
          min_price?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sku?: string
          name?: string
          price?: number
          available_amount?: number
          reserved_amount?: number
          image_url?: string | null
          category?: string | null
          brand?: string | null
          min_price?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      product_analytics: {
        Row: {
          id: string
          product_sku: string
          user_id: string
          date: string
          views: number
          orders: number
          revenue: number
          conversion_rate: number
          created_at: string
        }
        Insert: {
          id?: string
          product_sku: string
          user_id: string
          date: string
          views?: number
          orders?: number
          revenue?: number
          conversion_rate?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_sku?: string
          user_id?: string
          date?: string
          views?: number
          orders?: number
          revenue?: number
          conversion_rate?: number
          created_at?: string
        }
      }
      financial_metrics: {
        Row: {
          id: string
          user_id: string
          date: string
          total_revenue: number
          kaspi_commission: number
          net_profit: number
          total_orders: number
          average_check: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          total_revenue?: number
          kaspi_commission?: number
          net_profit?: number
          total_orders?: number
          average_check?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          total_revenue?: number
          kaspi_commission?: number
          net_profit?: number
          total_orders?: number
          average_check?: number
          created_at?: string
        }
      }
      competitor_prices: {
        Row: {
          id: string
          product_sku: string
          user_id: string
          competitor_name: string
          competitor_price: number
          checked_at: string
          created_at: string
        }
        Insert: {
          id?: string
          product_sku: string
          user_id: string
          competitor_name: string
          competitor_price: number
          checked_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          product_sku?: string
          user_id?: string
          competitor_name?: string
          competitor_price?: number
          checked_at?: string
          created_at?: string
        }
      }
      price_rules: {
        Row: {
          id: string
          product_sku: string
          user_id: string
          min_price: number
          dumping_amount: number
          auto_update: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_sku: string
          user_id: string
          min_price: number
          dumping_amount?: number
          auto_update?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_sku?: string
          user_id?: string
          min_price?: number
          dumping_amount?: number
          auto_update?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      price_history: {
        Row: {
          id: string
          product_sku: string
          user_id: string
          old_price: number
          new_price: number
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          product_sku: string
          user_id: string
          old_price: number
          new_price: number
          reason: string
          created_at?: string
        }
        Update: {
          id?: string
          product_sku?: string
          user_id?: string
          old_price?: number
          new_price?: number
          reason?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
