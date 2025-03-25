import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface ScoreDialProps extends React.SVGAttributes<SVGElement> {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  labelPosition?: 'inside' | 'below';
  animate?: boolean;
}

export function ScoreDial({
  className,
  value,
  size = 120,
  strokeWidth = 10,
  label,
  labelPosition = 'inside',
  animate = true,
  ...props
}: ScoreDialProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const valueInRange = Math.min(100, Math.max(0, value));
  const offset = circumference - (valueInRange / 100) * circumference;
  
  const getColor = (value: number): string => {
    if (value < 40) return 'text-secondary-500';
    if (value < 70) return 'text-primary-500';
    return 'text-accent-500';
  };
  
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        {...props}
      >
        <circle
          className="text-neutral-100"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className={getColor(value)}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animate ? circumference : offset}
          initial={animate ? { strokeDashoffset: circumference } : undefined}
          animate={animate ? { strokeDashoffset: offset } : undefined}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        {labelPosition === 'inside' && (
          <text
            x="50%"
            y="50%"
            dy=".3em"
            textAnchor="middle"
            className="text-2xl font-bold fill-current"
          >
            {value}%
          </text>
        )}
      </svg>
      {label && labelPosition === 'below' && (
        <div className="mt-2 text-center">
          <p className="text-sm font-medium text-neutral-600">{label}</p>
          <p className="text-2xl font-bold">{value}%</p>
        </div>
      )}
    </div>
  );
} 