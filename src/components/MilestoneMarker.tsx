import React from 'react';
import { CheckCircleIcon, ClockIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { PhaseStatus } from '../data/journeyPhases';

interface MilestoneMarkerProps {
  status: PhaseStatus;
  className?: string;
}

const statusConfig = {
  completed: {
    icon: CheckCircleIcon,
    color: 'text-green-500',
    label: 'Completed',
  },
  'in-progress': {
    icon: ArrowPathIcon,
    color: 'text-blue-500',
    label: 'In Progress',
  },
  'not-started': {
    icon: ClockIcon,
    color: 'text-gray-400',
    label: 'Not Started',
  },
};

export const MilestoneMarker: React.FC<MilestoneMarkerProps> = ({ status, className = '' }) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Icon className={`h-5 w-5 ${config.color}`} />
      <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
    </div>
  );
};
