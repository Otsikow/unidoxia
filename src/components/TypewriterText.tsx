import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface TypewriterTextProps {
  prefix: string;
  highlight: string;
  /** Additional rotating phrases to cycle through after the main highlight */
  phrases?: string[];
  suffix?: string;
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  startDelay?: number;
  className?: string;
  highlightClassName?: string;
  /** Enable looping through phrases */
  loop?: boolean;
}

export function TypewriterText({
  prefix,
  highlight,
  phrases = [],
  suffix = "",
  typingSpeed = 80,
  deletingSpeed = 40,
  pauseDuration = 2500,
  startDelay = 400,
  className = "",
  highlightClassName = "text-primary",
  loop = true,
}: TypewriterTextProps) {
  // Combine highlight with additional phrases
  const allPhrases = [highlight, ...phrases];
  
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayedHighlight, setDisplayedHighlight] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const currentPhrase = allPhrases[currentPhraseIndex];

  // Start typing after initial delay
  useEffect(() => {
    const startTimer = setTimeout(() => {
      setHasStarted(true);
      setIsTyping(true);
    }, startDelay);
    return () => clearTimeout(startTimer);
  }, [startDelay]);

  const tick = useCallback(() => {
    if (!hasStarted || isPaused) return;

    if (isTyping && !isDeleting) {
      // Typing forward
      if (displayedHighlight.length < currentPhrase.length) {
        setDisplayedHighlight(currentPhrase.slice(0, displayedHighlight.length + 1));
      } else {
        // Finished typing this phrase
        if (loop && allPhrases.length > 1) {
          setIsPaused(true);
          setTimeout(() => {
            setIsPaused(false);
            setIsDeleting(true);
          }, pauseDuration);
        }
      }
    } else if (isDeleting) {
      // Deleting
      if (displayedHighlight.length > 0) {
        setDisplayedHighlight(currentPhrase.slice(0, displayedHighlight.length - 1));
      } else {
        // Finished deleting, move to next phrase
        setIsDeleting(false);
        setCurrentPhraseIndex((prev) => (prev + 1) % allPhrases.length);
      }
    }
  }, [hasStarted, isTyping, isDeleting, isPaused, displayedHighlight, currentPhrase, loop, allPhrases.length, pauseDuration]);

  useEffect(() => {
    if (!hasStarted) return;
    
    const speed = isDeleting ? deletingSpeed : typingSpeed;
    const timer = setTimeout(tick, speed);
    return () => clearTimeout(timer);
  }, [tick, hasStarted, isDeleting, typingSpeed, deletingSpeed]);

  const isFullyTyped = displayedHighlight.length === currentPhrase.length && !isDeleting;
  const showCursor = hasStarted;

  return (
    <h2 className={className}>
      <span className="inline-flex flex-wrap items-baseline justify-center gap-x-2">
        <span>{prefix}</span>
        <span className="inline-flex items-baseline">
          <span className={cn("typewriter-text", highlightClassName)}>
            {displayedHighlight}
          </span>
          {showCursor && (
            <span
              className={cn(
                "typewriter-cursor",
                isFullyTyped && !loop && "typewriter-cursor--fade"
              )}
              aria-hidden="true"
            />
          )}
        </span>
        {suffix && <span>{suffix}</span>}
      </span>
    </h2>
  );
}
