import * as React from 'react';
import { SideNav } from '@/components/navigation/side-nav';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-neutral-950">
      <SideNav />
      <main className="flex-1 pb-8">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
} 