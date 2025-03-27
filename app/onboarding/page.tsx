'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface Message {
  id: string;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

interface AssessmentState {
  step: number;
  businessName?: string;
  productType?: string;
  website?: string;
  targetMarkets: string[];
  dimensions: {
    [key: string]: number;
  };
}

export default function OnboardingPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [assessment, setAssessment] = useState<AssessmentState>({
    step: 0,
    targetMarkets: [],
    dimensions: {}
  });

  // Initial greeting
  useEffect(() => {
    const initialMessage = {
      id: '1',
      type: 'ai' as const,
      content: "Hi there! I'm Sarah, your export readiness consultant at TradeWizard. To start, can you tell me your name, role, and business name?",
      timestamp: new Date()
    };
    setMessages([initialMessage]);
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response based on assessment step
    setTimeout(() => {
      let aiResponse: string;
      switch (assessment.step) {
        case 0:
          aiResponse = "Great to meet you! I see you're interested in exporting. Could you tell me a bit about your products or share your website? This will help me understand your business better.";
          setAssessment(prev => ({ ...prev, step: 1 }));
          break;
        case 1:
          aiResponse = "Thanks for sharing that information! Which markets are you most interested in exploring for export? We currently support detailed analysis for UAE, USA, and UK.";
          setAssessment(prev => ({ ...prev, step: 2 }));
          break;
        case 2:
          aiResponse = "Excellent choice! Now, I'd like to assess your export readiness across 8 key dimensions. This will help us create your personalized roadmap. Shall we start with Production Readiness?";
          setAssessment(prev => ({ ...prev, step: 3 }));
          break;
        default:
          aiResponse = "I understand. Let's continue with the assessment. [This is a demo - full assessment flow to be implemented]";
      }

      const aiMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto pt-8 px-4">
        {/* Chat Interface */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Chat Header */}
          <div className="bg-blue-600 p-4 text-white flex items-center">
            <div className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-lg">
              S
            </div>
            <div className="ml-3">
              <h2 className="font-semibold">Sarah</h2>
              <p className="text-sm text-blue-100">Export Readiness Consultant</p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="h-[600px] overflow-y-auto p-4 space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t">
            <div className="flex space-x-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 