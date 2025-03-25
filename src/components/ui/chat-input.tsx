import * as React from 'react';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';

export interface ChatInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSend: (message: string) => void;
  isLoading?: boolean;
}

export function ChatInput({ 
  className, 
  onSend,
  isLoading = false,
  ...props 
}: ChatInputProps) {
  const [message, setMessage] = React.useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message);
      setMessage('');
    }
  };

  return (
    <form 
      className={cn("flex items-center space-x-2 p-2 border-t border-neutral-200 bg-white", className)}
      onSubmit={handleSubmit}
    >
      <input
        type="text"
        className="flex-1 p-3 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        disabled={isLoading}
        {...props}
      />
      <button 
        type="submit"
        disabled={!message.trim() || isLoading}
        className={cn(
          "p-3 rounded-full bg-primary-500 text-white",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-colors hover:bg-primary-600"
        )}
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
} 