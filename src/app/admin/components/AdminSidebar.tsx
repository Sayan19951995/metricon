'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Menu, X, LayoutDashboard, Users, CreditCard, ArrowLeft } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

const navigation: NavItem[] = [
  {
    name: 'Дашборд',
    href: '/admin',
    icon: <LayoutDashboard className="w-5 h-5" />
  },
  {
    name: 'Пользователи',
    href: '/admin/users',
    icon: <Users className="w-5 h-5" />
  },
  {
    name: 'Подписки',
    href: '/admin/subscriptions',
    icon: <CreditCard className="w-5 h-5" />
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Секретный доступ к аналитике - 5 кликов на версии
  const handleSecretClick = () => {
    clickCountRef.current += 1;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      router.push('/admin/x7k9m2p4q8r1');
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 1500);
    }
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const isActive = (item: NavItem) => {
    return pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
  };

  const SidebarContent = () => (
    <>
      {/* Логотип */}
      <div className="p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-6 lg:mb-8">
          <div className="w-10 h-10 bg-red-500/20 backdrop-blur rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="text-white">
            <div className="font-bold text-lg tracking-wider">METRICON</div>
            <div className="text-xs text-red-400 font-medium">ADMIN</div>
          </div>
        </div>
      </div>

      {/* Навигация */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
              isActive(item)
                ? 'bg-red-500/20 text-red-400'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
            )}
          >
            {item.icon}
            <span className="flex-1">{item.name}</span>
          </Link>
        ))}

        {/* Вернуться в приложение */}
        <div className="pt-4 mt-4 border-t border-white/10">
          <Link
            href="/app"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>В приложение</span>
          </Link>
        </div>
      </nav>

      {/* Футер */}
      <div className="p-4">
        <div
          onClick={handleSecretClick}
          className="text-xs text-white/30 text-center cursor-default select-none"
        >
          Metricon Admin v1.0
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-gray-900 to-gray-800 flex items-center justify-between px-4 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500/20 backdrop-blur rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <span className="text-white font-bold tracking-wider">METRICON</span>
            <span className="text-red-400 text-xs ml-1 font-medium">ADMIN</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={cn(
          'lg:hidden fixed top-16 left-0 bottom-0 w-72 bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col shadow-xl z-50 transform transition-transform duration-300 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-gray-900 to-gray-800 flex-col shadow-xl z-40">
        <SidebarContent />
      </div>
    </>
  );
}
