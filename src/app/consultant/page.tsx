import * as React from 'react';
import { SarahChatInterface } from '@/components/sarah/chat-interface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ConsultantPage() {
  const initialMessages = [
    {
      id: '1',
      content: "Hi there! I'm Sarah, your dedicated export consultant. I can help you with any questions about exporting your products, market research, documentation, and more. How can I assist you today?",
      sender: 'assistant' as const
    }
  ];

  const handleSendMessage = async (message: string) => {
    console.log("Message sent:", message);
    // In a real implementation, this would call your AI service
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Sarah AI Consultant</h1>
        <p className="text-neutral-500 mt-1">Your personal export specialist</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SarahChatInterface
            initialMessages={initialMessages}
            onSendMessage={handleSendMessage}
          />
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Suggested Topics</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="p-3 bg-neutral-50 rounded-md text-sm hover:bg-neutral-100 cursor-pointer transition-colors">
                  What documents do I need for exporting to the EU?
                </li>
                <li className="p-3 bg-neutral-50 rounded-md text-sm hover:bg-neutral-100 cursor-pointer transition-colors">
                  How can I find international distributors?
                </li>
                <li className="p-3 bg-neutral-50 rounded-md text-sm hover:bg-neutral-100 cursor-pointer transition-colors">
                  What are the best markets for my products?
                </li>
                <li className="p-3 bg-neutral-50 rounded-md text-sm hover:bg-neutral-100 cursor-pointer transition-colors">
                  How do I calculate export pricing?
                </li>
              </ul>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="border-b pb-2">
                  <p className="text-sm font-medium">Export documentation</p>
                  <p className="text-xs text-neutral-500">3 days ago</p>
                </div>
                <div className="border-b pb-2">
                  <p className="text-sm font-medium">Market research for textiles</p>
                  <p className="text-xs text-neutral-500">1 week ago</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Shipping requirements</p>
                  <p className="text-xs text-neutral-500">2 weeks ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
} 