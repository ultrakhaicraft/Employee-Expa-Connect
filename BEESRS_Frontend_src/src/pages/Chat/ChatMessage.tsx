// src/components/Chat/ChatMessage.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage as ChatMessageType, Place, SuggestedAction } from '../../types/chat.types';
import { PlaceCard } from '../../components/Chat/PlaceCard';
import { LocationCard } from '../../components/Chat/LocationCard';
import { SuggestedActions } from '../../components/Chat/SuggestedActions';
import { MapView } from '../../components/Chat/MapView';
import { MediaMessage } from '../../components/Chat/MediaMessage';
import { format } from 'date-fns';
import clsx from 'clsx';
import { SparklesIcon } from '@heroicons/react/24/solid';

interface ChatMessageProps {
  message: ChatMessageType;
  onLocationClick?: (placeId: string) => void;
  onMapAction?: (action: string, data: any) => void;
  suggestedActions?: SuggestedAction[];
  places?: Place[];
  onActionClick?: (action: SuggestedAction) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onLocationClick,
  onMapAction: _onMapAction,
  suggestedActions = [],
  places = [],
  onActionClick,
}) => {
  const isUser = message.senderType?.toLowerCase() === 'user';
  const [isMapOpen, setIsMapOpen] = useState(false);


  // Handle action clicks
  const handleActionClick = (action: SuggestedAction) => {
    // If parent provides onActionClick, use it (for sending messages)
    if (onActionClick) {
      onActionClick(action);
      return;
    }
    
    // Otherwise, handle locally
    switch (action.type) {
      case 'show_map':
        setIsMapOpen(true);
        break;
      case 'get_directions':
        if (action.data?.place) {
          onLocationClick?.(action.data.place.id);
        }
        break;
      default:
        break;
    }
  };

  const handlePlaceClick = (place: Place) => {
    onLocationClick?.(place.id);
  };

  const handleGetDirections = (place: Place) => {
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
    onLocationClick?.(place.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={clsx('flex gap-3 items-start mb-4', isUser ? 'justify-end' : 'justify-start')}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
          <SparklesIcon className="w-5 h-5 text-white" />
        </div>
      )}

      <div
        className={clsx(
          'max-w-[80%] rounded-2xl px-5 py-4 shadow-sm',
          isUser
            ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-tr-sm'
            : 'bg-white/80 backdrop-blur-sm text-gray-800 border border-white/50 rounded-tl-sm'
        )}
      >
        {/* Message Text */}
        <div className="prose prose-sm max-w-none">
          <p
            className={clsx(
              'whitespace-pre-wrap text-xs leading-relaxed font-medium',
              isUser ? 'text-white' : 'text-gray-800'
            )}
          >
            {message.messageText}
          </p>
        </div>

        {/* Media Content - Image */}
        {message.messageType === 'image' && message.mediaUrl && (
          <div className="mt-3">
            <MediaMessage
              mediaUrl={message.mediaUrl}
              mediaType="image"
              thumbnailUrl={message.mediaThumbnailUrl}
              fileName={message.mediaFileName}
              fileSize={message.mediaFileSize}
              isUser={isUser}
            />
          </div>
        )}

        {/* Media Content - Video */}
        {message.messageType === 'video' && message.mediaUrl && (
          <div className="mt-3">
            <MediaMessage
              mediaUrl={message.mediaUrl}
              mediaType="video"
              thumbnailUrl={message.mediaThumbnailUrl}
              fileName={message.mediaFileName}
              fileSize={message.mediaFileSize}
              duration={message.mediaDuration}
              isUser={isUser}
            />
          </div>
        )}

        {/* Location Card */}
        {message.messageType === 'location' && message.location && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-3 max-w-[320px]"
          >
            <LocationCard
              location={message.location}
              locationName={message.locationName}
              timestamp={format(new Date(message.createdAt), 'HH:mm')}
              showMap={true}
              onGetDirections={() => {
                if (message.location) {
                  const url = `https://www.google.com/maps?q=${message.location.latitude},${message.location.longitude}`;
                  window.open(url, '_blank');
                }
              }}
              onViewOnMap={() => setIsMapOpen(true)}
            />
          </motion.div>
        )}

        {/* Places List */}
        {places.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 0.2 }}
            className="mt-3 space-y-3"
          >
            {places.map((place, index) => (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <PlaceCard
                  place={place}
                  index={index}
                  onClick={() => handlePlaceClick(place)}
                  onGetDirections={() => handleGetDirections(place)}
                  onViewOnMap={() => setIsMapOpen(true)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Suggested Actions */}
        {suggestedActions.length > 0 && (
          <SuggestedActions
            actions={suggestedActions}
            onActionClick={handleActionClick}
          />
        )}

        {/* Timestamp & Metadata */}
        <div
          className={clsx(
            'flex items-center gap-2 mt-2 text-xs',
            isUser ? 'text-blue-100' : 'text-gray-500'
          )}
        >
          <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
        </div>
      </div>

      {/* User Avatar (placeholder) */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center shadow-md text-white text-xs font-semibold">
          U
        </div>
      )}

      {/* Map View Modal */}
      <MapView
        places={places}
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onGetDirections={handleGetDirections}
      />
    </motion.div>
  );
};