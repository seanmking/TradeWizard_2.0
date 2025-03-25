import * as React from 'react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export default function ConsultantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
} 