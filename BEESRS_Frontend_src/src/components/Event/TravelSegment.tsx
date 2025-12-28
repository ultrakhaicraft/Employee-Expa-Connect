/**
 * Component to display travel information between two itinerary items
 */
import React from 'react';
import { formatDistance, formatDuration } from '@/services/trackAsiaService';

interface TravelSegmentProps {
  distance: number; // meters
  duration: number; // seconds
  transportMethod?: 'car' | 'moto' | 'walk' | 'bike' | 'bus' | 'taxi';
  className?: string;
}

const TRANSPORT_ICONS: Record<string, string> = {
  car: '🚗',
  moto: '🏍️',
  walk: '🚶',
  bike: '🚴',
  bus: '🚌',
  taxi: '🚕'
};

export const TravelSegment: React.FC<TravelSegmentProps> = ({
  distance,
  duration,
  transportMethod = 'car',
  className = ''
}) => {
  const icon = TRANSPORT_ICONS[transportMethod] || '🚗';

  return (
    <div className={`flex items-center justify-center py-3 ${className}`}>
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
        {/* Transport icon */}
        <div className="text-2xl">{icon}</div>

        {/* Distance info */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">📏</span>
          <span className="font-medium text-gray-900">
            {formatDistance(distance)}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300" />

        {/* Duration info */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">⏱️</span>
          <span className="font-medium text-gray-900">
            {formatDuration(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};

