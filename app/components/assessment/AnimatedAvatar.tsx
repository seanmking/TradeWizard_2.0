"use client";

import React, { useState, useEffect } from 'react';

interface AnimatedAvatarProps {
  isTyping?: boolean;
}

const AnimatedAvatar: React.FC<AnimatedAvatarProps> = ({ isTyping = false }) => {
  // Use a safer approach for avatar: handle missing image gracefully
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
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
  
  // Animate when typing state changes
  useEffect(() => {
    if (isTyping) {
      setIsAnimating(true);
    } else {
      // Add a small delay before stopping animation
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isTyping]);
  
  // Determine animation class based on device
  const getAnimationClass = () => {
    if (!isAnimating) return '';
    
    // Use lighter animations on mobile for better performance
    return isMobile ? 'animate-fade-in' : 'animate-pulse';
  };
  
  return (
    <div 
      className={`avatar-container ${isTyping ? 'avatar-typing' : ''} ${getAnimationClass()}`}
      aria-label="Virtual assistant Sarah"
      style={{ 
        width: isMobile ? '32px' : '40px',
        height: isMobile ? '32px' : '40px',
        position: 'relative',
        borderRadius: '50%',
        overflow: 'hidden',
        backgroundColor: '#3b82f6', // Fallback blue background
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: '500'
      }}
    >
      {/* Always show initials as fallback */}
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: imageLoaded ? 0 : 1
      }}>
        {isMobile ? 'S' : 'SA'}
      </div>
      
      {/* Try to load avatar image */}
      <img
        src="/images/sarah-avatar.png"
        alt=""
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageLoaded(false)}
        style={{ 
          position: 'absolute',
          inset: 0,
          width: '100%', 
          height: '100%', 
          objectFit: 'cover',
          zIndex: 1,
          display: imageLoaded ? 'block' : 'none'
        }}
      />
      
      {/* Typing animation indicator */}
      {isTyping && (
        <div 
          style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            width: isMobile ? '8px' : '12px',
            height: isMobile ? '8px' : '12px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            zIndex: 2,
            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default AnimatedAvatar; 