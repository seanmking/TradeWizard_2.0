// Type declarations for components
declare module '*/ConversationThread' {
  import { RefObject } from 'react';
  
  interface Message {
    id: string;
    sender: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }
  
  interface ConversationThreadProps {
    messages: Message[];
    isTyping: boolean;
    conversationEndRef: RefObject<HTMLDivElement>;
  }
  
  const ConversationThread: React.FC<ConversationThreadProps>;
  export default ConversationThread;
}

declare module '*/UserInput' {
  interface UserInputProps {
    onSubmit: (input: string) => void;
    disabled?: boolean;
    placeholder?: string;
  }
  
  const UserInput: React.FC<UserInputProps>;
  export default UserInput;
}

declare module '*/ProgressIndicator' {
  interface ProgressIndicatorProps {
    currentStep: number;
    steps: number;
    isTransitioning?: boolean;
  }
  
  const ProgressIndicator: React.FC<ProgressIndicatorProps>;
  export default ProgressIndicator;
}

declare module '*/AnimatedAvatar' {
  interface AnimatedAvatarProps {
    isTyping?: boolean;
  }
  
  const AnimatedAvatar: React.FC<AnimatedAvatarProps>;
  export default AnimatedAvatar;
}

declare module 'react-intersection-observer' {
  export function useInView(options?: any): {
    ref: React.RefObject<any>;
    inView: boolean;
  };
} 