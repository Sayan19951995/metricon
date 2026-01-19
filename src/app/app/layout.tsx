'use client';

import { SessionProvider } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-[#fafafa]">
        {/* Sidebar - Фиксированный слева */}
        <Sidebar />

        {/* Main Content - с отступом слева */}
        <main className="ml-64 min-h-screen">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
