import { createClient } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/permissions';

// Серверный клиент с service role — нужен чтобы обойти RLS в API-роутах
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface StoreAndRole {
  store: { id: string; name: string; user_id: string | null };
  role: UserRole;
}

/**
 * Определяет магазин и роль пользователя.
 * Работает и для владельца (stores.user_id) и для участника команды (team_members.user_id).
 */
export async function getStoreAndRole(userId: string): Promise<StoreAndRole | null> {
  // 1. Проверяем, является ли пользователь владельцем магазина
  const { data: ownStore } = await supabaseAdmin
    .from('stores')
    .select('id, name, user_id')
    .eq('user_id', userId)
    .single();

  if (ownStore) {
    return { store: ownStore, role: 'owner' };
  }

  // 2. Проверяем, является ли участником команды
  const { data: member } = await supabaseAdmin
    .from('team_members' as any)
    .select('store_id, role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (member) {
    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id, name, user_id')
      .eq('id', (member as any).store_id)
      .single();

    if (store) {
      return { store, role: ((member as any).role as UserRole) || 'viewer' };
    }
  }

  return null;
}

/**
 * Проверяет, что у пользователя есть одна из разрешённых ролей.
 * Возвращает { store, role } или { error }.
 */
export async function requireRole(
  userId: string,
  allowedRoles: UserRole[]
): Promise<{ store: StoreAndRole['store']; role: UserRole } | { error: string }> {
  const result = await getStoreAndRole(userId);

  if (!result) {
    return { error: 'Магазин не найден' };
  }

  if (!allowedRoles.includes(result.role)) {
    return { error: 'Недостаточно прав' };
  }

  return result;
}
