import * as React from 'react';
import { SarahChatInterface } from '@/components/sarah/chat-interface';
import { MissionCard } from '@/components/ui/mission-card';
import { ScoreDial } from '@/components/ui/score-dial';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function DashboardPage() {
  const initialMessages = [
    {
      id: '1',
      content: "Hi there! I'm Sarah, your export readiness consultant. I'm here to help you assess if your business is ready to start exporting. What products are you looking to export?",
      sender: 'assistant' as const
    }
  ];

  const missions = [
    {
      title: "Complete Business Profile",
      description: "Add your business details and product information",
      status: "completed" as const,
      completion: 100
    },
    {
      title: "Assess Export Readiness",
      description: "Determine if your business is ready to export",
      status: "available" as const,
      completion: 30
    },
    {
      title: "Explore Market Opportunities",
      description: "Find the best markets for your products",
      status: "locked" as const,
      completion: 0
    }
  ];

  const handleSendMessage = async (message: string) => {
    console.log("Message sent:", message);
    // In a real implementation, this would call your AI service
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Export Dashboard</h1>
        <p className="text-neutral-500 mt-1">Your export journey at a glance</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SarahChatInterface
            initialMessages={initialMessages}
            onSendMessage={handleSendMessage}
          />
          
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">Your Export Missions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {missions.map((mission, i) => (
                <MissionCard
                  key={i}
                  title={mission.title}
                  description={mission.description}
                  status={mission.status}
                  completion={mission.completion}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Export Readiness</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <ScoreDial value={68} size={160} />
              
              <div className="grid grid-cols-2 gap-4 mt-6 w-full">
                <div className="flex flex-col items-center">
                  <ScoreDial value={72} size={80} strokeWidth={8} />
                  <p className="mt-2 text-sm font-medium">Compliance</p>
                </div>
                <div className="flex flex-col items-center">
                  <ScoreDial value={65} size={80} strokeWidth={8} />
                  <p className="mt-2 text-sm font-medium">Operations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-6 bg-primary-50 border-primary-100">
            <CardContent className="pt-6">
              <h3 className="font-medium text-primary-700">Continue Your Assessment</h3>
              <p className="text-sm text-primary-600 mt-1">You're making great progress! Complete the next phase to unlock market opportunities.</p>
              <button className="mt-4 w-full bg-primary-500 text-white py-2 rounded-md hover:bg-primary-600 transition-colors">
                Continue
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
} 