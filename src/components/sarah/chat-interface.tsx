import * as React from 'react';
import { ChatBubble } from '@/components/ui/chat-bubble';
import { ChatInput } from '@/components/ui/chat-input';
import { motion } from 'framer-motion';
import { FADE_IN_ANIMATION } from '@/lib/animation';

export interface Message {
  id: string;
  content: string | React.ReactNode;
  sender: 'user' | 'assistant';
}

export interface ChatInterfaceProps {
  initialMessages?: Message[];
  onSendMessage: (message: string) => Promise<void>;
  isProcessing?: boolean;
  className?: string;
}

export function SarahChatInterface({
  initialMessages = [],
  onSendMessage,
  isProcessing = false,
  className,
}: ChatInterfaceProps) {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  // Add a new message from the user
  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content,
      sender: 'user',
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    try {
      await onSendMessage(content);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Handle error if needed
    }
  };
  
  // Scroll to the bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <motion.div 
      className={className}
      initial="hidden"
      animate="visible"
      variants={FADE_IN_ANIMATION}
    >
      <div className="bg-primary-500 text-white p-4 rounded-t-xl">
        <h2 className="text-lg font-semibold">Sarah - Export Consultant</h2>
        <p className="text-sm opacity-80">Ask me anything about exporting your products</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-white border-x border-neutral-200 min-h-[400px] max-h-[500px]">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            sender={message.sender}
          >
            {message.content}
          </ChatBubble>
        ))}
        
        {isProcessing && (
          <ChatBubble
            sender="assistant"
            isTyping
          />
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput
        onSend={handleSendMessage}
        isLoading={isProcessing}
        className="border-x border-b border-neutral-200 rounded-b-xl"
      />
    </motion.div>
  );
} 