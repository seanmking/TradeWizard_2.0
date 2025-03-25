import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { SLIDE_IN_RIGHT } from '@/lib/animation';

export interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  sender: 'user' | 'assistant';
  isTyping?: boolean;
}

export function ChatBubble({
  className,
  children,
  sender,
  isTyping = false,
  ...props
}: ChatBubbleProps) {
  return (
    <motion.div
      className={cn(
        "p-4 rounded-xl max-w-[85%] mb-4",
        sender === 'user' 
          ? "bg-primary-100 text-primary-900 ml-auto rounded-tr-none" 
          : "bg-neutral-100 text-neutral-900 mr-auto rounded-tl-none",
        className
      )}
      initial="hidden"
      animate="visible"
      variants={SLIDE_IN_RIGHT}
      {...props}
    >
      {isTyping ? (
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      ) : (
        children
      )}
    </motion.div>
  );
} 