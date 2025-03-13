import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './styles/assessment.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TradeWizard 2.0',
  description: 'AI-powered export readiness platform for South African SMEs',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
} 