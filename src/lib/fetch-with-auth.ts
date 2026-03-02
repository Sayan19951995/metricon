import { supabase } from '@/lib/supabase/client';

const IMPERSONATE_KEY = 'admin_impersonating';

/**
 * Враппер над fetch() — автоматически добавляет JWT токен
 * в Authorization header и поддерживает админ-имперсонацию.
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(options.headers);

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  // Если админ имперсонирует — передаём target userId
  if (typeof window !== 'undefined') {
    try {
      const impRaw = localStorage.getItem(IMPERSONATE_KEY);
      if (impRaw) {
        const imp = JSON.parse(impRaw);
        if (imp.targetId) {
          headers.set('X-Impersonate-User', imp.targetId);
        }
      }
    } catch { /* ignore */ }
  }

  return fetch(url, { ...options, headers });
}
