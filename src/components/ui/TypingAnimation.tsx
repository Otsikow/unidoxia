import { useEffect, useState } from 'react';

interface TypingAnimationProps {
  text: string;
  speed?: number; // milliseconds per character
  className?: string;
  onComplete?: () => void;
}

export function TypingAnimation({ 
  text, 
  speed = 100, 
  className = '',
  onComplete 
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let currentIndex = 0;
    
    // Start typing animation
    const typingInterval = window.setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex += 1;
      } else {
        // Typing complete
        setIsTyping(false);
        window.clearInterval(typingInterval);
        
        // Call onComplete after a brief delay
        setTimeout(() => {
          onComplete?.();
        }, 500);
      }
    }, speed);

    return () => {
      window.clearInterval(typingInterval);
    };
  }, [text, speed, onComplete]);

  return (
    <span className={`typing-animation-container ${className}`}>
      {displayedText.split('').map((char, index) => (
        <span
          key={index}
          className="typing-letter"
          style={{
            animationDelay: `${index * (speed / 1000)}s`,
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
      {isTyping && (
        <span className="typing-cursor-active" />
      )}
      {!isTyping && (
        <span className="typing-cursor-fade" />
      )}
    </span>
  );
}
