// src/components/Chat/ChatLocationCard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import type { Place } from '../../types/chat.types';
import { MapPinIcon, StarIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid';

interface ChatLocationCardProps {
  place: Place;
  onClick?: () => void;
}

export const ChatLocationCard: React.FC<ChatLocationCardProps> = ({
  place,
  onClick,
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-blue-300 group"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
          <MapPinIcon className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
              {place.name}
            </h4>
            <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
          </div>

          <div className="flex items-center gap-2 mt-2">
            {place.averageRating && (
              <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-md">
                <StarIcon className="w-3.5 h-3.5 text-yellow-500" />
                <span className="text-xs font-medium text-gray-700">
                  {place.averageRating.toFixed(1)}
                </span>
              </div>
            )}

            {place.priceLevel && (
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                {'$'.repeat(place.priceLevel)}
              </span>
            )}

            {place.distance !== undefined && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                📍 {place.distance < 1000
                  ? `${Math.round(place.distance)}m`
                  : `${(place.distance / 1000).toFixed(1)}km`}
              </span>
            )}
          </div>

          {place.category && (
            <p className="text-xs text-gray-600 mt-2 line-clamp-1">
              🏷️ {place.category}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};