'use client';

import { SessionProvider } from 'next-auth/react';
import AdminSidebar from './components/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-100">
        <AdminSidebar />
        <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
