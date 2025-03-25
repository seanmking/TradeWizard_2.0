import * as React from 'react';
import { NavLink } from '@/components/ui/nav-link';
import { UserProfile } from '@/components/ui/user-profile';
import { cn } from '@/lib/utils';
import { 
  Home, 
  BarChart3, 
  Globe, 
  ShoppingCart, 
  FileText, 
  MessageSquare, 
  Settings 
} from 'lucide-react';

interface SideNavProps {
  className?: string;
}

export function SideNav({ className }: SideNavProps) {
  return (
    <div className={cn(
      "flex flex-col h-screen border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
      "w-20 lg:w-64 shrink-0 sticky top-0",
      className
    )}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded bg-primary-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">TW</span>
          </div>
          <span className="hidden lg:block text-lg font-bold">TradeWizard</span>
        </div>
      </div>
      
      {/* Navigation Items */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-3 space-y-1">
          <NavLink href="/dashboard" label="Dashboard" icon={Home} exact />
          <NavLink href="/missions" label="Export Missions" icon={BarChart3} />
          <NavLink href="/markets" label="Global Markets" icon={Globe} />
          <NavLink href="/products" label="Product Catalog" icon={ShoppingCart} />
          <NavLink href="/documents" label="Export Documents" icon={FileText} />
          <NavLink href="/consultant" label="Sarah AI" icon={MessageSquare} />
          <NavLink href="/settings" label="Settings" icon={Settings} />
        </div>
      </nav>
      
      {/* User Profile */}
      <div className="mt-auto">
        <UserProfile name="John Smith" email="john@example.com" />
      </div>
    </div>
  );
} 