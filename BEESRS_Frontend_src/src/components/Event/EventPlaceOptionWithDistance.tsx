/**
 * Enhanced Event Place Option component with distance information
 * This is an example integration - adapt to your existing component
 */
import React from 'react';
import { PlaceDistanceBadge } from './PlaceDistanceBadge';
import type { PlaceWithDistance } from '@/hooks/useEventPlaceDistances';

interface EventPlaceOptionWithDistanceProps {
  place: PlaceWithDistance;
  onVote: (optionId: string, voteValue: number) => void;
  onViewDetails: (optionId: string) => void;
  userVote?: number;
}

export const EventPlaceOptionWithDistance: React.FC<EventPlaceOptionWithDistanceProps> = ({
  place,
  onVote,
  onViewDetails,
  userVote
}) => {
  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{place.placeName || place.externalPlaceName}</h3>
          <p className="text-sm text-gray-600">{place.placeAddress || place.externalAddress}</p>
        </div>
        
        {/* AI Score */}
        {place.aiScore && (
          <div className="bg-purple-100 px-3 py-1 rounded-full">
            <span className="text-purple-900 font-semibold">⭐ {place.aiScore}/10</span>
          </div>
        )}
      </div>

      {/* Distance Badge */}
      <div className="mb-3">
        <PlaceDistanceBadge
          distance={place.distance}
          duration={place.duration}
          distanceText={place.distanceText}
          durationText={place.durationText}
        />
      </div>

      {/* Category & Rating */}
      <div className="flex items-center gap-4 mb-3 text-sm">
        <div className="flex items-center gap-1">
          <span>🏷️</span>
          <span className="text-gray-700">{place.placeCategory || place.externalCategory}</span>
        </div>
        {(place.averageRating || place.externalRating) && (
          <div className="flex items-center gap-1">
            <span>⭐</span>
            <span className="text-gray-700">
              {place.averageRating || place.externalRating} ({place.totalReviews || place.externalTotalReviews} reviews)
            </span>
          </div>
        )}
      </div>

      {/* Pros & Cons */}
      {place.aiReasoning && (
        <div className="mb-3 text-sm">
          <p className="text-gray-700 italic">{place.aiReasoning}</p>
        </div>
      )}

      {place.pros && place.pros.length > 0 && (
        <div className="mb-2">
          <div className="text-xs font-medium text-green-700 mb-1">👍 Pros:</div>
          <ul className="text-xs text-gray-600 space-y-1">
            {place.pros.map((pro, i) => (
              <li key={i}>• {pro}</li>
            ))}
          </ul>
        </div>
      )}

      {place.cons && place.cons.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-red-700 mb-1">👎 Cons:</div>
          <ul className="text-xs text-gray-600 space-y-1">
            {place.cons.map((con, i) => (
              <li key={i}>• {con}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Cost */}
      {place.estimatedCostPerPerson && (
        <div className="mb-3 text-sm">
          <span className="text-gray-600">💰 Est. Cost: </span>
          <span className="font-semibold">${place.estimatedCostPerPerson}/person</span>
        </div>
      )}

      {/* Voting */}
      <div className="flex items-center gap-2 pt-3 border-t">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => onVote(place.optionId, value)}
              className={`px-3 py-1 rounded ${
                userVote === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {value}⭐
            </button>
          ))}
        </div>
        
        <button
          onClick={() => onViewDetails(place.optionId)}
          className="ml-auto px-4 py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-700 text-sm font-medium"
        >
          View Details
        </button>
      </div>

      {/* Vote count */}
      {place.totalVotes !== undefined && place.totalVotes > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {place.totalVotes} vote(s) • Score: {place.voteScore}
        </div>
      )}
    </div>
  );
};

