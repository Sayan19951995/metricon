'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

interface Store {
  id: string;
  name: string;
  kaspi_merchant_id?: string;
  whatsapp_connected: boolean;
}

interface Subscription {
  id: string;
  plan: 'start' | 'business' | 'pro';
  status: 'active' | 'cancelled' | 'expired';
  addons: string[];
  start_date: string;
  end_date: string;
  auto_renew: boolean;
}

interface UserData {
  user: User | null;
  store: Store | null;
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
}

export function useUser(): UserData {
  const [data, setData] = useState<UserData>({
    user: null,
    store: null,
    subscription: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    async function fetchUserData() {
      try {
        // Пока берём тестового пользователя
        // TODO: заменить на авторизованного пользователя
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', 'test@luxstone.kz')
          .single();

        if (userError) throw userError;

        // Получаем магазин пользователя
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (storeError && storeError.code !== 'PGRST116') throw storeError;

        // Получаем подписку
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (subError && subError.code !== 'PGRST116') throw subError;

        setData({
          user,
          store,
          subscription,
          loading: false,
          error: null
        });

      } catch (err) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }));
      }
    }

    fetchUserData();
  }, []);

  return data;
}
