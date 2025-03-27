'use client';

import { useEffect } from 'react';
import { JourneyTimeline } from '@/components/JourneyTimeline';
import { JourneyDetailDrawer } from '@/components/JourneyDetailDrawer';
import { WeeklyDigestPanel } from '@/components/WeeklyDigestPanel';
import { ReminderManager } from '@/components/ReminderManager';
import { MarketInsightCard } from '@/components/MarketInsightCard';
import { useJourneyStore } from '@/state/useJourneyStore';
import { useEngagementStore } from '@/state/useEngagementStore';
import { mockInsights, mockReminders, mockWeeklyProgress } from '@/data/mockEngagement';
import { Toaster } from 'react-hot-toast';

export default function JourneyPage() {
  const { setCurrentPhase, currentPhase } = useJourneyStore();
  const { insights, addInsight, addReminder, updateWeeklyProgress } = useEngagementStore();

  // Initialize mock data
  useEffect(() => {
    mockInsights.forEach(insight =>
      addInsight({
        title: insight.title,
        summary: insight.summary,
        actionCTA: insight.actionCTA,
        relevantPhases: insight.relevantPhases,
      })
    );

    mockReminders.forEach(reminder =>
      addReminder({
        task: reminder.task,
        dueDate: reminder.dueDate,
        phaseId: reminder.phaseId,
      })
    );

    updateWeeklyProgress(mockWeeklyProgress);
  }, [addInsight, addReminder, updateWeeklyProgress]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Export Journey</h1>
          <div className="flex space-x-4">
            <ReminderManager />
            <WeeklyDigestPanel />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Timeline */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-lg shadow p-6">
              <JourneyTimeline />
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Market Insights */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Market Insights</h2>
              {insights.map(insight => (
                <MarketInsightCard
                  key={insight.id}
                  insightId={insight.id}
                  onActionClick={() => {
                    // When an insight action is clicked, set the current phase
                    // to the first relevant phase for that insight
                    if (insight.relevantPhases.length > 0) {
                      setCurrentPhase(insight.relevantPhases[0]);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Phase Details Drawer */}
        {currentPhase && (
          <JourneyDetailDrawer isOpen={!!currentPhase} onClose={() => setCurrentPhase(null)} />
        )}
      </div>
    </div>
  );
}
