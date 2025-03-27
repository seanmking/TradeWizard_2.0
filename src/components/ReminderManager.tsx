import React, { useEffect } from 'react';
import { useEngagementStore } from '../state/useEngagementStore';
import { toast } from 'react-hot-toast';

export const ReminderManager: React.FC = () => {
  const { activeReminders, completeReminder } = useEngagementStore();

  useEffect(() => {
    // Check for due reminders every minute
    const interval = setInterval(() => {
      const now = new Date();
      activeReminders
        .filter(reminder => !reminder.isCompleted)
        .forEach(reminder => {
          const dueDate = new Date(reminder.dueDate);
          const daysUntilDue = Math.ceil(
            (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilDue <= 2 && daysUntilDue > 0) {
            toast(
              <div className="flex flex-col gap-2">
                <p className="font-medium">Task Due Soon</p>
                <p className="text-sm">
                  {reminder.task} is due in {daysUntilDue} days
                </p>
                <button
                  onClick={() => completeReminder(reminder.id)}
                  className="mt-2 rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
                >
                  Mark Complete
                </button>
              </div>,
              {
                duration: 5000,
                position: 'top-right',
              }
            );
          } else if (daysUntilDue <= 0) {
            toast(
              <div className="flex flex-col gap-2">
                <p className="font-medium text-red-500">Task Overdue</p>
                <p className="text-sm">
                  {reminder.task} was due {Math.abs(daysUntilDue)} days ago
                </p>
                <button
                  onClick={() => completeReminder(reminder.id)}
                  className="mt-2 rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
                >
                  Mark Complete
                </button>
              </div>,
              {
                duration: 5000,
                position: 'top-right',
              }
            );
          }
        });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [activeReminders, completeReminder]);

  // This component doesn't render anything
  return null;
};
