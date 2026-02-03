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
  kaspi_api_key?: string;
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
        // Получаем авторизованного пользователя из Supabase Auth
        let authUser = (await supabase.auth.getUser()).data.user;

        // Fallback: getSession читает из localStorage без сетевого запроса
        if (!authUser) {
          const { data: { session } } = await supabase.auth.getSession();
          authUser = session?.user ?? null;
        }

        if (!authUser) {
          setData(prev => ({
            ...prev,
            loading: false,
            error: 'Не авторизован'
          }));
          return;
        }

        // Ищем пользователя в таблице users
        let { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        // Если не найден по id, ищем по email
        if (userError && userError.code === 'PGRST116') {
          const { data: userByEmail } = await supabase
            .from('users')
            .select('*')
            .eq('email', authUser.email)
            .single();

          if (userByEmail) {
            user = userByEmail;
          } else {
            // Создаём запись (первый вход через Google)
            const name = authUser.user_metadata?.full_name
              || authUser.user_metadata?.name
              || authUser.email?.split('@')[0]
              || 'Пользователь';

            const { data: newUser, error: createError } = await supabase
              .from('users')
              .insert({
                id: authUser.id,
                email: authUser.email,
                name: name,
              })
              .select()
              .single();

            if (createError) {
              console.error('Error creating user:', createError);
            } else {
              user = newUser;

              // Создаём бесплатную подписку для нового пользователя
              await supabase.from('subscriptions').insert({
                user_id: authUser.id,
                plan: 'start',
                status: 'active',
                start_date: new Date().toISOString().split('T')[0],
                auto_renew: true
              });
            }
          }
        } else if (userError) {
          throw userError;
        }

        if (!user) {
          // Fallback: используем данные из auth metadata (Google OAuth)
          const fallbackName = authUser.user_metadata?.full_name
            || authUser.user_metadata?.name
            || authUser.email?.split('@')[0]
            || 'Пользователь';

          setData({
            user: {
              id: authUser.id,
              email: authUser.email || '',
              name: fallbackName,
            },
            store: null,
            subscription: null,
            loading: false,
            error: null
          });
          return;
        }

        // Получаем магазин пользователя
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (storeError && storeError.code !== 'PGRST116') {
          console.error('Store error:', storeError);
        }

        // Получаем подписку
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (subError && subError.code !== 'PGRST116') {
          console.error('Subscription error:', subError);
        }

        setData({
          user,
          store: store || null,
          subscription: subscription || null,
          loading: false,
          error: null
        });

      } catch (err) {
        console.error('useUser error:', err);
        setData(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }));
      }
    }

    fetchUserData();

    // Слушаем изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchUserData();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return data;
}
