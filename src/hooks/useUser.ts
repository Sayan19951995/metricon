'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getStale, setCache } from '@/lib/cache';
import { getUTM, clearUTM } from '@/lib/utm';

interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

interface Store {
  id: string;
  name: string;
  kaspi_merchant_id: string | null;
  kaspi_api_key: string | null;
  whatsapp_connected: boolean | null;
  [key: string]: unknown;
}

interface Subscription {
  id: string;
  plan: string | null;
  status: string | null;
  addons: string[] | null;
  start_date: string | null;
  end_date: string | null;
  auto_renew: boolean | null;
}

type UserRole = 'owner' | 'admin' | 'manager' | 'warehouse' | 'viewer';

interface UserData {
  user: User | null;
  store: Store | null;
  subscription: Subscription | null;
  role: UserRole;
  loading: boolean;
  error: string | null;
}

const CACHE_KEY = 'user_data';
const IMPERSONATE_KEY = 'admin_impersonating';

export function useUser(): UserData & { impersonating: boolean; stopImpersonating: () => void } {
  const stale = getStale<{ user: User; store: Store | null; subscription: Subscription | null }>(CACHE_KEY);
  const cached = stale?.data ?? null;

  const [data, setData] = useState<UserData>({
    user: cached?.user || null,
    store: cached?.store || null,
    subscription: cached?.subscription || null,
    role: (cached as any)?.role || 'owner',
    loading: !cached,
    error: null
  });

  const [impersonating, setImpersonating] = useState(false);

  const stopImpersonating = () => {
    localStorage.removeItem(IMPERSONATE_KEY);
    setImpersonating(false);
    window.location.href = '/admin/users';
  };

  useEffect(() => {
    async function fetchUserData() {
      try {
        // getSession читает из localStorage — мгновенно, без сети
        const { data: { session } } = await supabase.auth.getSession();
        let authUser = session?.user ?? null;

        // Если нет сессии в localStorage — пробуем сеть
        if (!authUser) {
          authUser = (await supabase.auth.getUser()).data.user;
        }

        if (!authUser) {
          setData(prev => ({
            ...prev,
            loading: false,
            error: 'Не авторизован'
          }));
          return;
        }

        // Check for impersonation
        const impersonateRaw = localStorage.getItem(IMPERSONATE_KEY);
        let targetUserId: string | null = null;
        if (impersonateRaw) {
          try {
            const imp = JSON.parse(impersonateRaw);
            // Only impersonate if the current auth user is the admin who started it
            if (imp.adminId === authUser.id && imp.targetId) {
              targetUserId = imp.targetId;
              setImpersonating(true);
            }
          } catch { /* ignore bad JSON */ }
        }

        const lookupUserId = targetUserId || authUser.id;

        // Ищем пользователя в таблице users
        let { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', lookupUserId)
          .single();

        // Если не найден по id, ищем по email
        if (userError && userError.code === 'PGRST116') {
          const { data: userByEmail } = await supabase
            .from('users')
            .select('*')
            .eq('email', authUser.email!)
            .single();

          if (userByEmail) {
            user = userByEmail;
          } else if (targetUserId) {
            // Impersonating a non-existent user — bail
            localStorage.removeItem(IMPERSONATE_KEY);
            setImpersonating(false);
            setData(prev => ({ ...prev, loading: false, error: 'Пользователь не найден' }));
            return;
          } else {
            // Создаём запись (первый вход через Google)
            const name = authUser.user_metadata?.full_name
              || authUser.user_metadata?.name
              || authUser.email?.split('@')[0]
              || 'Пользователь';

            const utm = getUTM();
            const { data: newUser, error: createError } = await supabase
              .from('users')
              .insert({
                id: authUser.id,
                email: authUser.email!,
                name: name,
                ...utm,
              } as any)
              .select()
              .single();

            if (createError) {
              console.error('Error creating user:', createError);
            } else {
              user = newUser;
              clearUTM();

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
          const fallbackName = authUser.user_metadata?.full_name
            || authUser.user_metadata?.name
            || authUser.email?.split('@')[0]
            || 'Пользователь';

          const result = {
            user: { id: authUser.id, email: authUser.email || '', name: fallbackName, phone: null, avatar_url: null, created_at: null },
            store: null,
            subscription: null,
            role: 'owner' as UserRole,
          };
          setCache(CACHE_KEY, result);
          setData({ ...result, loading: false, error: null });
          return;
        }

        // Магазин и подписка — параллельно
        const [storeResult, subResult] = await Promise.all([
          supabase.from('stores').select('*').eq('user_id', user.id).single(),
          supabase.from('subscriptions').select('*').eq('user_id', user.id).single()
        ]);

        if (storeResult.error && storeResult.error.code !== 'PGRST116') {
          console.error('Store error:', storeResult.error);
        }
        if (subResult.error && subResult.error.code !== 'PGRST116') {
          console.error('Subscription error:', subResult.error);
        }

        let store = storeResult.data || null;
        let role: UserRole = 'owner';

        if (!store) {
          // Возможно, это член команды — ищем через team_members
          const { data: membership } = await supabase
            .from('team_members' as any)
            .select('store_id, role')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

          if (membership) {
            const { data: teamStore } = await supabase
              .from('stores')
              .select('*')
              .eq('id', (membership as any).store_id)
              .single();
            store = teamStore || null;
            role = ((membership as any).role as UserRole) || 'viewer';
          }
        }

        const result = {
          user,
          store,
          subscription: subResult.data || null,
          role,
        };
        setCache(CACHE_KEY, result);
        setData({ ...result, loading: false, error: null });

      } catch (err) {
        const message = err instanceof Error ? err.message
          : (err as { message?: string })?.message || JSON.stringify(err) || 'Unknown error';

        // JWT expired — обновляем сессию и перезагружаем
        if (message.includes('JWT expired') || message.includes('jwt expired')) {
          console.warn('useUser: JWT expired, refreshing session...');
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            fetchUserData(); // retry with fresh token
            return;
          }
          console.error('useUser: refresh failed, redirecting to login');
          setData(prev => ({ ...prev, loading: false, error: 'Сессия истекла' }));
          return;
        }

        console.error('useUser error:', message, err);
        setData(prev => ({
          ...prev,
          loading: false,
          error: message,
        }));
      }
    }

    fetchUserData();

    // Слушаем изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        fetchUserData();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { ...data, impersonating, stopImpersonating };
}
