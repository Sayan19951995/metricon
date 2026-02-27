'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BrandLoader from '@/components/ui/BrandLoader';
import { useUser } from '@/hooks/useUser';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, error, impersonating, stopImpersonating } = useUser();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user && error) {
      // Не авторизован — редирект на логин
      router.replace('/login');
    } else {
      setChecked(true);
    }
  }, [user, loading, error, router]);

  // Пока проверяем авторизацию — показываем заглушку
  if (loading || !checked) {
    return <BrandLoader />;
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Impersonation banner */}
      {impersonating && user && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-lg">
          <span>Вы вошли как <strong>{user.name}</strong> ({user.email})</span>
          <button
            onClick={stopImpersonating}
            className="px-3 py-1 bg-white text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-50 transition-colors"
          >
            Выйти
          </button>
        </div>
      )}

      {/* Sidebar - Фиксированный слева */}
      <Sidebar />

      {/* Main Content - с отступом слева на десктопе, сверху на мобильных */}
      <main className={`lg:ml-[72px] min-h-screen pt-16 lg:pt-0 ${impersonating ? 'mt-10' : ''}`}>
        {children}
      </main>
    </div>
  );
}
