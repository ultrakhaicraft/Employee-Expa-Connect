/**
 * Example: How to integrate distance calculation into Event Place Options
 * 
 * Usage in your EventDetailPage or EventPlaceRecommendations component:
 */

import React, { useState, useEffect } from 'react';
import { useEventPlaceDistances } from '@/hooks/useEventPlaceDistances';
import { EventPlaceOptionWithDistance } from '@/components/Event/EventPlaceOptionWithDistance';
import type { VenueOptionResponse } from '@/services/eventService';

interface EventPlaceListProps {
  eventId: string;
  places: VenueOptionResponse[];
}

export const EventPlaceListWithDistance: React.FC<EventPlaceListProps> = ({
  eventId: _eventId,
  places
}) => {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sortMode, setSortMode] = useState<'distance' | 'ai-score'>('ai-score');
  const [transportMode, setTransportMode] = useState<'car' | 'moto' | 'walk'>('car');

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  // Calculate distances
  const { places: placesWithDistance, loading, error } = useEventPlaceDistances(
    userLocation,
    places,
    {
      enabled: !!userLocation,
      profile: transportMode,
      sortByDistance: sortMode === 'distance'
    }
  );

  // Re-sort if needed
  const sortedPlaces = React.useMemo(() => {
    if (sortMode === 'ai-score') {
      return [...placesWithDistance].sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
    }
    return placesWithDistance;
  }, [placesWithDistance, sortMode]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        {/* Sort Mode */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Sort by:</span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as any)}
            className="px-3 py-1 border rounded"
          >
            <option value="ai-score">AI Score</option>
            <option value="distance">Distance</option>
          </select>
        </div>

        {/* Transport Mode */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Transport:</span>
          <div className="flex gap-1">
            {(['car', 'moto', 'walk'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setTransportMode(mode)}
                className={`px-3 py-1 rounded text-sm ${
                  transportMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border hover:bg-gray-100'
                }`}
              >
                {mode === 'car' && '🚗'}
                {mode === 'moto' && '🏍️'}
                {mode === 'walk' && '🚶'}
                {' '}
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="ml-auto text-sm text-gray-600">
            Calculating distances...
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Location permission request */}
      {!userLocation && !loading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded text-sm">
          📍 Enable location to see distances to each place
        </div>
      )}

      {/* Place list */}
      <div className="space-y-3">
        {sortedPlaces.map((place) => (
          <EventPlaceOptionWithDistance
            key={place.optionId}
            place={place}
            onVote={(optionId, voteValue) => {
              // Handle vote
              console.log('Vote:', optionId, voteValue);
            }}
            onViewDetails={(optionId) => {
              // Handle view details
              console.log('View details:', optionId);
            }}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Usage in EventDetailPage.tsx:
 * 
 * import { EventPlaceListWithDistance } from '@/examples/EventPlaceDistanceIntegration';
 * 
 * // In your component:
 * <EventPlaceListWithDistance
 *   eventId={eventId}
 *   places={recommendations}
 * />
 */

