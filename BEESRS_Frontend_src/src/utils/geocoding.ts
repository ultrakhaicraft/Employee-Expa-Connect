/**
 * Reverse geocoding utility to convert latitude/longitude to detailed address
 */

export interface ReverseGeocodeResult {
  address: string;
  houseNumber?: string;
  streetName?: string;
  ward?: string;
  district?: string;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * Filter out unwanted words from address
 */
function filterUnwantedWords(text: string): string {
  const unwantedWords = [
    'châu Á',
    'châu á',
    'Châu Á',
    'Châu á',
    'Asia',
    'ASIA',
    'Đông Nam Bộ',
    'Southeast',
    'Southeast Region'
  ];
  
  let filtered = text;
  unwantedWords.forEach(word => {
    // Remove word with comma before and after
    filtered = filtered.replace(new RegExp(`,\\s*${word}\\s*,`, 'gi'), ',');
    // Remove word at the beginning
    filtered = filtered.replace(new RegExp(`^${word}\\s*,`, 'gi'), '');
    // Remove word at the end
    filtered = filtered.replace(new RegExp(`,\\s*${word}$`, 'gi'), '');
    // Remove standalone word
    filtered = filtered.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
  });
  
  // Clean up multiple commas
  filtered = filtered.replace(/,\s*,+/g, ',');
  filtered = filtered.replace(/^,\s*/, '');
  filtered = filtered.replace(/,\s*$/, '');
  filtered = filtered.trim();
  
  return filtered;
}

/**
 * Reverse geocode coordinates to get detailed address
 * Tries multiple providers for best results
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> {
  const providers = [
    // Provider 1: BigDataCloud (free, reliable) - Better for Vietnamese addresses
    async (): Promise<ReverseGeocodeResult | null> => {
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=vi`
        );
        const data = await response.json();
        
        if (data.localityInfo?.administrative) {
          const parts = data.localityInfo.administrative;
          
          // Extract address components
          const country = parts[0]?.name || '';
          const state = parts[1]?.name || '';
          const city = parts[2]?.name || '';
          const district = parts[3]?.name || '';
          const ward = parts[4]?.name || '';
          
          // Extract house number and street from informative data
          let houseNumber = '';
          let streetName = '';
          
          // Try to extract from informative data
          if (data.localityInfo?.informative) {
            const informative = data.localityInfo.informative;
            // Look for street/road information
            for (const info of informative) {
              if (info.name && (info.name.includes('Đường') || info.name.includes('đường') || info.name.includes('Street') || info.name.includes('Road'))) {
                streetName = info.name;
                break;
              }
            }
          }
          
          // Try to extract from principalLocality or locality
          if (!streetName && data.principalLocality) {
            streetName = data.principalLocality;
          }
          if (!streetName && data.locality) {
            streetName = data.locality;
          }
          
          // Build detailed address with priority: house number, street, ward, district, city
          const addressParts: string[] = [];
          
          // Add house number if available
          if (houseNumber) {
            addressParts.push(houseNumber);
          }
          
          // Add street name if available
          if (streetName) {
            addressParts.push(streetName);
          }
          
          // Add informative name (might contain street info)
          if (data.localityInfo?.informative?.[0]?.name && !streetName) {
            const informativeName = data.localityInfo.informative[0].name;
            // Only add if it doesn't look like a region name
            if (!informativeName.match(/châu|Asia|Southeast|Đông Nam/i)) {
              addressParts.push(informativeName);
            }
          }
          
          // Add administrative divisions
          if (ward) addressParts.push(ward);
          if (district) addressParts.push(district);
          if (city) addressParts.push(city);
          if (state && !state.match(/châu|Asia|Southeast|Đông Nam/i)) {
            addressParts.push(state);
          }
          if (country && country !== 'Việt Nam' && country !== 'Vietnam') {
            addressParts.push(country);
          }
          
          const fullAddress = addressParts.join(', ');
          const filteredAddress = filterUnwantedWords(fullAddress);
          
          return {
            address: filteredAddress || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            houseNumber: houseNumber || undefined,
            streetName: streetName || undefined,
            ward: ward || undefined,
            district: district || undefined,
            city: city || undefined,
            state: state || undefined,
            country: country || undefined
          };
        }
      } catch (error) {
        console.warn('BigDataCloud reverse geocoding failed:', error);
      }
      return null;
    },
    
    // Provider 2: OpenStreetMap Nominatim (free) - Better for international
    async (): Promise<ReverseGeocodeResult | null> => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=vi&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'EventChatApp/1.0'
            }
          }
        );
        const data = await response.json();
        
        if (data.address) {
          const addr = data.address;
          const addressParts: string[] = [];
          
          // Extract house number and street name
          const houseNumber = addr.house_number || '';
          const streetName = addr.road || '';
          
          // Build detailed address from components with priority
          if (houseNumber) addressParts.push(houseNumber);
          if (streetName) addressParts.push(streetName);
          if (addr.suburb || addr.neighbourhood) addressParts.push(addr.suburb || addr.neighbourhood);
          if (addr.city || addr.town || addr.village) addressParts.push(addr.city || addr.town || addr.village);
          if (addr.state && !addr.state.match(/châu|Asia|Southeast|Đông Nam/i)) {
            addressParts.push(addr.state);
          }
          if (addr.country && addr.country !== 'Việt Nam' && addr.country !== 'Vietnam') {
            addressParts.push(addr.country);
          }
          
          const fullAddress = addressParts.join(', ');
          const filteredAddress = filterUnwantedWords(fullAddress);
          
          return {
            address: filteredAddress || filterUnwantedWords(data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`),
            houseNumber: houseNumber || undefined,
            streetName: streetName || undefined,
            ward: addr.suburb || addr.neighbourhood || undefined,
            district: addr.city_district || addr.county || undefined,
            city: addr.city || addr.town || addr.village || undefined,
            state: addr.state || undefined,
            country: addr.country || undefined
          };
        }
      } catch (error) {
        console.warn('OpenStreetMap Nominatim reverse geocoding failed:', error);
      }
      return null;
    }
  ];

  // Try each provider
  for (const provider of providers) {
    try {
      const result = await provider();
      if (result && result.address) {
        return result;
      }
    } catch (error) {
      console.warn('Provider failed:', error);
    }
  }
  
  // Fallback to coordinates
  return {
    address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
  };
}

/**
 * Parse location message to extract coordinates
 * Handles formats like:
 * - "📍 Location: 10.808326, 106.801162"
 * - "📍 Location: 10.808326, 106.801162\n\nSome caption"
 * - "10.808326, 106.801162"
 */
export function parseLocationFromMessage(message: string): { latitude: number; longitude: number } | null {
  // Pattern to match coordinates: "latitude, longitude" (with optional spaces)
  // This will match coordinates anywhere in the message
  const coordinatePattern = /(-?\d+\.?\d+)\s*,\s*(-?\d+\.?\d+)/;
  const match = message.match(coordinatePattern);
  
  if (match) {
    const latitude = parseFloat(match[1]);
    const longitude = parseFloat(match[2]);
    
    // Validate coordinates (Vietnam coordinates are roughly 8-24°N, 102-110°E)
    // But we'll use global bounds for flexibility
    if (!isNaN(latitude) && !isNaN(longitude) && 
        latitude >= -90 && latitude <= 90 && 
        longitude >= -180 && longitude <= 180) {
      return { latitude, longitude };
    }
  }
  
  return null;
}

/**
 * Check if message is a location message
 */
export function isLocationMessage(message: string): boolean {
  return message.includes('📍') && message.includes('Location');
}

