// src/pages/Chat/ChatSuggestedActions.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { MapIcon, MapPinIcon, CalendarIcon, PhoneIcon } from '@heroicons/react/24/outline';
import type { SuggestedAction } from '../../types/chat.types';
import clsx from 'clsx';

interface ChatSuggestedActionsProps {
  actions: SuggestedAction[];
  onActionClick: (action: SuggestedAction) => void;
}

export const ChatSuggestedActions: React.FC<ChatSuggestedActionsProps> = ({
  actions,
  onActionClick,
}) => {
  if (!actions || actions.length === 0) return null;

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'show_location':
        return <MapPinIcon className="w-4 h-4" />;
      case 'open_map':
        return <MapIcon className="w-4 h-4" />;
      case 'get_directions':
        return <MapIcon className="w-4 h-4" />;
      case 'create_event':
        return <CalendarIcon className="w-4 h-4" />;
      case 'call_emergency':
        return <PhoneIcon className="w-4 h-4" />;
      default:
        return <span>📍</span>;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'show_location':
        return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300';
      case 'open_map':
        return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300';
      case 'get_directions':
        return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300';
      case 'create_event':
        return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:border-orange-300';
      case 'call_emergency':
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-3 space-y-2"
    >
      <p className="text-xs text-gray-500 font-medium mb-2">Suggested actions:</p>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + index * 0.05 }}
            onClick={() => onActionClick(action)}
            className={clsx(
              'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow w-full',
              getActionColor(action.type)
            )}
          >
            {getActionIcon(action.type)}
            <span>{action.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

