import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, User } from 'lucide-react';

interface UserProfileProps {
  name?: string;
  email?: string;
  avatarUrl?: string;
  className?: string;
}

export function UserProfile({ 
  name = 'Guest User', 
  email = 'guest@example.com', 
  avatarUrl, 
  className 
}: UserProfileProps) {
  return (
    <div className={cn("flex items-center gap-3 p-4 border-t border-neutral-200 dark:border-neutral-700", className)}>
      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <User size={20} className="text-neutral-500" />
        )}
      </div>
      <div className="hidden lg:block min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="text-xs text-neutral-500 truncate">{email}</div>
      </div>
      <ChevronDown size={16} className="hidden lg:block text-neutral-500" />
    </div>
  );
} 