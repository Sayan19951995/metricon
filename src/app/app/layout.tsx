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
  const { user, loading, error } = useUser();
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
      {/* Sidebar - Фиксированный слева */}
      <Sidebar />

      {/* Main Content - с отступом слева на десктопе, сверху на мобильных */}
      <main className="lg:ml-[72px] min-h-screen pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
