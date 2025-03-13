"use client";

import React, { useState, useRef, useEffect } from 'react';

interface UserInputProps {
  onSubmit: (input: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const UserInput: React.FC<UserInputProps> = ({
  onSubmit,
  disabled = false,
  placeholder = 'Type your message...'
}) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
  
  // Focus input when component mounts or disabled state changes
  useEffect(() => {
    if (!disabled && inputRef.current && !isMobile) {
      inputRef.current.focus();
    }
  }, [disabled, isMobile]);
  
  // Auto-resize textarea based on content
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setInput(textarea.value);
    
    // Reset height to auto to correctly calculate new height
    textarea.style.height = 'auto';
    // Set new height based on scrollHeight (min: 40px, max: 200px on desktop, 120px on mobile)
    const maxHeight = isMobile ? 120 : 200;
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 40), maxHeight)}px`;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (input.trim() && !disabled) {
      onSubmit(input.trim());
      setInput('');
      
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter key (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <form 
      onSubmit={handleSubmit}
      className={`flex items-end ${isMobile ? 'px-2 pb-2' : ''}`}
      aria-label="Message input form"
    >
      <div className="relative flex-1">
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="user-input animate-fade-in"
          style={{ 
            minHeight: '40px', 
            maxHeight: isMobile ? '120px' : '200px',
            fontSize: isMobile ? '16px' : 'inherit' // Prevent zoom on mobile
          }}
          rows={1}
          aria-label="Message input"
        />
        {input.length > 0 && (
          <button
            type="button"
            onClick={() => setInput('')}
            className="absolute right-12 bottom-3 text-gray-400 hover:text-gray-600"
            aria-label="Clear input"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={!input.trim() || disabled}
        className={`send-button ${!input.trim() || disabled ? 'send-button-disabled' : ''}`}
        aria-label="Send message"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
        </svg>
      </button>
    </form>
  );
};

export default UserInput; 