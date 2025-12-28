/**
 * Custom hook to calculate distances between consecutive stops in an itinerary
 */
import { useEffect, useState } from 'react';
import { getDistanceMatrix } from '@/services/trackAsiaService';
import type { ItineraryItem } from '@/types/itinerary.types';

export interface DistanceSegment {
  distance: number; // meters
  duration: number; // seconds
}

export type DistanceMap = Record<string, DistanceSegment>;

interface UseItineraryDistancesOptions {
  enabled?: boolean;
  profile?: 'car' | 'moto' | 'walk' | 'truck';
}

export const useItineraryDistances = (
  items: ItineraryItem[],
  options: UseItineraryDistancesOptions = {}
) => {
  const { enabled = true, profile = 'car' } = options;
  
  const [distances, setDistances] = useState<DistanceMap>({});
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use profile as a separate dependency to ensure recalculation when it changes
  useEffect(() => {
    if (!enabled || items.length < 2) {
      setDistances({});
      setTotalDistance(0);
      setTotalDuration(0);
      return;
    }

    let cancelled = false;

    const calculateDistances = async () => {
      if (cancelled) return;
      
      setLoading(true);
      setError(null);

      try {
        // Filter items with valid coordinates
        const validItems = items.filter(
          item => item.place?.latitude && item.place?.longitude
        );

        if (validItems.length < 2) {
          if (!cancelled) {
            setDistances({});
            setTotalDistance(0);
            setTotalDuration(0);
            setLoading(false);
          }
          return;
        }

        // Build coordinates array
        const coordinates = validItems.map(item => ({
          latitude: item.place!.latitude!,
          longitude: item.place!.longitude!
        }));

        // Calculate full distance matrix with current profile
        const result = await getDistanceMatrix({
          profile,
          coordinates,
          annotations: 'duration,distance'
        });

        if (cancelled) return;

        if (!result.distances || !result.durations) {
          throw new Error('Invalid distance matrix response');
        }

        // Build distance map for consecutive items
        const distanceMap: DistanceMap = {};
        let sumDistance = 0;
        let sumDuration = 0;

        for (let i = 0; i < validItems.length - 1; i++) {
          const fromItem = validItems[i];
          const toItem = validItems[i + 1];
          const key = `${fromItem.itemId}-${toItem.itemId}`;

          const distance = result.distances[i][i + 1];
          const duration = result.durations[i][i + 1];

          distanceMap[key] = { distance, duration };
          sumDistance += distance;
          sumDuration += duration;
        }

        if (!cancelled) {
          setDistances(distanceMap);
          setTotalDistance(sumDistance);
          setTotalDuration(sumDuration);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to calculate itinerary distances:', err);
          setError(err.message || 'Failed to calculate distances');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    calculateDistances();

    return () => {
      cancelled = true;
    };
  }, [items, enabled, profile]);

  return {
    distances,
    totalDistance,
    totalDuration,
    loading,
    error
  };
};

