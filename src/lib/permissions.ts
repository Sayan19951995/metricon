export type UserRole = 'owner' | 'admin' | 'manager' | 'warehouse' | 'viewer';

// Какие роли имеют доступ к какому разделу
const routeAccess: Record<string, UserRole[]> = {
  '/app':             ['owner', 'admin', 'viewer'],
  '/app/products':    ['owner', 'admin', 'viewer'],
  '/app/orders':      ['owner', 'admin', 'manager', 'viewer'],
  '/app/warehouse':   ['owner', 'admin', 'warehouse'],
  '/app/advertising': ['owner', 'admin'],
  '/app/expenses':    ['owner', 'admin'],
  '/app/analytics':   ['owner', 'admin', 'viewer'],
  '/app/auto-mailing':['owner', 'admin'],
  '/app/auto-pricing':['owner', 'admin'],
  '/app/settings':    ['owner', 'admin'],
  '/app/subscription':['owner'],
  '/app/profile':     ['owner', 'admin', 'manager', 'warehouse', 'viewer'],
};

// Какие роли могут РЕДАКТИРОВАТЬ (viewer может только смотреть)
const writeAccess: Record<string, UserRole[]> = {
  '/app/products':  ['owner', 'admin'],
  '/app/orders':    ['owner', 'admin', 'manager'],
  '/app/warehouse': ['owner', 'admin', 'warehouse'],
};

/**
 * Проверяет, есть ли у роли доступ к данному пути.
 * Для вложенных путей (/app/settings/team) проверяет родительский (/app/settings).
 */
export function canAccess(role: UserRole, path: string): boolean {
  // Точное совпадение
  if (routeAccess[path]) {
    return routeAccess[path].includes(role);
  }

  // Поиск ближайшего родительского пути
  const segments = path.split('/');
  while (segments.length > 1) {
    segments.pop();
    const parent = segments.join('/');
    if (routeAccess[parent]) {
      return routeAccess[parent].includes(role);
    }
  }

  // Путь не найден — доступ разрешён (безопасный default для неизвестных путей)
  return true;
}

/**
 * Проверяет, может ли роль редактировать данные на этом пути.
 * Если путь не в writeAccess — редактирование разрешено по умолчанию (для owner/admin страниц).
 */
export function canWrite(role: UserRole, path: string): boolean {
  if (writeAccess[path]) {
    return writeAccess[path].includes(role);
  }

  const segments = path.split('/');
  while (segments.length > 1) {
    segments.pop();
    const parent = segments.join('/');
    if (writeAccess[parent]) {
      return writeAccess[parent].includes(role);
    }
  }

  return true;
}
