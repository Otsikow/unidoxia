import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------

export interface CardData {
  id: string;
  username: string;
  timestamp: string;
  content: string;
  linkText?: string;
  linkUrl?: string;
}

interface AnimatedStackedCardsProps {
  cards?: CardData[];
  className?: string;
}

// ----------------------------------------------------------------------
// MOCK DATA (Default Fallback)
// ----------------------------------------------------------------------

const DEFAULT_CARDS: CardData[] = [
  {
    id: "1",
    username: "Sarah Jenkins",
    timestamp: "2 hours ago",
    content: "Just received my acceptance letter from University of Toronto! The visa guidance from UniDoxia made the difference.",
    linkText: "Read full story",
  },
  {
    id: "2",
    username: "David Chen",
    timestamp: "5 hours ago",
    content: "Navigating the post-study work permit requirements was confusing until I used the AI compliance checker. Lifesaver.",
    linkText: "View insights",
  },
  {
    id: "3",
    username: "Amara Okeke",
    timestamp: "1 day ago",
    content: "My agent and I collaborated directly on the platform. No more lost emails or missed deadlines. Highly recommend for Nigerian students.",
    linkText: "See global journeys",
  },
];

// ----------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------

export const AnimatedStackedCards: React.FC<AnimatedStackedCardsProps> = ({
  cards = DEFAULT_CARDS,
  className,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className={cn("relative w-full max-w-4xl mx-auto py-20 px-4 flex justify-center items-center min-h-[400px]", className)}>
      <div className="relative w-full max-w-md h-[300px]">
        {cards.map((card, index) => {
          // Calculate rotation based on index to create the fanned stack effect
          // We want them to fan out slightly: -4deg, -2deg, 0deg (for 3 cards)
          // Or tailored logic if more cards.
          const isHovered = hoveredIndex === index;
          const isAnyHovered = hoveredIndex !== null;
          
          // Base rotation logic: distribute slightly around 0
          // For 3 cards: index 0 -> -4, index 1 -> -2, index 2 -> 0
          const baseRotation = -4 + (index * 2); 
          
          return (
            <motion.div
              key={card.id}
              className={cn(
                "absolute inset-0 rounded-[20px] border border-[#9FBF9A]/30",
                "bg-[#0F172A] shadow-lg",
                "flex flex-col p-6 overflow-hidden cursor-pointer",
                "transition-colors duration-300"
              )}
              style={{
                transformOrigin: "bottom center",
                zIndex: isHovered ? 50 : index, // Bring to front on hover
                boxShadow: isHovered 
                  ? "0 20px 40px -5px rgba(0, 0, 0, 0.4), 0 0 15px -3px rgba(159, 191, 154, 0.1)" // Enhanced shadow + subtle glow
                  : "0 10px 30px -5px rgba(0, 0, 0, 0.3)",
              }}
              initial={{ opacity: 0, y: 30, rotate: 0 }}
              animate={{
                opacity: 1,
                y: 0,
                rotate: isHovered ? 0 : baseRotation, // Straighten on hover
                scale: isHovered ? 1.03 : (1 - (cards.length - 1 - index) * 0.02), // Scale up hovered, slightly scale down others based on depth
                x: isHovered ? 0 : (index * 10) - ((cards.length - 1) * 5), // Slight horizontal offset for visual layering
              }}
              transition={{
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier
              }}
              onHoverStart={() => setHoveredIndex(index)}
              onHoverEnd={() => setHoveredIndex(null)}
            >
              {/* Card Header */}
              <div className="flex justify-between items-center mb-4 text-xs font-medium text-slate-400 tracking-wide uppercase">
                <span className="text-[#9FBF9A]">From: {card.username}</span>
                <span>{card.timestamp}</span>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-[#9FBF9A]/20 mb-4" />

              {/* Content */}
              <div className="flex-1">
                <p className="text-slate-200 text-lg leading-relaxed font-light font-sans">
                  {card.content}
                </p>
              </div>

              {/* Footer Link */}
              <div className="mt-6 pt-2">
                <span className="text-[#9FBF9A] text-sm font-medium hover:text-white transition-colors flex items-center gap-2 group">
                  {card.linkText || "Continue reading"}
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </div>
              
              {/* Gentle gradient overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AnimatedStackedCards;
