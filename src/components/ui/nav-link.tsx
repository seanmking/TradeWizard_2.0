import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface NavLinkProps {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  className?: string;
}

export function NavLink({ href, label, icon: Icon, exact = false, className }: NavLinkProps) {
  const pathname = usePathname() || '';
  const isActive = exact 
    ? pathname === href
    : pathname.startsWith(href);

  return (
    <Link 
      href={href}
      className={cn(
        "flex items-center gap-3 py-3 px-4 text-sm font-medium rounded-md transition-all",
        "border-l-4 lg:hover:bg-neutral-100 dark:lg:hover:bg-neutral-800",
        isActive 
          ? "text-primary-700 border-primary-500 bg-primary-50 dark:text-primary-300 dark:border-primary-400 dark:bg-primary-900/20" 
          : "text-neutral-600 border-transparent hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200",
        className
      )}
    >
      <Icon size={20} className={isActive ? "text-primary-500" : "text-neutral-500"} />
      <span className="hidden lg:block">{label}</span>
    </Link>
  );
} 