import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database';
import type { UserRole } from '@/lib/permissions';

// Серверный клиент с service role — нужен чтобы обойти RLS в API-роутах
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface AuthUser {
  id: string;
  email: string;
}

/**
 * Извлекает и верифицирует JWT из Authorization header.
 * Поддерживает админ-имперсонацию через X-Impersonate-User.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  if (!token) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  // Поддержка имперсонации — админ может смотреть данные клиента
  const impersonateId = request.headers.get('x-impersonate-user');
  if (impersonateId && impersonateId !== user.id) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if ((data as any)?.is_admin) {
      const { data: target } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('id', impersonateId)
        .single();
      if (target) return { id: target.id, email: target.email };
    }
  }

  return { id: user.id, email: user.email || '' };
}

/**
 * getAuthUser + автоматический 401 ответ.
 * Используй в начале каждого API handler'а.
 */
export async function requireAuth(request: NextRequest): Promise<
  { user: AuthUser } | { error: NextResponse }
> {
  const user = await getAuthUser(request);
  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Не авторизован' },
        { status: 401 }
      ),
    };
  }
  return { user };
}

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
