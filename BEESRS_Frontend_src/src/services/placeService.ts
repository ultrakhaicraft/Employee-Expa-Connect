// src/services/placeService.ts
import apiClient from '../utils/axios';

export interface PlaceDetailsResponse {
  status: string;
  html_attributions?: string[];
  result: {
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
      official_id?: string;
    }>;
    adr_address?: string;
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
      location_type?: string;
      viewport: {
        northeast: { lat: number; lng: number };
        southwest: { lat: number; lng: number };
      };
    };
    icon?: string;
    icon_background_color?: string;
    name: string;
    place_id: string;
    official_id?: string;
    plus_code?: {
      compound_code: string;
      global_code: string;
    };
    types?: string[];
    url?: string;
    utc_offset?: number;
    vicinity?: string;
    class?: string;
    subclass?: string;
    old_address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    old_formatted_address?: string;
    // Additional TrackAsia fields
    editorial_summary?: {
      overview?: string;
    };
    opening_hours?: {
      open_now?: boolean;
      weekday_text?: string[];
      periods?: Array<{
        open: { day: number; time: string };
        close?: { day: number; time: string };
      }>;
    };
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    phone_number?: string;
    price_level?: number;
    rating?: number;
    user_ratings_total?: number;
    photos?: Array<{
      photo_reference?: string;
      url?: string;
      width?: number;
      height?: number;
      html_attributions?: string[];
    }>;
    socials?: Array<{
      type?: string;
      url?: string;
    }>;
  };
  error_message?: string;
}

// Helper function to detect if a placeId is from TrackAsia
export const isTrackAsiaPlaceId = (placeId: string): boolean => {
  if (!placeId) return false;
  // TrackAsia place_id format: "17:venue:67addea7-6e98-5a17-8769-8399bbcea42f" or similar patterns
  // Pattern: number:type:uuid or number:type:other-format
  return /^\d+:[a-z_]+:/.test(placeId);
};

export const placeService = {
  // Get place details from TrackAsia API
  async getPlaceDetails(placeId: string): Promise<PlaceDetailsResponse> {
    try {
      const TRACKASIA_API_KEY = import.meta.env.VITE_TRACKASIA_API_KEY || import.meta.env.VITE_TRACKASIA_KEY || '8f56b61fbc64799470175980824237e7ac';
      const response = await fetch(
        `https://maps.track-asia.com/api/v2/place/details/json?place_id=${encodeURIComponent(placeId)}&key=${TRACKASIA_API_KEY}&new_admin=true&include_old_admin=true`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(data.error_message || 'Place not found or API error');
      }
      
      return data;
    } catch (error: any) {
      console.error('Error fetching place details:', error);
      throw new Error(`Failed to fetch place details: ${error.message}`);
    }
  },

  // Get directions to place
  getDirectionsUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  },

  // Get TrackAsia map URL
  getTrackAsiaMapUrl(placeId: string, lat: number, lng: number): string {
    return `https://maps.track-asia.com/place/${placeId}#map=14/${lat}/${lng}`;
  },

  // Get TrackAsia embed URL for iframe
  getTrackAsiaEmbedUrl(lat: number, lng: number, zoom: number = 15): string {
    return `https://maps.track-asia.com/embed.html?center=${lat},${lng}&zoom=${zoom}&markers=${lat},${lng}`;
  },

  // Check if place exists in system by GooglePlaceId
  async checkPlaceByGooglePlaceId(googlePlaceId: string): Promise<{ exists: boolean; place?: any }> {
    try {
      const response = await apiClient.get(`/Place/check-by-google-place-id`, {
        params: { googlePlaceId }
      });
      
      if (response.data && response.data.exists) {
        return { exists: true, place: response.data.place };
      }
      
      return { exists: false };
    } catch (error: any) {
      // If 404, place doesn't exist
      if (error.response?.status === 404) {
        return { exists: false };
      }
      console.error('Error checking place by GooglePlaceId:', error);
      // Return false on error to be safe
      return { exists: false };
    }
  },

  // Format address components
  formatAddress(addressComponents: any[]): string {
    const streetNumber = addressComponents.find(comp => 
      comp.types.includes('street_number')
    )?.long_name || '';
    
    const route = addressComponents.find(comp => 
      comp.types.includes('route')
    )?.long_name || '';
    
    const ward = addressComponents.find(comp => 
      comp.types.includes('administrative_area_level_3')
    )?.long_name || '';
    
    const district = addressComponents.find(comp => 
      comp.types.includes('administrative_area_level_2')
    )?.long_name || '';
    
    const city = addressComponents.find(comp => 
      comp.types.includes('administrative_area_level_1')
    )?.long_name || '';
    
    const country = addressComponents.find(comp => 
      comp.types.includes('country')
    )?.long_name || '';

    return [streetNumber, route, ward, district, city, country]
      .filter(Boolean)
      .join(', ');
  },

  // Get place category icon
  getCategoryIcon(category: string): string {
    const iconMap: Record<string, string> = {
      'restaurant': '🍽️',
      'cafe': '☕',
      'hotel': '🏨',
      'shopping': '🛍️',
      'entertainment': '🎭',
      'health': '🏥',
      'education': '🎓',
      'transport': '🚌',
      'point_of_interest': '📍',
      'food_and_drink': '🍴'
    };
    
    return iconMap[category] || '📍';
  },

  // Search places by name or address
  async searchPlaces(searchQuery: string, userLat: number, userLng: number, page: number = 1, pageSize: number = 20) {
    try {
      const response = await apiClient.post('/api/place/search', {
        Name: searchQuery || null,
        UserLat: userLat,
        UserLng: userLng,
        Page: page,
        PageSize: pageSize,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error searching places:', error);
      throw new Error(`Failed to search places: ${error.message}`);
    }
  },

  // Get all places by user's current branch
  async getPlacesByBranch(page: number = 1, pageSize: number = 100): Promise<any> {
    try {
      const response = await apiClient.get('/Place/get-all-place-by-branch', {
        params: {
          page,
          pageSize,
        },
      });
      // API returns { page, pageSize, totalItems, items: [...] }
      if (!response || response.data === undefined || response.data === null) {
        return { page, pageSize, totalItems: 0, items: [] };
      }
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { page, pageSize, totalItems: 0, items: [] };
      }
      console.error('Error fetching places by branch:', error);
      throw new Error(`Failed to fetch places: ${error.message}`);
    }
  },

  // Geocode destination to get lat/lng
  async geocodeDestination(city: string, _country: string): Promise<{ lat: number; lng: number }> {
    try {
      // Use a simple geocoding service or default coordinates
      // For now, use default coordinates for common cities
      const defaultCoords: Record<string, { lat: number; lng: number }> = {
        'bangkok': { lat: 13.7563, lng: 100.5018 },
        'ho chi minh': { lat: 10.8231, lng: 106.6297 },
        'hanoi': { lat: 21.0285, lng: 105.8542 },
        'hoi an': { lat: 15.8801, lng: 108.3380 },
        'da nang': { lat: 16.0544, lng: 108.2022 },
        'tokyo': { lat: 35.6762, lng: 139.6503 },
        'seoul': { lat: 37.5665, lng: 126.9780 },
        'singapore': { lat: 1.3521, lng: 103.8198 },
        'kuala lumpur': { lat: 3.1390, lng: 101.6869 },
        'bali': { lat: -8.4095, lng: 115.1889 },
      };

      const cityKey = city.toLowerCase();
      
      if (defaultCoords[cityKey]) {
        return defaultCoords[cityKey];
      }

      // Fallback: Use a geocoding API or default to a central location
      // For simplicity, using a default location (can be enhanced with actual geocoding)
      return { lat: 10.8231, lng: 106.6297 }; // Default to Ho Chi Minh City
    } catch (error) {
      console.error('Error geocoding destination:', error);
      return { lat: 10.8231, lng: 106.6297 }; // Default fallback
    }
  },

  // Create place from TrackAsia data
  async createPlaceFromTrackAsia(trackAsiaData: any): Promise<any> {
    try {
      // Extract information from TrackAsia place details
      const result = trackAsiaData.result || trackAsiaData;
      const addressComponents = result.address_components || [];
      
      // Extract city (administrative_area_level_1)
      const city = addressComponents.find((comp: any) => 
        comp.types.includes('administrative_area_level_1')
      )?.long_name || 'Ho Chi Minh City';
      
      // Extract state/province (administrative_area_level_1 or locality)
      const stateProvince = addressComponents.find((comp: any) => 
        comp.types.includes('administrative_area_level_1')
      )?.long_name || city;
      
      // Extract category from types
      const types = result.types || [];
      let categoryId = null;
      if (types.includes('restaurant') || types.includes('food')) {
        categoryId = 1; // Restaurant category
      } else if (types.includes('cafe') || types.includes('coffee')) {
        categoryId = 2; // Cafe category
      }

      const placeData = {
        Name: result.name || 'Unnamed Place',
        Description: result.vicinity || result.formatted_address || 'No description available',
        CategoryId: categoryId,
        GooglePlaceId: result.place_id,
        Latitude: result.geometry?.location?.lat || 0,
        Longitude: result.geometry?.location?.lng || 0,
        AddressLine1: result.formatted_address || result.vicinity || '',
        City: city,
        StateProvince: stateProvince,
        PhoneNumber: result.formatted_phone_number || null,
        WebsiteUrl: result.website || null,
        ImageUrlsList: result.photos?.slice(0, 5).map((photo: any) => ({
          ImageUrl: photo.url || '',
          AltText: result.name || 'Place image'
        })) || []
      };

      const response = await apiClient.post('/Place/create-new', placeData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating place from TrackAsia:', error);
      throw new Error(`Failed to create place: ${error.response?.data?.message || error.message}`);
    }
  },
};
