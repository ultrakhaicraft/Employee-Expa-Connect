/**
 * Custom hook to calculate distances from user location to event place options
 */
import { useEffect, useState } from 'react';
import { getDistanceMatrix, formatDistance, formatDuration } from '@/services/trackAsiaService';
import type { VenueOptionResponse } from '@/types/event.types';

export interface PlaceWithDistance extends VenueOptionResponse {
  distance?: number; // meters
  duration?: number; // seconds
  distanceText?: string;
  durationText?: string;
}

interface UseEventPlaceDistancesOptions {
  enabled?: boolean;
  profile?: 'car' | 'moto' | 'walk' | 'truck';
  sortByDistance?: boolean;
}

export const useEventPlaceDistances = (
  userLocation: { latitude: number; longitude: number } | null,
  places: VenueOptionResponse[],
  options: UseEventPlaceDistancesOptions = {}
) => {
  const { enabled = true, profile = 'car', sortByDistance = true } = options;
  
  const [placesWithDistance, setPlacesWithDistance] = useState<PlaceWithDistance[]>(places);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !userLocation || places.length === 0) {
      setPlacesWithDistance(places);
      return;
    }

    const calculateDistances = async () => {
      setLoading(true);
      setError(null);

      try {
        // Filter places with valid coordinates (internal or external)
        const validPlaces = places.filter(
          place => {
            // Internal place: check placeLatitude/placeLongitude
            if (place.placeId && place.placeLatitude && place.placeLongitude) {
              return true;
            }
            // External place: check externalLatitude/externalLongitude
            if (place.externalLatitude && place.externalLongitude) {
              return true;
            }
            return false;
          }
        );

        if (validPlaces.length === 0) {
          setPlacesWithDistance(places);
          setLoading(false);
          return;
        }

        // Build coordinates array: [user location, ...place locations]
        const coordinates = [
          userLocation,
          ...validPlaces.map(place => {
            // Use internal coordinates if available, otherwise external
            if (place.placeId && place.placeLatitude && place.placeLongitude) {
              return {
                latitude: place.placeLatitude,
                longitude: place.placeLongitude
              };
            }
            return {
              latitude: place.externalLatitude!,
              longitude: place.externalLongitude!
            };
          })
        ];

        // Call Distance Matrix API
        const result = await getDistanceMatrix({
          profile,
          coordinates,
          sources: [0], // User location is source
          destinations: validPlaces.map((_, i) => i + 1), // All places are destinations
          annotations: 'duration,distance'
        });

        if (!result.distances || !result.durations) {
          throw new Error('Invalid distance matrix response');
        }

        // Attach distance & duration to each place
        const enrichedPlaces: PlaceWithDistance[] = places.map(place => {
          const placeIndex = validPlaces.findIndex(
            p => p.optionId === place.optionId
          );

          if (placeIndex === -1) {
            return { ...place, distance: undefined, duration: undefined };
          }

          const distance = result.distances![0][placeIndex];
          const duration = result.durations![0][placeIndex];

          return {
            ...place,
            distance,
            duration,
            distanceText: formatDistance(distance),
            durationText: formatDuration(duration)
          };
        });

        // Sort by distance if enabled
        if (sortByDistance) {
          enrichedPlaces.sort((a, b) => {
            if (a.distance === undefined) return 1;
            if (b.distance === undefined) return -1;
            return a.distance - b.distance;
          });
        }

        setPlacesWithDistance(enrichedPlaces);
      } catch (err: any) {
        console.error('Failed to calculate distances:', err);
        setError(err.message || 'Failed to calculate distances');
        // Return original places on error
        setPlacesWithDistance(places);
      } finally {
        setLoading(false);
      }
    };

    calculateDistances();
  }, [userLocation, places, enabled, profile, sortByDistance]);

  return {
    places: placesWithDistance,
    loading,
    error
  };
};

