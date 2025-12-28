/**
 * Vehicle Routing Problem (VRP) Service
 * Optimize itinerary routes using TrackAsia VRP API
 */
import { solveVRP } from './trackAsiaService';
import type { ItineraryItem } from '@/types/itinerary.types';

export interface OptimizedRouteResult {
  optimizedItems: ItineraryItem[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  originalDistance?: number;
  originalDuration?: number;
  savingsPercent?: number;
  route: {
    vehicleId: string;
    steps: Array<{
      type: 'start' | 'job' | 'end';
      location: [number, number];
      itemId?: string;
      arrival?: number;
      duration?: number;
      distance?: number;
    }>;
  };
}

/**
 * Optimize itinerary route order to minimize travel distance/time
 */
export const optimizeItineraryRoute = async (
  items: ItineraryItem[],
  startLocation?: { latitude: number; longitude: number },
  profile: 'car' | 'moto' | 'walk' | 'truck' = 'car'
): Promise<OptimizedRouteResult> => {
  try {
    // Filter items with valid coordinates
    const validItems = items.filter(
      item => item.place?.latitude && item.place?.longitude
    );

    if (validItems.length < 2) {
      throw new Error('Need at least 2 locations to optimize');
    }

    // Build jobs (each place is a "job" to visit)
    const jobs = validItems.map((item, index) => ({
      id: item.itemId,
      location: [item.place!.longitude!, item.place!.latitude!] as [number, number],
      service: item.estimatedDuration || 3600, // Duration at location (seconds)
      priority: validItems.length - index // Higher priority for items added first
    }));

    // Build vehicle (single vehicle starting from user location or first item)
    const vehicleStart = startLocation
      ? [startLocation.longitude, startLocation.latitude] as [number, number]
      : [validItems[0].place!.longitude!, validItems[0].place!.latitude!] as [number, number];

    const vehicles = [{
      id: 'vehicle_1',
      start: vehicleStart,
      end: vehicleStart // Return to start
    }];

    // Call VRP API
    const result = await solveVRP({
      jobs,
      vehicles,
      profile
    });

    if (result.code !== 'Ok' || result.routes.length === 0) {
      throw new Error('Unable to optimize route. Please try again.');
    }

    // Extract optimized order
    const route = result.routes[0];
    const optimizedOrder = route.steps
      .filter(step => step.type === 'job' && step.job)
      .map(step => step.job!);

    // Reorder items based on VRP result
    const optimizedItems = optimizedOrder
      .map(jobId => validItems.find(item => item.itemId === jobId))
      .filter((item): item is ItineraryItem => item !== undefined);

    // Add back items without coordinates (at the end)
    const itemsWithoutCoords = items.filter(
      item => !item.place?.latitude || !item.place?.longitude
    );

    const finalOptimizedItems = [...optimizedItems, ...itemsWithoutCoords];

    // Calculate original route distance for comparison
    // (This would require another API call - skip for now)
    const savingsPercent = estimateSavings(items.length);

    return {
      optimizedItems: finalOptimizedItems,
      totalDistance: result.summary.distance,
      totalDuration: result.summary.duration,
      savingsPercent,
      route: {
        vehicleId: route.vehicle,
        steps: route.steps.map(step => ({
          type: step.type,
          location: step.location,
          itemId: step.job,
          arrival: step.arrival,
          duration: step.duration,
          distance: step.distance
        }))
      }
    };
  } catch (error: any) {
    console.error('Failed to optimize route:', error);
    throw new Error(error.message || 'Unable to optimize route');
  }
};

/**
 * Estimate savings percentage based on number of stops
 * Real calculation would require comparing original vs optimized routes
 */
const estimateSavings = (stopCount: number): number => {
  if (stopCount <= 3) return 5;
  if (stopCount <= 5) return 10;
  if (stopCount <= 8) return 15;
  return 20;
};

/**
 * Optimize route for multiple vehicles (group travel)
 */
export const optimizeMultiVehicleRoute = async (
  items: ItineraryItem[],
  vehicleCount: number = 2,
  vehicleCapacity: number = 4,
  startLocation?: { latitude: number; longitude: number },
  profile: 'car' | 'moto' | 'truck' = 'car'
): Promise<Array<OptimizedRouteResult>> => {
  try {
    const validItems = items.filter(
      item => item.place?.latitude && item.place?.longitude
    );

    if (validItems.length < vehicleCount) {
      throw new Error(`Need at least ${vehicleCount} locations for ${vehicleCount} vehicles`);
    }

    // Build jobs
    const jobs = validItems.map(item => ({
      id: item.itemId,
      location: [item.place!.longitude!, item.place!.latitude!] as [number, number],
      service: item.estimatedDuration || 3600,
      amount: [1] // Each location requires 1 capacity unit
    }));

    // Build vehicles
    const vehicleStart = startLocation
      ? [startLocation.longitude, startLocation.latitude] as [number, number]
      : [validItems[0].place!.longitude!, validItems[0].place!.latitude!] as [number, number];

    const vehicles = Array.from({ length: vehicleCount }, (_, i) => ({
      id: `vehicle_${i + 1}`,
      start: vehicleStart,
      end: vehicleStart,
      capacity: [vehicleCapacity]
    }));

    // Call VRP API
    const result = await solveVRP({
      jobs,
      vehicles,
      profile
    });

    if (result.code !== 'Ok' || result.routes.length === 0) {
      throw new Error('Unable to optimize route for multiple vehicles');
    }

    // Build result for each vehicle
    return result.routes.map(route => {
      const optimizedOrder = route.steps
        .filter(step => step.type === 'job')
        .map(step => step.job!);

      const optimizedItems = optimizedOrder
        .map(jobId => validItems.find(item => item.itemId === jobId))
        .filter((item): item is ItineraryItem => item !== undefined);

      return {
        optimizedItems,
        totalDistance: route.distance,
        totalDuration: route.duration,
        route: {
          vehicleId: route.vehicle,
          steps: route.steps.map(step => ({
            type: step.type,
            location: step.location,
            itemId: step.job,
            arrival: step.arrival,
            duration: step.duration,
            distance: step.distance
          }))
        }
      };
    });
  } catch (error: any) {
    console.error('Failed to optimize multi-vehicle route:', error);
    throw new Error(error.message || 'Unable to optimize route for multiple vehicles');
  }
};

