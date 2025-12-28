import React from 'react';
import { motion } from 'framer-motion';
import { 
  MapIcon, 
  ArrowTopRightOnSquareIcon, 
  CalendarIcon,
  MapPinIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import type { SuggestedAction } from '../../types/chat.types';
import clsx from 'clsx';

interface SuggestedActionsProps {
  actions: SuggestedAction[];
  onActionClick?: (action: SuggestedAction) => void;
  className?: string;
}

export const SuggestedActions: React.FC<SuggestedActionsProps> = ({
  actions,
  onActionClick,
  className
}) => {
  if (!actions || actions.length === 0) return null;

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'show_map':
        return <MapIcon className="w-3.5 h-3.5" />;
      case 'get_directions':
        return <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />;
      case 'create_event':
        return <CalendarIcon className="w-3.5 h-3.5" />;
      case 'show_location':
        return <MapPinIcon className="w-3.5 h-3.5" />;
      case 'open_map':
        return <EyeIcon className="w-3.5 h-3.5" />;
      default:
        return <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'show_map':
        return 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200';
      case 'get_directions':
        return 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200';
      case 'create_event':
        return 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200';
      case 'show_location':
        return 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200';
      case 'open_map':
        return 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200';
      default:
        return 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200';
    }
  };

  const handleActionClick = (action: SuggestedAction) => {
    onActionClick?.(action);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.2 }}
      className={clsx('grid grid-cols-2 gap-2 mt-3', className)}
    >
      {actions.map((action, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 + index * 0.1, duration: 0.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleActionClick(action)}
          className={clsx(
            'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200 w-full',
            'hover:shadow-sm active:scale-95',
            getActionColor(action.type)
          )}
        >
          {getActionIcon(action.type)}
          <span>{action.label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
};


