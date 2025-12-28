/**
 * RouteMap Component - Display directions and route on map
 * Uses TrackAsia Directions API to show turn-by-turn navigation
 */
import React, { useEffect, useState } from 'react';
import { getDirections, formatDistance, formatDuration } from '@/services/trackAsiaService';
import type { DirectionsResponse } from '@/services/trackAsiaService';

interface RouteMapProps {
  from: { latitude: number; longitude: number };
  to: { latitude: number; longitude: number };
  mode?: 'car' | 'moto' | 'walk' | 'truck';
  alternatives?: boolean;
  className?: string;
  onRouteCalculated?: (route: DirectionsResponse) => void;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  from,
  to,
  mode = 'car',
  alternatives = false,
  className = '',
  onRouteCalculated
}) => {
  const [route, setRoute] = useState<DirectionsResponse | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoute = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getDirections({
          origin: from,
          destination: to,
          mode,
          alternatives,
          language: 'vi'
        });

        if (result.status !== 'OK' || !result.routes || result.routes.length === 0) {
          throw new Error('No route found');
        }

        setRoute(result);
        if (onRouteCalculated) {
          onRouteCalculated(result);
        }
      } catch (err: any) {
        console.error('Failed to fetch route:', err);
        setError(err.message || 'Failed to load route');
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [from, to, mode, alternatives, onRouteCalculated]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg ${className}`}>
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">🔄</div>
          <div className="text-gray-600">Loading route...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="text-red-800">
          <div className="text-2xl mb-2">❌</div>
          <div className="font-medium">Error loading route</div>
          <div className="text-sm mt-1">{error}</div>
        </div>
      </div>
    );
  }

  if (!route || route.routes.length === 0) {
    return (
      <div className={`p-6 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <div className="text-yellow-800">No route found</div>
      </div>
    );
  }

  const selectedRoute = route.routes[selectedRouteIndex];
  const leg = selectedRoute.legs[0];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Map placeholder - Integrate with TrackAsia GL JS or Leaflet */}
      <div className="relative h-[400px] bg-gray-200 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          {/* TODO: Integrate actual map library here */}
          <div className="text-center">
            <div className="text-4xl mb-2">🗺️</div>
            <div className="text-sm">Map Integration Point</div>
            <div className="text-xs mt-1">
              Use TrackAsia GL JS or Leaflet to render the polyline
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Polyline: {selectedRoute.overview_polyline.substring(0, 50)}...
            </div>
          </div>
        </div>
      </div>

      {/* Alternative routes selector */}
      {route.routes.length > 1 && (
        <div className="flex gap-2">
          {route.routes.map((r, index) => (
            <button
              key={index}
              onClick={() => setSelectedRouteIndex(index)}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                selectedRouteIndex === index
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium">Route {index + 1}</div>
              <div className="text-xs text-gray-600 mt-1">
                {r.legs[0].distance.text} • {r.legs[0].duration.text}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Route summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl mb-1">📏</div>
          <div className="text-sm text-gray-600">Distance</div>
          <div className="text-lg font-bold text-blue-900">
            {leg.distance.text || formatDistance(leg.distance.value)}
          </div>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl mb-1">⏱️</div>
          <div className="text-sm text-gray-600">Duration</div>
          <div className="text-lg font-bold text-purple-900">
            {leg.duration.text || formatDuration(leg.duration.value)}
          </div>
        </div>

        <div className="p-4 bg-green-50 rounded-lg">
          <div className="text-2xl mb-1">
            {mode === 'car' && '🚗'}
            {mode === 'moto' && '🏍️'}
            {mode === 'walk' && '🚶'}
            {mode === 'truck' && '🚛'}
          </div>
          <div className="text-sm text-gray-600">Mode</div>
          <div className="text-lg font-bold text-green-900 capitalize">
            {mode}
          </div>
        </div>
      </div>

      {/* Route details */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Route Details</h3>
          <div className="text-sm text-gray-600 mt-1">
            From {leg.start_address} to {leg.end_address}
          </div>
        </div>

        {/* Turn-by-turn instructions */}
        <div className="divide-y max-h-[400px] overflow-y-auto">
          {leg.steps.map((step, index) => (
            <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex gap-3">
                {/* Step number */}
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold text-sm">
                  {index + 1}
                </div>

                {/* Step details */}
                <div className="flex-1">
                  {/* Instruction */}
                  <div
                    className="text-sm"
                    dangerouslySetInnerHTML={{ __html: step.html_instructions }}
                  />

                  {/* Distance & Duration */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>📏 {step.distance.text}</span>
                    <span>⏱️ {step.duration.text}</span>
                    {step.maneuver && (
                      <span className="bg-gray-100 px-2 py-0.5 rounded">
                        {step.maneuver}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Compact version - just shows summary
 */
export const RouteMapCompact: React.FC<RouteMapProps> = (props) => {
  const [route, setRoute] = useState<DirectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const result = await getDirections({
          origin: props.from,
          destination: props.to,
          mode: props.mode || 'car',
          alternatives: false,
          language: 'vi'
        });
        setRoute(result);
      } catch (err) {
        console.error('Failed to fetch route:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [props.from, props.to, props.mode]);

  if (loading || !route || route.routes.length === 0) {
    return null;
  }

  const leg = route.routes[0].legs[0];

  return (
    <div className={`inline-flex items-center gap-3 p-3 bg-blue-50 rounded-lg ${props.className}`}>
      <span className="text-blue-600">🚗</span>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{leg.distance.text}</span>
        <span className="text-gray-400">•</span>
        <span>{leg.duration.text}</span>
      </div>
    </div>
  );
};

