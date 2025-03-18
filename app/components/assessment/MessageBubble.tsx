"use client";

import React, { useEffect, useState, useRef } from 'react';
import AnimatedAvatar from './AnimatedAvatar';

interface MessageBubbleProps {
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
  isLastMessage?: boolean;
  isCompletionMessage?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  content, 
  sender, 
  timestamp, 
  isTyping = false,
  isLastMessage = false,
  isCompletionMessage = false
}) => {
  const isAssistant = sender === 'assistant';
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  
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
  
  // Format time as HH:MM - ensuring consistency between server and client rendering
  // Use a simple HH:MM format instead of locale-dependent format to avoid hydration errors
  const formattedTime = () => {
    const hours = timestamp.getHours();
    const minutes = timestamp.getMinutes().toString().padStart(2, '0');
    const formattedHours = hours % 12 || 12; // Convert 0 to 12 for 12-hour format
    return `${formattedHours}:${minutes}`;
  };
  
  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Scroll into view if this is the last message
  useEffect(() => {
    if (isLastMessage && messageRef.current && isVisible) {
      messageRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end' 
      });
    }
  }, [isLastMessage, isVisible]);
  
  // Determine animation class based on sender and device
  const getAnimationClass = () => {
    if (!isVisible) return '';
    
    if (isAssistant) {
      return isMobile ? 'animate-fade-in' : 'animate-slide-in-left';
    } else {
      return isMobile ? 'animate-fade-in' : 'animate-slide-in-right';
    }
  };
  
  return (
    <div 
      ref={messageRef}
      className={`flex items-start mb-4 ${isAssistant ? 'justify-start' : 'justify-end'}`}
      aria-live={isAssistant ? 'polite' : 'off'}
    >
      {isAssistant && (
        <div className={`mr-2 flex-shrink-0 ${isMobile ? 'scale-90' : ''}`}>
          <AnimatedAvatar isTyping={isTyping} />
        </div>
      )}
      
      <div className={`
        ${isAssistant ? 'message-bubble-assistant' : 'message-bubble-user'}
        ${isCompletionMessage ? 'completion-message pulse-animation' : ''}
        ${getAnimationClass()}
        ${isMobile ? 'text-sm py-2 px-3' : ''}
      `}>
        {content}
        
        {isTyping && isAssistant && (
          <div className="typing-animation flex space-x-1 mt-2 opacity-70" aria-label="Assistant is typing">
            <div></div>
            <div></div>
            <div></div>
          </div>
        )}
        
        <div className={`text-xs mt-1 ${isAssistant ? (isCompletionMessage ? 'text-green-100' : 'text-blue-100') : 'text-gray-500'}`}>
          {formattedTime()}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(22, 163, 74, 0); }
          100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }
        .pulse-animation {
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default MessageBubble; 