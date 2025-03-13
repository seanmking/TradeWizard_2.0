"use client";

import React, { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import { useInView } from 'react-intersection-observer';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isCompletionMessage?: boolean;
}

interface ConversationThreadProps {
  messages: Message[];
  isTyping: boolean;
  conversationEndRef: React.RefObject<HTMLDivElement>;
}

const ConversationThread: React.FC<ConversationThreadProps> = ({ 
  messages, 
  isTyping, 
  conversationEndRef 
}) => {
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Use intersection observer for virtualization on long conversations
  const { ref: virtualScrollRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });
  
  // Keep track of the last message that was in view
  const lastVisibleMessageRef = useRef<number>(messages.length - 1);
  
  useEffect(() => {
    if (inView) {
      lastVisibleMessageRef.current = messages.length - 1;
    }
  }, [inView, messages.length]);
  
  // Only render messages that are close to the viewport
  // On mobile, render fewer messages to improve performance
  const visibleMessageCount = isMobile ? 5 : 10;
  const visibleMessages = messages.slice(
    Math.max(0, lastVisibleMessageRef.current - visibleMessageCount),
    messages.length
  );
  
  return (
    <div className={`space-y-4 ${isMobile ? 'px-2' : 'px-4'}`}>
      {/* Virtualization reference point */}
      <div ref={virtualScrollRef} className="h-1" />
      
      {visibleMessages.map((message, index) => (
        <MessageBubble
          key={message.id}
          content={message.content}
          sender={message.sender}
          timestamp={message.timestamp}
          isTyping={index === visibleMessages.length - 1 && isTyping && message.sender === 'assistant'}
          isLastMessage={index === visibleMessages.length - 1}
          isCompletionMessage={message.isCompletionMessage}
        />
      ))}
      
      {/* Typing indicator for new messages */}
      {isTyping && messages[messages.length - 1]?.sender === 'user' && (
        <MessageBubble
          content=""
          sender="assistant"
          timestamp={new Date()}
          isTyping={true}
          isLastMessage={true}
        />
      )}
      
      {/* Invisible element to scroll to */}
      <div ref={conversationEndRef} />
    </div>
  );
};

// Mock implementation of useInView if not available
const useInViewMock = (options: any) => {
  return {
    ref: useRef(null),
    inView: true,
  };
};

// Use the real implementation if available, otherwise use the mock
const useInViewImplementation = typeof useInView === 'function' ? useInView : useInViewMock;

export default ConversationThread; 