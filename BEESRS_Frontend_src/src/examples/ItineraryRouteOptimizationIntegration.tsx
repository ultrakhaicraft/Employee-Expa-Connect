/**
 * Example: How to integrate route optimization into Itinerary Detail Page
 * 
 * Usage in your ItineraryDetailPage component:
 */

/**
 * Example file - may have unused imports
 * This is a reference implementation, not used in production
 */
import React, { useState } from 'react';
// import { useMutation } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
// import { useToast } from '../lib/hooks/use-toast';
import { optimizeItineraryRoute } from '../services/vrpService';
import { RouteOptimizationDialog } from '../components/Event/RouteOptimizationDialog';
import { TravelSegment } from '../components/Event/TravelSegment';
import { useItineraryDistances } from '../hooks/useItineraryDistances';
import type { ItineraryItem } from '../types/itinerary.types';
import type { OptimizedRouteResult } from '../services/vrpService';
import { toast } from 'sonner';

interface ItineraryWithOptimizationProps {
  itineraryId: string;
  items: ItineraryItem[];
  onItemsReordered: (newItems: ItineraryItem[]) => Promise<void>;
}

export const ItineraryWithOptimization: React.FC<ItineraryWithOptimizationProps> = ({
  itineraryId: _itineraryId,
  items,
  onItemsReordered
}) => {
  const [showOptimizationDialog, setShowOptimizationDialog] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizedRouteResult | null>(null);
  const [transportMode, setTransportMode] = useState<'car' | 'moto' | 'walk'>('car');

  // Calculate distances between stops
  const { distances, totalDistance, totalDuration, loading: distancesLoading } = useItineraryDistances(
    items,
    { profile: transportMode }
  );

  const [optimizing, setOptimizing] = useState(false);
  const [applying, setApplying] = useState(false);

  // Optimization handler
  const handleOptimize = async () => {
    try {
      setOptimizing(true);
      const userLocation = await getUserLocation();
      const result = await optimizeItineraryRoute(items, userLocation, transportMode);
      setOptimizationResult(result);
      setShowOptimizationDialog(true);
    } catch (error: any) {
      toast.error(error.message || 'Unable to optimize route');
    } finally {
      setOptimizing(false);
    }
  };

  // Apply optimization handler
  const handleApplyOptimization = async () => {
    try {
      if (!optimizationResult) throw new Error('No optimization result');
      setApplying(true);
      await onItemsReordered(optimizationResult.optimizedItems);
      toast.success('Your itinerary has been reordered for optimal routing');
      setShowOptimizationDialog(false);
      setOptimizationResult(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to apply optimization');
    } finally {
      setApplying(false);
    }
  };

  // Get user location helper
  const getUserLocation = (): Promise<{ latitude: number; longitude: number } | undefined> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => {
          resolve(undefined);
        }
      );
    });
  };

  // Check if optimization is available
  const canOptimize = items.filter(item => item.place?.latitude && item.place?.longitude).length >= 2;

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <div className="flex items-center gap-4">
          {/* Transport mode selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Transport:</span>
            <div className="flex gap-1">
              {(['car', 'moto', 'walk'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTransportMode(mode)}
                  className={`px-2 py-1 rounded text-xs ${
                    transportMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border hover:bg-gray-100'
                  }`}
                >
                  {mode === 'car' && '🚗'}
                  {mode === 'moto' && '🏍️'}
                  {mode === 'walk' && '🚶'}
                </button>
              ))}
            </div>
          </div>

          {/* Total distance & duration */}
          {!distancesLoading && totalDistance > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <span>📏</span>
                <span className="font-medium">{(totalDistance / 1000).toFixed(1)} km</span>
              </div>
              <div className="flex items-center gap-1">
                <span>⏱️</span>
                <span className="font-medium">{Math.round(totalDuration / 60)} min</span>
              </div>
            </div>
          )}
        </div>

        {/* Optimize button */}
        <Button
          onClick={handleOptimize}
          disabled={!canOptimize || optimizing}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {optimizing ? (
            <>🔄 Optimizing...</>
          ) : (
            <>🧠 Optimize Route</>
          )}
        </Button>
      </div>

      {/* Cannot optimize message */}
      {!canOptimize && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
          ⚠️ Add at least 2 locations with coordinates to enable route optimization
        </div>
      )}

      {/* Itinerary items with travel segments */}
      <div className="space-y-1">
        {items.map((item, index) => (
          <div key={item.itemId}>
            {/* Item card */}
            <div className="p-4 border rounded-lg bg-white">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{item.activityTitle}</h3>
                  <p className="text-sm text-gray-600">{item.place?.placeName}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>🕐 {item.startTime} - {item.endTime}</span>
                    {item.estimatedDuration && (
                      <span>⏱️ {Math.round(item.estimatedDuration / 60)} min</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Travel segment to next item */}
            {index < items.length - 1 && (
              <div>
                {distances[`${item.itemId}-${items[index + 1].itemId}`] ? (
                  <TravelSegment
                    distance={distances[`${item.itemId}-${items[index + 1].itemId}`].distance}
                    duration={distances[`${item.itemId}-${items[index + 1].itemId}`].duration}
                    transportMethod={transportMode}
                  />
                ) : distancesLoading ? (
                  <div className="text-center py-2 text-sm text-gray-500">
                    Calculating...
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Optimization dialog */}
      <RouteOptimizationDialog
        open={showOptimizationDialog}
        onClose={() => setShowOptimizationDialog(false)}
        originalItems={items}
        optimizedResult={optimizationResult}
        onApply={handleApplyOptimization}
        loading={applying}
      />
    </div>
  );
};

/**
 * Usage in ItineraryDetailPage.tsx:
 * 
 * import { ItineraryWithOptimization } from '@/examples/ItineraryRouteOptimizationIntegration';
 * 
 * // In your component:
 * <ItineraryWithOptimization
 *   itineraryId={itineraryId}
 *   items={itineraryItems}
 *   onItemsReordered={async (newItems) => {
 *     // Update backend with new order
 *     await reorderItineraryItems(itineraryId, newItems);
 *     // Refetch data
 *     queryClient.invalidateQueries(['itinerary', itineraryId]);
 *   }}
 * />
 */

