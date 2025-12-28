import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPinIcon, ClockIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import type { Place } from '../../types/chat.types';
import clsx from 'clsx';

interface PlaceCardProps {
  place: Place;
  index?: number;
  onClick?: () => void;
  onGetDirections?: () => void;
  onViewOnMap?: () => void;
  className?: string;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  index = 0,
  onClick,
  onGetDirections,
  onViewOnMap,
  className
}) => {
  const handleDirectionsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Open Google Maps with directions
    let googleMapsUrl: string;
    
    if (place.address) {
      const encodedAddress = encodeURIComponent(place.address);
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    } else {
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    }
    
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
    
    // Also call the callback if provided
    onGetDirections?.();
  };

  const handleMapClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onViewOnMap?.();
  };

  // Check if place.id is valid before allowing navigation
  const isValidPlaceId = place.id && place.id !== 'null' && place.id !== 'undefined';
  
  const handleCardClick = (e: React.MouseEvent) => {
    if (!isValidPlaceId) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.();
  };

  const CardContent = (
    <div
      className={clsx(
        "block p-3 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-200",
        !isValidPlaceId && "cursor-default"
      )}
      onClick={handleCardClick}
    >
        {/* Header with ranking */}
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
              {index + 1}
            </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                {place.name}
              </h3>
            <p className="text-xs text-gray-500 mt-0.5">{place.category}</p>
            </div>
          </div>
        </div>

        {/* Address */}
      <div className="flex items-start gap-2 mb-2.5">
        <MapPinIcon className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{place.address}</p>
        </div>

        {/* Distance and Duration */}
      <div className="flex items-center gap-3 text-xs mb-2.5">
        <div className="flex items-center gap-1 text-blue-600 font-medium">
          <ClockIcon className="w-3.5 h-3.5" />
          <span>{place.distanceText}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
          <ClockIcon className="w-3.5 h-3.5" />
            <span>{place.durationText}</span>
          </div>
        </div>

        {/* Additional info */}
        {(place.averageRating || place.priceLevel) && (
        <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-gray-100/50">
            {place.averageRating && (
            <div className="flex items-center gap-1.5">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={clsx(
                      'w-2.5 h-2.5 text-[10px]',
                        i < Math.floor(place.averageRating!)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      )}
                    >
                      ★
                    </div>
                  ))}
                </div>
              <span className="text-[10px] text-gray-500 font-medium">
                  {place.averageRating.toFixed(1)}
                </span>
              </div>
            )}
            
            {place.priceLevel && (
            <div className="text-[10px] text-gray-500 font-medium">
                {[...Array(place.priceLevel)].map(() => '$').join('')}
              </div>
            )}
          </div>
        )}
      </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className={clsx(
        'bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200 group overflow-hidden',
        className
      )}
    >
      {isValidPlaceId ? (
        <Link
          to={`/place/${place.id}`}
          className="block"
        >
          {CardContent}
        </Link>
      ) : (
        CardContent
      )}

      {/* Action buttons - outside of Link to prevent navigation */}
      <div className="px-3 pb-3">
        <div className="flex gap-2">
          <button
            onClick={handleDirectionsClick}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-blue-600 rounded-lg transition-all duration-200 text-xs font-medium shadow-sm hover:shadow"
          >
            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
            <span>Get directions</span>
            
          </button>
          <button
            onClick={handleMapClick}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-purple-600 rounded-lg transition-all duration-200 text-xs font-medium shadow-sm hover:shadow"
          >
            <MapPinIcon className="w-3.5 h-3.5" />
            <span>View map</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};