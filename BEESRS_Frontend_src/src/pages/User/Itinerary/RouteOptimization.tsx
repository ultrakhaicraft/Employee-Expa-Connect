import { useState, useEffect } from "react";
import {
  X,
  Navigation,
  Route as RouteIcon,
  Clock,
  MapPin,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { useToast } from "../../../components/ui/use-toast";
import { getItineraryById, reorderItineraryItems } from "../../../services/itineraryService";
import { getDistanceMatrix } from "../../../services/trackAsiaService";
import { optimizeItineraryRoute } from "../../../services/vrpService";
import type { ItineraryItem } from "../../../types/itinerary.types";

interface RouteOptimizationProps {
  itineraryId: string;
  onClose: () => void;
  onOptimized: () => void;
}

export default function RouteOptimization({
  itineraryId,
  onClose,
  onOptimized,
}: RouteOptimizationProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [loadingItinerary, setLoadingItinerary] = useState(true);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [distanceResult, setDistanceResult] = useState<{
    totalDistance: number;
    totalDuration: number;
    itemDistances: Array<{
      itemId: string;
      distanceFromPrevious: number;
      travelTimeFromPrevious: number;
    }>;
  } | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<{
    optimizedItems: ItineraryItem[];
    totalDistance: number;
    totalDuration: number;
    totalTravelTime: number;
    estimatedCost?: number;
    suggestions?: string[];
  } | null>(null);

  // Load itinerary items
  useEffect(() => {
    const loadItinerary = async () => {
      try {
        const itinerary = await getItineraryById(itineraryId);
        setItineraryItems(itinerary?.items || []);
      } catch (error) {
        console.error("Failed to load itinerary:", error);
        toast({
          title: "Error",
          description: "Failed to load itinerary",
          variant: "destructive",
        });
      } finally {
        setLoadingItinerary(false);
      }
    };
    loadItinerary();
  }, [itineraryId, toast]);

  const handleCalculateDistance = async () => {
    if (itineraryItems.length < 2) {
      toast({
        title: "Cannot Calculate",
        description: "Need at least 2 locations with coordinates",
        variant: "destructive",
      });
      return;
    }

    setCalculating(true);
    try {
      // Filter items with valid coordinates
      const validItems = itineraryItems.filter(
        item => item.place?.latitude && item.place?.longitude
      );

      if (validItems.length < 2) {
        throw new Error("Need at least 2 locations with valid coordinates");
      }

      // Build coordinates for Distance Matrix API
      const coordinates = validItems.map(item => ({
        latitude: item.place!.latitude,
        longitude: item.place!.longitude
      }));

      // Call TrackAsia Distance Matrix API directly
      const result = await getDistanceMatrix({
        profile: 'car',
        coordinates,
        annotations: 'duration,distance'
      });

      // Calculate distances between consecutive points
      let totalDistance = 0; // meters
      let totalDuration = 0; // seconds
      const itemDistances = [];

      for (let i = 0; i < validItems.length - 1; i++) {
        const distance = result.distances?.[i]?.[i + 1] || 0;
        const duration = result.durations?.[i]?.[i + 1] || 0;
        totalDistance += distance;
        totalDuration += duration;
        
        itemDistances.push({
          itemId: validItems[i + 1].itemId,
          distanceFromPrevious: distance / 1000, // convert to km
          travelTimeFromPrevious: Math.round(duration / 60) // convert to minutes
        });
      }

      const distanceResult = {
        totalDistance: totalDistance / 1000, // km
        totalDuration: totalDuration, // seconds
        itemDistances
      };

      setDistanceResult(distanceResult);
      toast({
        title: "✅ Distance Calculated",
        description: `Total distance: ${distanceResult.totalDistance.toFixed(2)} km`,
      });
    } catch (error: any) {
      console.error("Failed to calculate distance:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to calculate distance using TrackAsia API",
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  const handleOptimizeRoute = async () => {
    if (itineraryItems.length < 2) {
      toast({
        title: "Cannot Optimize",
        description: "Need at least 2 locations with coordinates",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Use TrackAsia VRP API directly
      const result = await optimizeItineraryRoute(
        itineraryItems,
        undefined, // no start location
        'car'
      );

      const optimizationResult = {
        optimizedItems: result.optimizedItems,
        totalDistance: result.totalDistance / 1000, // km
        totalDuration: result.totalDuration, // seconds
        totalTravelTime: Math.round(result.totalDuration / 60), // minutes
        suggestions: result.savingsPercent && result.savingsPercent > 0.1 
          ? [`Save ${result.savingsPercent.toFixed(1)}% distance with optimized route`]
          : ['Route is already efficient']
      };

      setOptimizationResult(optimizationResult);
      toast({
        title: "✅ Route Optimized",
        description: "Your route has been optimized using TrackAsia VRP API",
      });
    } catch (error: any) {
      console.error("Failed to optimize route:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to optimize route using TrackAsia API",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyOptimization = async () => {
    if (!optimizationResult) return;

    setLoading(true);
    try {
      // Prepare reorder request
      const reorderRequest = optimizationResult.optimizedItems.map((item, index) => ({
        itemId: item.itemId,
        newSortOrder: index + 1,
        newDayNumber: item.dayNumber, // Keep original day number
      }));

      await reorderItineraryItems(itineraryId, { items: reorderRequest });
      
      toast({
        title: "✅ Success",
        description: "Optimized route applied to your itinerary",
      });
      onOptimized();
      onClose();
    } catch (error: any) {
      console.error("Failed to apply optimization:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to apply optimization",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <RouteIcon className="h-6 w-6 text-blue-600" />
              Route Optimization
            </h2>
            <p className="text-gray-600">
              Optimize your travel route for efficiency
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info Card */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">How it works:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Calculate distances between all locations in your itinerary</li>
                  <li>
                    Optimize route uses driving mode to find the most efficient
                    path
                  </li>
                  <li>
                    Review the suggestions and apply them to update your
                    itinerary
                  </li>
                  <li>Save time and reduce travel distances</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleCalculateDistance}
              disabled={calculating}
              variant="outline"
              size="lg"
              className="h-auto py-4"
            >
              <div className="flex flex-col items-center gap-2">
                <Navigation className="h-6 w-6" />
                <span className="font-semibold">Calculate Distance</span>
                <span className="text-xs text-gray-500">
                  {calculating
                    ? "Calculating..."
                    : "Get total distance and travel times"}
                </span>
              </div>
            </Button>

            <Button
              onClick={handleOptimizeRoute}
              disabled={loading}
              size="lg"
              className="h-auto py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <div className="flex flex-col items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                <span className="font-semibold">Optimize Route</span>
                <span className="text-xs opacity-90">
                  {loading ? "Optimizing..." : "Find the best route (Driving)"}
                </span>
              </div>
            </Button>
          </div>

          {/* Distance Calculation Results */}
          {distanceResult && (
            <Card className="p-6 border-green-200 bg-green-50">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-600 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Distance Calculation Complete
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="text-sm text-gray-600">Total Distance</div>
                        <div className="text-xl font-bold text-gray-900">
                          {distanceResult.totalDistance.toFixed(2)} km
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="text-sm text-gray-600">Locations</div>
                        <div className="text-xl font-bold text-gray-900">
                          {distanceResult.itemDistances.length}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="text-sm text-gray-600">Est. Travel Time</div>
                        <div className="text-xl font-bold text-gray-900">
                          {formatTime(Math.round(distanceResult.totalDuration / 60))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed breakdown */}
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Distance Breakdown:
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {distanceResult.itemDistances.map((item, index) => (
                        <div
                          key={item.itemId}
                          className="flex items-center justify-between text-sm bg-white rounded p-2"
                        >
                          <span className="text-gray-700">
                            Segment {index + 1}
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">
                              {item.distanceFromPrevious.toFixed(2)} km
                            </span>
                            <span className="text-gray-500">
                              {formatTime(item.travelTimeFromPrevious)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Optimization Results */}
          {optimizationResult && (
            <Card className="p-6 border-blue-200 bg-blue-50">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Optimization Complete!
                  </h3>
                  <p className="text-gray-700 mb-4">
                    We've found a more efficient route for your itinerary.
                  </p>

                  {/* Stats Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">
                        Total Distance
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {optimizationResult.totalDistance.toFixed(2)} km
                      </div>
                      {distanceResult && (
                        <div className="text-xs text-green-600 mt-1">
                          Saved:{" "}
                          {(
                            distanceResult.totalDistance -
                            optimizationResult.totalDistance
                          ).toFixed(2)}{" "}
                          km
                        </div>
                      )}
                    </div>
                      <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">
                        Travel Time
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatTime(optimizationResult.totalTravelTime)}
                      </div>
                      {distanceResult && (
                        <div className="text-xs text-green-600 mt-1">
                          Saved: {formatTime(
                            Math.round(distanceResult.totalDuration / 60) - optimizationResult.totalTravelTime
                          )}
                        </div>
                      )}
                    </div>
                    {optimizationResult.estimatedCost && (
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">
                          Est. Cost
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          ${optimizationResult.estimatedCost}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Suggestions */}
                  {optimizationResult.suggestions &&
                    optimizationResult.suggestions.length > 0 && (
                      <div className="bg-white rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Suggestions:
                        </h4>
                        <ul className="space-y-2">
                          {optimizationResult.suggestions.map((suggestion, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 text-sm text-gray-700"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Optimized Route Preview */}
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Optimized Route Order:
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {optimizationResult.optimizedItems.map((item, index) => (
                        <div
                          key={item.itemId}
                          className="flex items-center gap-3 p-2 border rounded"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {item.place?.placeName || item.activityTitle || "Unknown Place"}
                            </div>
                            <div className="text-xs text-gray-500">
                              Day {item.dayNumber} • {item.timeOfDay || 'All day'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Apply Button */}
                  <Button
                    onClick={handleApplyOptimization}
                    size="lg"
                    className="w-full mt-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Apply This Optimization
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Loading State */}
          {loadingItinerary && (
            <Card className="p-12 text-center">
              <Loader2 className="h-16 w-16 text-gray-300 mx-auto mb-4 animate-spin" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Loading Itinerary...
              </h3>
            </Card>
          )}

          {/* Empty State */}
          {!loadingItinerary && !distanceResult && !optimizationResult && (
            <Card className="p-12 text-center">
              <RouteIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Ready to Optimize
              </h3>
              <p className="text-gray-600 mb-6">
                Click one of the buttons above to start optimizing your route
              </p>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-6">
          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}




