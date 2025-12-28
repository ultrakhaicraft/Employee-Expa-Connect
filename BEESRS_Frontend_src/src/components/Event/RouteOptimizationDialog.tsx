/**
 * Dialog to show route optimization results and allow user to apply
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatDistance, formatDuration } from '@/services/trackAsiaService';
import type { OptimizedRouteResult } from '@/services/vrpService';
import type { ItineraryItem } from '@/types/itinerary.types';

interface RouteOptimizationDialogProps {
  open: boolean;
  onClose: () => void;
  originalItems: ItineraryItem[];
  optimizedResult: OptimizedRouteResult | null;
  onApply: () => void;
  loading?: boolean;
}

export const RouteOptimizationDialog: React.FC<RouteOptimizationDialogProps> = ({
  open,
  onClose,
  originalItems,
  optimizedResult,
  onApply,
  loading = false
}) => {
  if (!optimizedResult) return null;

  const { optimizedItems, totalDistance, totalDuration, savingsPercent } = optimizedResult;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-green-600">
            ✅ Route Optimized Successfully!
          </DialogTitle>
          <DialogDescription>
            Your itinerary route has been optimized to minimize travel distance and time.
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 my-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-3xl mb-2">📏</div>
            <div className="text-sm text-gray-600">Total Distance</div>
            <div className="text-lg font-bold text-blue-900">
              {formatDistance(totalDistance)}
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-3xl mb-2">⏱️</div>
            <div className="text-sm text-gray-600">Total Duration</div>
            <div className="text-lg font-bold text-purple-900">
              {formatDuration(totalDuration)}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-3xl mb-2">💡</div>
            <div className="text-sm text-gray-600">Estimated Savings</div>
            <div className="text-lg font-bold text-green-900">
              ~{savingsPercent}%
            </div>
          </div>
        </div>

        {/* Route comparison */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">New Order (Optimized):</h3>
          
          <div className="space-y-2">
            {optimizedItems.map((item, index) => (
              <div
                key={item.itemId}
                className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{item.activityTitle}</div>
                  <div className="text-sm text-gray-600">{item.place?.placeName || item.activityTitle}</div>
                </div>
                {/* Show if order changed */}
                {originalItems.findIndex(orig => orig.itemId === item.itemId) !== index && (
                  <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Reordered
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-2">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <div className="font-medium text-yellow-900">Note</div>
              <div className="text-sm text-yellow-800 mt-1">
                Location order will be rearranged to optimize distance. 
                Activity times will remain unchanged.
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Keep Original Order
          </Button>
          <Button
            onClick={onApply}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? '⏳ Applying...' : '✅ Apply New Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

