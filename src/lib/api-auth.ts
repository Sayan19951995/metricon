import { supabase } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/permissions';

interface StoreAndRole {
  store: { id: string; name: string; user_id: string };
  role: UserRole;
}

/**
 * Определяет магазин и роль пользователя.
 * Работает и для владельца (stores.user_id) и для участника команды (team_members.user_id).
 */
export async function getStoreAndRole(userId: string): Promise<StoreAndRole | null> {
  // 1. Проверяем, является ли пользователь владельцем магазина
  const { data: ownStore } = await supabase
    .from('stores')
    .select('id, name, user_id')
    .eq('user_id', userId)
    .single();

  if (ownStore) {
    return { store: ownStore, role: 'owner' };
  }

  // 2. Проверяем, является ли участником команды
  const { data: member } = await supabase
    .from('team_members' as any)
    .select('store_id, role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (member) {
    const { data: store } = await supabase
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
