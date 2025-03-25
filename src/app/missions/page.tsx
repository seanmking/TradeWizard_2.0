import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MissionCard } from '@/components/ui/mission-card';

export default function MissionsPage() {
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
    },
    {
      title: "Develop Export Plan",
      description: "Create a comprehensive strategy for your export business",
      status: "locked" as const,
      completion: 0
    },
    {
      title: "Prepare Documentation",
      description: "Get your export documents and certifications ready",
      status: "locked" as const,
      completion: 0
    },
    {
      title: "Find International Partners",
      description: "Connect with distributors and partners in target markets",
      status: "locked" as const,
      completion: 0
    }
  ];

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Export Missions</h1>
        <p className="text-neutral-500 mt-1">Complete these missions to become export-ready</p>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Mission Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-600">1 of 6 missions completed</span>
            <span className="text-sm font-semibold">16%</span>
          </div>
          <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-primary-500" style={{ width: "16%" }} />
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    </>
  );
} 