/**
 * Component to display distance and duration badge for a place
 */
import React from 'react';

interface PlaceDistanceBadgeProps {
  distance?: number; // meters
  duration?: number; // seconds
  distanceText?: string;
  durationText?: string;
  className?: string;
  variant?: 'default' | 'compact';
}

export const PlaceDistanceBadge: React.FC<PlaceDistanceBadgeProps> = ({
  distance,
  duration,
  distanceText,
  durationText,
  className = '',
  variant = 'default'
}) => {
  if (!distance && !distanceText) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1 text-xs text-gray-600 ${className}`}>
        <span className="text-blue-600">📍</span>
        <span className="font-medium">{distanceText || `${(distance! / 1000).toFixed(1)} km`}</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 px-3 py-1.5 bg-blue-50 rounded-lg text-sm ${className}`}>
      <div className="flex items-center gap-1">
        <span className="text-blue-600">📍</span>
        <span className="font-medium text-blue-900">
          {distanceText || `${(distance! / 1000).toFixed(1)} km`}
        </span>
      </div>
      
      {(duration || durationText) && (
        <>
          <div className="w-px h-4 bg-blue-200" />
          <div className="flex items-center gap-1">
            <span className="text-blue-600">⏱️</span>
            <span className="text-blue-700">
              {durationText || `${Math.round(duration! / 60)} min`}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

