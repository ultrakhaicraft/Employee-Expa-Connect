// src/components/Chat/ReactionDisplay.tsx
import React from 'react';
import { motion } from 'framer-motion';
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
import type { ReactionType, ReactionSummary } from '../../types/conversation.types';

interface ReactionDisplayProps {
  reactions: ReactionSummary[];
  onReactionClick?: (reactionType: ReactionType) => void;
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

const REACTION_COLORS: Record<ReactionType, string> = {
  like: 'text-blue-500 bg-blue-50',
  love: 'text-red-500 bg-red-50',
  laugh: 'text-yellow-500 bg-yellow-50',
  wow: 'text-purple-500 bg-purple-50',
  sad: 'text-blue-400 bg-blue-50',
  angry: 'text-red-600 bg-red-50',
  thumbs_up: 'text-green-500 bg-green-50',
  thumbs_down: 'text-gray-500 bg-gray-50',
  heart: 'text-red-500 bg-red-50',
  fire: 'text-orange-500 bg-orange-50',
  clap: 'text-yellow-600 bg-yellow-50',
  party: 'text-pink-500 bg-pink-50',
};

export const ReactionDisplay: React.FC<ReactionDisplayProps> = ({
  reactions,
  onReactionClick
}) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {reactions.map((reaction) => {
        const IconComponent = REACTION_ICONS[reaction.reactionType];
        const isCurrentUserReacted = reaction.hasCurrentUser;
        
        return (
          <motion.button
            key={reaction.reactionType}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onReactionClick?.(reaction.reactionType)}
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
              transition-all duration-200 hover:shadow-sm
              ${REACTION_COLORS[reaction.reactionType]}
              ${isCurrentUserReacted ? 'ring-2 ring-current' : ''}
            `}
          >
            <IconComponent className="w-3 h-3" />
            <span>{reaction.count}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
