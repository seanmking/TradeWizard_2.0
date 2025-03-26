import React, { useState, useEffect, useRef } from 'react';
import { Socket, io } from 'socket.io-client';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ExportReadinessIndicator from './ExportReadinessIndicator';
import ProductAnalysisPane from './ProductAnalysisPane';
import CompetitiveAnalysisChart from './CompetitiveAnalysisChart';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  userId: string;
  onAssessmentProgress?: (stage: string) => void;
  onProductAnalysis?: (productData: any) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  userId, 
  onAssessmentProgress,
  onProductAnalysis
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState('');
  const [currentStage, setCurrentStage] = useState('initial');
  const [productAnalysisData, setProductAnalysisData] = useState<any>(null);
  const [competitiveData, setCompetitiveData] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:3001');
    setSocket(newSocket);
    
    // Socket event listeners
    newSocket.on('connect', () => {
      console.log('Socket connected');
      newSocket.emit('startConversation', { userId });
    });
    
    newSocket.on('conversation', (data) => {
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
      
      setMessages(prev => [...prev, data.message]);
      
      // Handle additional data
      if (data.additionalData) {
        if (data.additionalData.stage && data.additionalData.stage !== currentStage) {
          setCurrentStage(data.additionalData.stage);
          if (onAssessmentProgress) {
            onAssessmentProgress(data.additionalData.stage);
          }
        }
        
        if (data.additionalData.productAnalysis) {
          setProductAnalysisData(data.additionalData.productAnalysis);
          if (onProductAnalysis) {
            onProductAnalysis(data.additionalData.productAnalysis);
          }
        }
        
        if (data.additionalData.competitiveData) {
          setCompetitiveData(data.additionalData.competitiveData);
        }
      }
    });
    
    newSocket.on('typingStarted', () => setIsTyping(true));
    newSocket.on('typingStopped', () => setIsTyping(false));
    
    return () => {
      newSocket.disconnect();
    };
  }, [userId, onAssessmentProgress, onProductAnalysis]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);
  
  const handleSendMessage = () => {
    if (!input.trim() || !socket || !conversationId) return;
    
    // Add user message to local state
    setMessages(prev => [
      ...prev, 
      { role: 'user', content: input, timestamp: new Date() }
    ]);
    
    // Send message to server
    socket.emit('sendMessage', {
      conversationId,
      message: input
    });
    
    // Clear input
    setInput('');
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center p-4 bg-blue-600 text-white">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3">
          <span className="text-blue-600 font-bold">S</span>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Sarah • Export Readiness Consultant</h2>
          <p className="text-xs opacity-80">TradeWizard</p>
        </div>
      </div>
      
      <div className="relative flex-1 flex overflow-hidden">
        {/* Main chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <MessageBubble
                key={index}
                message={message}
                isUser={message.role === 'user'}
              />
            ))}
            
            {isTyping && <TypingIndicator />}
            
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex space-x-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={1}
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 self-end"
              >
                Send
              </button>
            </div>
          </div>
        </div>
        
        {/* Side panel with analysis data */}
        <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto hidden md:block">
          <div className="p-4">
            <ExportReadinessIndicator stage={currentStage} />
            
            {productAnalysisData && (
              <ProductAnalysisPane 
                productData={productAnalysisData} 
                className="mt-4"
              />
            )}
            
            {competitiveData && (
              <CompetitiveAnalysisChart 
                data={competitiveData} 
                className="mt-4"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface; 