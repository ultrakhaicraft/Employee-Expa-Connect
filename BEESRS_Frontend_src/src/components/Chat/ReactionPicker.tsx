// src/components/Chat/ReactionPicker.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ThumbsUp, 
  Heart, 
  Smile, 
  Star, 
  Frown,
  XCircle,
  ThumbsDown,
  Flame,
  Hand,
  Sparkles
} from 'lucide-react';
import type { ReactionType } from '../../types/conversation.types';

interface ReactionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReaction: (reactionType: ReactionType) => void;
  position?: { x: number; y: number };
}

const REACTION_ICONS: Record<ReactionType, React.ComponentType<{ className?: string }>> = {
  like: ThumbsUp,
  love: Heart,
  laugh: Smile,
  wow: Star,
  sad: Frown,
  angry: XCircle,
  thumbs_up: ThumbsUp,
  thumbs_down: ThumbsDown,
  heart: Heart,
  fire: Flame,
  clap: Hand,
  party: Sparkles,
};

const REACTION_LABELS: Record<ReactionType, string> = {
  like: 'Like',
  love: 'Love',
  laugh: 'Laugh',
  wow: 'Wow',
  sad: 'Sad',
  angry: 'Angry',
  thumbs_up: 'Thumbs Up',
  thumbs_down: 'Thumbs Down',
  heart: 'Heart',
  fire: 'Fire',
  clap: 'Clap',
  party: 'Party',
};

const REACTION_COLORS: Record<ReactionType, string> = {
  like: 'text-blue-500',
  love: 'text-red-500',
  laugh: 'text-yellow-500',
  wow: 'text-purple-500',
  sad: 'text-blue-400',
  angry: 'text-red-600',
  thumbs_up: 'text-green-500',
  thumbs_down: 'text-gray-500',
  heart: 'text-red-500',
  fire: 'text-orange-500',
  clap: 'text-yellow-600',
  party: 'text-pink-500',
};

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  isOpen,
  onClose,
  onSelectReaction,
  position = { x: 0, y: 0 }
}) => {
  const handleReactionClick = (reactionType: ReactionType) => {
    onSelectReaction(reactionType);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-3"
        style={{
          left: position.x,
          top: position.y - 60,
        }}
      >
        {/* Backdrop */}
        <div 
          className="fixed inset-0 -z-10" 
          onClick={onClose}
        />
        
        {/* Reaction Grid */}
        <div className="flex gap-2">
          {Object.entries(REACTION_ICONS).map(([reactionType, IconComponent]) => (
            <motion.button
              key={reactionType}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleReactionClick(reactionType as ReactionType)}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                hover:bg-gray-100 transition-all duration-200
                ${REACTION_COLORS[reactionType as ReactionType]}
              `}
              title={REACTION_LABELS[reactionType as ReactionType]}
            >
              <IconComponent className="w-5 h-5" />
            </motion.button>
          ))}
        </div>
        
        {/* Arrow */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
          <div className="w-3 h-3 bg-white border-r border-b border-gray-200 transform rotate-45" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
