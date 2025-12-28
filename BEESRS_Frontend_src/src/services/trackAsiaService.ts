/**
 * TrackAsia API Integration Service
 * Documentation: 
 * - Distance Matrix: https://docs.track-asia.com/vi/api-integration/distance-matrix/v1/
 * - Directions: https://docs.track-asia.com/vi/api-integration/directions/v2/
 * - VRP: https://docs.track-asia.com/vi/api-integration/vehicle-routing-problem/v1/
 */

// =====================
// TYPES & INTERFACES
// =====================

/** Supported travel modes */
export type TravelProfile = 'car' | 'moto' | 'truck' | 'walk';

/** Supported output formats */
export type OutputFormat = 'json' | 'xml';

/** Coordinates in [longitude, latitude] format */
export type Coordinates = [number, number];

/** Location with lat/lng */
export interface Location {
  latitude: number;
  longitude: number;
}

// =====================
// DISTANCE MATRIX API
// =====================

export interface DistanceMatrixRequest {
  profile: TravelProfile;
  coordinates: Location[]; // Array of locations
  sources?: number[]; // Indices of source locations (default: all)
  destinations?: number[]; // Indices of destination locations (default: all)
  annotations?: 'duration' | 'distance' | 'duration,distance'; // Default: duration
  fallback_speed?: number; // Speed for straight-line estimation if route not found
}

export interface DistanceMatrixResponse {
  code: string; // "Ok" if successful
  sources: Array<{
    location: Coordinates;
    name?: string;
  }>;
  destinations: Array<{
    location: Coordinates;
    name?: string;
  }>;
  distances?: number[][]; // Matrix of distances in meters
  durations?: number[][]; // Matrix of durations in seconds
}

// =====================
// DIRECTIONS API
// =====================

export interface DirectionsRequest {
  origin: string | Location; // Address string or coordinates
  destination: string | Location; // Address string or coordinates
  mode?: TravelProfile; // Default: 'driving'
  waypoints?: Array<string | Location>; // Optional waypoints
  alternatives?: boolean; // Return alternative routes
  avoid?: 'tolls' | 'highways' | 'ferries'; // Roads to avoid
  language?: 'vi' | 'en'; // Response language
  outputFormat?: OutputFormat; // Default: 'json'
}

export interface DirectionsResponse {
  routes: Array<{
    summary: string; // Route summary (main streets)
    bounds: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
    copyrights: string;
    legs: Array<{
      distance: { text: string; value: number }; // Distance in meters
      duration: { text: string; value: number }; // Duration in seconds
      start_address: string;
      end_address: string;
      start_location: { lat: number; lng: number };
      end_location: { lat: number; lng: number };
      steps: Array<{
        distance: { text: string; value: number };
        duration: { text: string; value: number };
        start_location: { lat: number; lng: number };
        end_location: { lat: number; lng: number };
        polyline: string; // Encoded polyline
        html_instructions: string; // Turn-by-turn instructions
        travel_mode: string; // "DRIVING", "WALKING", etc.
        maneuver?: string; // "turn-right", "turn-left", etc.
      }>;
    }>;
    overview_polyline: string; // Encoded polyline for entire route
    waypoint_order: number[];
  }>;
  status: string; // "OK", "NOT_FOUND", etc.
  geocoded_waypoints: Array<{
    geocoder_status: string;
    place_id: string;
    types: string[];
  }>;
}

// =====================
// VEHICLE ROUTING PROBLEM API
// =====================

export interface VRPJob {
  id: string;
  location: Coordinates;
  service?: number; // Service time in seconds
  amount?: number[]; // Amounts to deliver/pickup
  skills?: number[]; // Required skills
  priority?: number; // Job priority
  time_windows?: Array<[number, number]>; // Time windows [start, end]
}

export interface VRPVehicle {
  id: string;
  start: Coordinates;
  end?: Coordinates; // If different from start
  capacity?: number[]; // Vehicle capacity
  skills?: number[]; // Vehicle skills
  time_window?: [number, number]; // Vehicle availability
  speed_factor?: number; // Speed multiplier
}

export interface VRPRequest {
  jobs: VRPJob[];
  vehicles: VRPVehicle[];
  profile?: TravelProfile; // Default: 'car'
}

export interface VRPResponse {
  code: string;
  summary: {
    cost: number; // Total route cost
    routes: number; // Number of routes
    unassigned: number; // Number of unassigned jobs
    service: number; // Total service time
    duration: number; // Total duration
    waiting_time: number;
    priority: number;
    distance: number; // Total distance in meters
  };
  routes: Array<{
    vehicle: string;
    cost: number;
    service: number;
    duration: number;
    waiting_time: number;
    priority: number;
    distance: number;
    steps: Array<{
      type: 'start' | 'job' | 'end';
      location: Coordinates;
      job?: string;
      arrival?: number;
      duration?: number;
      distance?: number;
    }>;
  }>;
  unassigned: Array<{
    id: string;
    location: Coordinates;
  }>;
}

// =====================
// CONFIGURATION
// =====================

const TRACKASIA_BASE_URL = 'https://maps.track-asia.com';
const API_KEY = import.meta.env.VITE_TRACKASIA_KEY || 'public_key'; // Use your own key!

/**
 * Warning if using public_key
 */
if (API_KEY === 'public_key') {
  console.warn(
    '⚠️ TrackAsia: Using public_key (limited). Set VITE_TRACKASIA_KEY in your .env file'
  );
}

// =====================
// HELPER FUNCTIONS
// =====================

/**
 * Convert Location object to "lat,lng" string
 */
function locationToString(location: Location): string {
  return `${location.latitude},${location.longitude}`;
}

/**
 * Convert Location to coordinates array [lng, lat]
 * Note: This function is kept for potential future use
 */
// Unused helper function - may be needed in future
// function locationToCoordinates(location: Location): Coordinates {
//   return [location.longitude, location.latitude];
// }

/**
 * Build coordinates string for Distance Matrix API
 * Format: "lng1,lat1;lng2,lat2;lng3,lat3"
 */
function buildCoordinatesString(locations: Location[]): string {
  return locations
    .map((loc) => `${loc.longitude},${loc.latitude}`)
    .join(';');
}

// =====================
// API FUNCTIONS
// =====================

/**
 * Calculate distance and/or duration matrix between multiple locations
 * 
 * @example
 * const result = await getDistanceMatrix({
 *   profile: 'moto',
 *   coordinates: [
 *     { latitude: 10.7756, longitude: 106.7019 }, // Landmark 81
 *     { latitude: 10.7623, longitude: 106.6822 }, // Ben Thanh Market
 *     { latitude: 10.8231, longitude: 106.6297 }  // Tan Son Nhat Airport
 *   ],
 *   annotations: 'duration,distance'
 * });
 */
export async function getDistanceMatrix(
  request: DistanceMatrixRequest
): Promise<DistanceMatrixResponse> {
  try {
    const { profile, coordinates, sources, destinations, annotations, fallback_speed } = request;

    // Build coordinates string
    const coordsString = buildCoordinatesString(coordinates);

    // Build URL
    const url = new URL(
      `${TRACKASIA_BASE_URL}/distance-matrix/v1/${profile}/${coordsString}`
    );

    // Add query parameters
    url.searchParams.append('key', API_KEY);
    if (sources) url.searchParams.append('sources', sources.join(';'));
    if (destinations) url.searchParams.append('destinations', destinations.join(';'));
    if (annotations) url.searchParams.append('annotations', annotations);
    if (fallback_speed) url.searchParams.append('fallback_speed', fallback_speed.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`TrackAsia Distance Matrix API error: ${response.status}`);
    }

    const data: DistanceMatrixResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling TrackAsia Distance Matrix API:', error);
    throw error;
  }
}

/**
 * Get directions from origin to destination
 * 
 * @example
 * const route = await getDirections({
 *   origin: { latitude: 10.7756, longitude: 106.7019 },
 *   destination: { latitude: 10.7623, longitude: 106.6822 },
 *   mode: 'driving',
 *   alternatives: true
 * });
 */
export async function getDirections(
  request: DirectionsRequest
): Promise<DirectionsResponse> {
  try {
    const {
      origin,
      destination,
      mode = 'driving',
      waypoints,
      alternatives,
      avoid,
      language = 'vi',
      outputFormat = 'json'
    } = request;

    // Build URL
    const url = new URL(
      `${TRACKASIA_BASE_URL}/route/v2/directions/${outputFormat}`
    );

    // Add query parameters
    url.searchParams.append('key', API_KEY);
    url.searchParams.append('mode', mode);
    url.searchParams.append('language', language);

    // Handle origin (string or coordinates)
    if (typeof origin === 'string') {
      url.searchParams.append('origin', origin);
    } else {
      url.searchParams.append('origin', locationToString(origin));
    }

    // Handle destination (string or coordinates)
    if (typeof destination === 'string') {
      url.searchParams.append('destination', destination);
    } else {
      url.searchParams.append('destination', locationToString(destination));
    }

    // Optional parameters
    if (waypoints && waypoints.length > 0) {
      const waypointsStr = waypoints
        .map((wp) => (typeof wp === 'string' ? wp : locationToString(wp)))
        .join('|');
      url.searchParams.append('waypoints', waypointsStr);
    }

    if (alternatives !== undefined) {
      url.searchParams.append('alternatives', alternatives.toString());
    }

    if (avoid) {
      url.searchParams.append('avoid', avoid);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`TrackAsia Directions API error: ${response.status}`);
    }

    const data: DirectionsResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling TrackAsia Directions API:', error);
    throw error;
  }
}

/**
 * Solve Vehicle Routing Problem (VRP)
 * Optimize routes for multiple vehicles and jobs
 * 
 * @example
 * const solution = await solveVRP({
 *   jobs: [
 *     { id: 'job1', location: [106.7019, 10.7756] },
 *     { id: 'job2', location: [106.6822, 10.7623] }
 *   ],
 *   vehicles: [
 *     { id: 'vehicle1', start: [106.6297, 10.8231] }
 *   ],
 *   profile: 'car'
 * });
 */
export async function solveVRP(request: VRPRequest): Promise<VRPResponse> {
  try {
    const { jobs, vehicles, profile = 'car' } = request;

    // TrackAsia VRP uses GET method with coordinates in URL
    // Format: /vehicle-routing-problem/v1/{profile}/{coordinates}?key=...&roundtrip=true
    
    // Build coordinates string from jobs (waypoints to visit)
    const coordinates = jobs.map(job => `${job.location[0]},${job.location[1]}`).join(';');
    
    // Build URL
    const url = new URL(
      `${TRACKASIA_BASE_URL}/vehicle-routing-problem/v1/${profile}/${coordinates}`
    );

    url.searchParams.append('key', API_KEY);
    url.searchParams.append('roundtrip', vehicles[0]?.end ? 'true' : 'false');

    const response = await fetch(url.toString(), {
      method: 'GET'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TrackAsia VRP API error ${response.status}: ${errorText}`);
    }

    const data: any = await response.json();
    
    // Transform TrackAsia VRP response to our VRPResponse format
    if (data.code !== 'Ok') {
      throw new Error(`TrackAsia VRP returned: ${data.code}`);
    }

    // TrackAsia VRP returns trips array, transform to our routes format
    const trips = data.trips || [];
    if (trips.length === 0) {
      throw new Error('No route found');
    }

    const trip = trips[0];
    const routes = [{
      vehicle: trip.vehicle_id || 'vehicle_1',
      cost: trip.cost || 0,
      service: trip.service || 0,
      duration: trip.duration || 0,
      waiting_time: 0,
      priority: 0,
      distance: trip.distance || 0,
      steps: trip.steps.map((step: any) => {
        // way_point is the index in the coordinates array (0-based)
        const jobIndex = step.way_point;
        return {
          type: step.type === 'start' ? 'start' : step.type === 'end' ? 'end' : 'job',
          location: step.location,
          arrival: step.arrival,
          duration: step.duration,
          distance: step.distance,
          job: (step.type === 'job' && jobIndex !== undefined && jobs[jobIndex]) 
            ? jobs[jobIndex].id 
            : undefined
        };
      })
    }];

    return {
      code: data.code,
      summary: {
        cost: trip.cost || 0,
        routes: 1,
        unassigned: data.unassigned?.length || 0,
        service: trip.service || 0,
        duration: trip.duration || 0,
        waiting_time: 0,
        priority: 0,
        distance: trip.distance || 0
      },
      routes,
      unassigned: data.unassigned || []
    };
  } catch (error) {
    console.error('Error calling TrackAsia VRP API:', error);
    throw error;
  }
}

// =====================
// UTILITY FUNCTIONS
// =====================

/**
 * Calculate distance between two points using Distance Matrix API
 */
export async function calculateDistance(
  from: Location,
  to: Location,
  profile: TravelProfile = 'car'
): Promise<{ distance: number; duration: number }> {
  const result = await getDistanceMatrix({
    profile,
    coordinates: [from, to],
    annotations: 'duration,distance'
  });

  return {
    distance: result.distances?.[0]?.[1] || 0, // meters
    duration: result.durations?.[0]?.[1] || 0 // seconds
  };
}

/**
 * Get the fastest route between two points
 */
export async function getFastestRoute(
  from: Location,
  to: Location,
  mode: TravelProfile = 'car'
) {
  const result = await getDirections({
    origin: from,
    destination: to,
    mode,
    alternatives: false
  });

  if (result.routes && result.routes.length > 0) {
    const route = result.routes[0];
    return {
      distance: route.legs[0].distance.value, // meters
      duration: route.legs[0].duration.value, // seconds
      polyline: route.overview_polyline,
      steps: route.legs[0].steps
    };
  }

  throw new Error('No route found');
}

/**
 * Format duration from seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format distance from meters to human-readable string
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

// =====================
// EXPORT DEFAULT
// =====================

export default {
  getDistanceMatrix,
  getDirections,
  solveVRP,
  calculateDistance,
  getFastestRoute,
  formatDuration,
  formatDistance
};

