import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Lock, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface MissionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  status: 'locked' | 'available' | 'completed';
  completion?: number; // 0-100
}

export function MissionCard({
  className,
  title,
  description,
  status,
  completion = 0,
  ...props
}: MissionCardProps) {
  return (
    <Card
      className={cn(
        "border-l-4 transition-all duration-300",
        status === 'locked' ? "border-l-neutral-300 bg-neutral-50" : "",
        status === 'available' ? "border-l-primary-500 hover:shadow-md" : "",
        status === 'completed' ? "border-l-accent-500" : "",
        className
      )}
      interactive={status === 'available'}
      {...props}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className={cn(
            status === 'locked' ? "text-neutral-400" : ""
          )}>
            {title}
          </CardTitle>
          {status === 'locked' && <Lock className="w-5 h-5 text-neutral-400" />}
          {status === 'available' && <Circle className="w-5 h-5 text-primary-500" />}
          {status === 'completed' && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              <CheckCircle className="w-5 h-5 text-accent-500" />
            </motion.div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className={cn(
          "text-sm",
          status === 'locked' ? "text-neutral-400" : "text-neutral-600"
        )}>
          {description}
        </p>
        
        {(status === 'available' || status === 'completed') && completion > 0 && (
          <div className="mt-3">
            <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
              <motion.div 
                className={cn(
                  "h-full rounded-full",
                  status === 'completed' ? "bg-accent-500" : "bg-primary-500"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1 text-right">{completion}% complete</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 