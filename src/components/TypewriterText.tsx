import { useState, useEffect } from "react";

interface TypewriterTextProps {
  prefix: string;
  highlight: string;
  suffix?: string;
  typingSpeed?: number;
  startDelay?: number;
  className?: string;
  highlightClassName?: string;
}

export function TypewriterText({
  prefix,
  highlight,
  suffix = "",
  typingSpeed = 100,
  startDelay = 400,
  className = "",
  highlightClassName = "text-primary",
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Full text to type
  const fullText = `${prefix} ${highlight}${suffix ? ` ${suffix}` : ""}`;
  const highlightStart = prefix.length + 1; // +1 for space
  const highlightEnd = highlightStart + highlight.length;

  useEffect(() => {
    // Reset state
    setDisplayedText("");
    setIsTyping(false);
    setIsDone(false);

    // Start typing after delay
    const startTimer = setTimeout(() => {
      setIsTyping(true);
    }, startDelay);

    return () => clearTimeout(startTimer);
  }, [prefix, highlight, suffix, startDelay]);

  useEffect(() => {
    if (!isTyping || isDone) return;

    if (displayedText.length < fullText.length) {
      const timer = setTimeout(() => {
        setDisplayedText(fullText.slice(0, displayedText.length + 1));
      }, typingSpeed);
      return () => clearTimeout(timer);
    } else {
      setIsDone(true);
    }
  }, [isTyping, displayedText, fullText, typingSpeed, isDone]);

  // Build the rendered text with proper highlighting
  const renderText = () => {
    const chars = displayedText.split("");
    return chars.map((char, index) => {
      const isHighlighted = index >= highlightStart && index < highlightEnd;
      return (
        <span
          key={index}
          className={isHighlighted ? highlightClassName : undefined}
        >
          {char}
        </span>
      );
    });
  };

  return (
    <h2 className={className}>
      <span className="typing-animation-container">
        {renderText()}
        <span
          className={isDone ? "typing-cursor-fade" : "typing-cursor-active"}
          aria-hidden="true"
        />
      </span>
    </h2>
  );
}
