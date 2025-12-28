// Location service for fetching countries, cities, and timezones from third-party APIs

export interface Country {
  name: string;
  code: string;
  timezones: string[];
  population?: number;
  region?: string;
  capital?: string[];
}

export interface City {
  name: string;
  country: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
  population?: number;
  adminCode1?: string;
}

export interface TimezoneInfo {
  timezone: string;
  utc_offset: string;
  country: string;
  countryCode?: string;
}

export interface LocationSearchResult {
  countries: Country[];
  cities: City[];
  timezones: TimezoneInfo[];
}

// Cache for API responses
const cache = {
  countries: null as Country[] | null,
  cities: new Map<string, City[]>(),
  timezones: new Map<string, TimezoneInfo[]>(),
  lastFetch: new Map<string, number>()
};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Environment variables for API endpoints
const REST_COUNTRIES_API = import.meta.env.VITE_REST_COUNTRIES_API || 'https://restcountries.com/v3.1/all?fields=name,cca2,timezones,population,region,capital';
const GEONAMES_API = import.meta.env.VITE_GEONAMES_API || 'http://api.geonames.org/searchJSON';
const GEONAMES_USERNAME = import.meta.env.VITE_GEONAMES_USERNAME || 'demo';
const TIMEZONE_API = import.meta.env.VITE_TIMEZONE_API || 'https://api.timezonedb.com/v2.1/list-time-zone';
const TIMEZONE_API_KEY = import.meta.env.VITE_TIMEZONE_API_KEY;


/**
 * Check if cache is still valid
 */
const isCacheValid = (key: string): boolean => {
  const lastFetch = cache.lastFetch.get(key);
  if (!lastFetch) return false;
  return Date.now() - lastFetch < CACHE_DURATION;
};

/**
 * Fetch all countries with their timezones
 */
export const fetchCountries = async (): Promise<Country[]> => {
  if (cache.countries && isCacheValid('countries')) {
    return cache.countries;
  }

  try {
    const response = await fetch(REST_COUNTRIES_API);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch countries: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format from countries API');
    }
    
    const countries: Country[] = data.map((country: any) => ({
      name: country.name.common,
      code: country.cca2,
      timezones: country.timezones || [],
      population: country.population,
      region: country.region,
      capital: country.capital
    })).sort((a: Country, b: Country) => a.name.localeCompare(b.name));

    cache.countries = countries;
    cache.lastFetch.set('countries', Date.now());
    return countries;
  } catch (error) {
    console.error('Error fetching countries:', error);
    
    // Return cached data if available, otherwise fallback
    if (cache.countries) {
      console.warn('Using cached countries data due to API error');
      return cache.countries;
    }
    
    // Fallback data
    console.warn('Using fallback countries data');
    return getFallbackCountries();
  }
};

/**
 * Fallback countries data
 */
const getFallbackCountries = (): Country[] => [
  { name: 'Vietnam', code: 'VN', timezones: ['Asia/Ho_Chi_Minh'], region: 'Asia' },
  { name: 'United States', code: 'US', timezones: ['America/New_York', 'America/Los_Angeles', 'America/Chicago'], region: 'Americas' },
  { name: 'United Kingdom', code: 'GB', timezones: ['Europe/London'], region: 'Europe' },
  { name: 'Japan', code: 'JP', timezones: ['Asia/Tokyo'], region: 'Asia' },
  { name: 'Singapore', code: 'SG', timezones: ['Asia/Singapore'], region: 'Asia' },
  { name: 'Australia', code: 'AU', timezones: ['Australia/Sydney', 'Australia/Melbourne'], region: 'Oceania' },
  { name: 'Canada', code: 'CA', timezones: ['America/Toronto', 'America/Vancouver'], region: 'Americas' },
  { name: 'Germany', code: 'DE', timezones: ['Europe/Berlin'], region: 'Europe' },
  { name: 'France', code: 'FR', timezones: ['Europe/Paris'], region: 'Europe' },
  { name: 'South Korea', code: 'KR', timezones: ['Asia/Seoul'], region: 'Asia' }
];

/**
 * Fetch cities for a specific country
 */
export const fetchCitiesByCountry = async (countryCode: string): Promise<City[]> => {
  const cacheKey = `cities_${countryCode}`;
  
  if (cache.cities.has(countryCode) && isCacheValid(cacheKey)) {
    return cache.cities.get(countryCode)!;
  }

  try {
    // Try to use Geonames API if username is configured
    if (GEONAMES_USERNAME && GEONAMES_USERNAME !== 'demo') {
      const url = `${GEONAMES_API}?country=${countryCode}&maxRows=50&username=${GEONAMES_USERNAME}&featureClass=P&orderby=population`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        
        if (data.geonames && data.geonames.length > 0) {
          const cities: City[] = data.geonames.map((city: any) => ({
            name: city.name,
            country: city.countryName,
            timezone: city.timezone?.timeZoneId || '',
            latitude: city.lat,
            longitude: city.lng,
            population: city.population,
            adminCode1: city.adminCode1
          })).sort((a: City, b: City) => (b.population || 0) - (a.population || 0));

          cache.cities.set(countryCode, cities);
          cache.lastFetch.set(cacheKey, Date.now());
          return cities;
        }
      } else {
        console.error(`Geonames API error for ${countryCode}:`, response.status, response.statusText);
      }
    }
    
    // Fallback to mock data
    console.warn(`Using mock data for cities in ${countryCode}. Configure GEONAMES_USERNAME for real data.`);
    const cities = getMockCities(countryCode);
    cache.cities.set(countryCode, cities);
    cache.lastFetch.set(cacheKey, Date.now());
    return cities;
    
  } catch (error) {
    console.error('Error fetching cities:', error);
    
    // Return cached data if available
    if (cache.cities.has(countryCode)) {
      console.warn('Using cached cities data due to API error');
      return cache.cities.get(countryCode)!;
    }
    
    return getMockCities(countryCode);
  }
};

/**
 * Mock cities data for fallback
 */
const getMockCities = (countryCode: string): City[] => {
    const mockCities: Record<string, City[]> = {
      'VN': [
      { name: 'Ho Chi Minh City', country: 'Vietnam', timezone: 'Asia/Ho_Chi_Minh', latitude: 10.8231, longitude: 106.6297, population: 8993000 },
      { name: 'Hanoi', country: 'Vietnam', timezone: 'Asia/Ho_Chi_Minh', latitude: 21.0285, longitude: 105.8542, population: 8053000 },
      { name: 'Da Nang', country: 'Vietnam', timezone: 'Asia/Ho_Chi_Minh', latitude: 16.0544, longitude: 108.2022, population: 1134000 },
      { name: 'Hai Phong', country: 'Vietnam', timezone: 'Asia/Ho_Chi_Minh', latitude: 20.8449, longitude: 106.6881, population: 2013000 },
      { name: 'Can Tho', country: 'Vietnam', timezone: 'Asia/Ho_Chi_Minh', latitude: 10.0452, longitude: 105.7469, population: 1237000 }
      ],
      'US': [
      { name: 'New York', country: 'United States', timezone: 'America/New_York', latitude: 40.7128, longitude: -74.0060, population: 8336817 },
      { name: 'Los Angeles', country: 'United States', timezone: 'America/Los_Angeles', latitude: 34.0522, longitude: -118.2437, population: 3979576 },
      { name: 'Chicago', country: 'United States', timezone: 'America/Chicago', latitude: 41.8781, longitude: -87.6298, population: 2693976 },
      { name: 'Houston', country: 'United States', timezone: 'America/Chicago', latitude: 29.7604, longitude: -95.3698, population: 2320268 },
      { name: 'Phoenix', country: 'United States', timezone: 'America/Phoenix', latitude: 33.4484, longitude: -112.0740, population: 1608139 }
      ],
      'GB': [
      { name: 'London', country: 'United Kingdom', timezone: 'Europe/London', latitude: 51.5074, longitude: -0.1278, population: 8982000 },
      { name: 'Birmingham', country: 'United Kingdom', timezone: 'Europe/London', latitude: 52.4862, longitude: -1.8904, population: 1142000 },
      { name: 'Manchester', country: 'United Kingdom', timezone: 'Europe/London', latitude: 53.4808, longitude: -2.2426, population: 547627 },
      { name: 'Glasgow', country: 'United Kingdom', timezone: 'Europe/London', latitude: 55.8642, longitude: -4.2518, population: 626410 },
      { name: 'Liverpool', country: 'United Kingdom', timezone: 'Europe/London', latitude: 53.4084, longitude: -2.9916, population: 498042 }
      ],
      'JP': [
      { name: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', latitude: 35.6762, longitude: 139.6503, population: 13960000 },
      { name: 'Osaka', country: 'Japan', timezone: 'Asia/Tokyo', latitude: 34.6937, longitude: 135.5023, population: 2691000 },
      { name: 'Kyoto', country: 'Japan', timezone: 'Asia/Tokyo', latitude: 35.0116, longitude: 135.7681, population: 1465000 },
      { name: 'Yokohama', country: 'Japan', timezone: 'Asia/Tokyo', latitude: 35.4437, longitude: 139.6380, population: 3725000 },
      { name: 'Nagoya', country: 'Japan', timezone: 'Asia/Tokyo', latitude: 35.1815, longitude: 136.9066, population: 2328000 }
      ],
      'SG': [
      { name: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', latitude: 1.3521, longitude: 103.8198, population: 5454000 }
      ],
      'AU': [
      { name: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', latitude: -33.8688, longitude: 151.2093, population: 5312000 },
      { name: 'Melbourne', country: 'Australia', timezone: 'Australia/Melbourne', latitude: -37.8136, longitude: 144.9631, population: 5078000 },
      { name: 'Brisbane', country: 'Australia', timezone: 'Australia/Brisbane', latitude: -27.4698, longitude: 153.0251, population: 2560000 },
      { name: 'Perth', country: 'Australia', timezone: 'Australia/Perth', latitude: -31.9505, longitude: 115.8605, population: 2080000 },
      { name: 'Adelaide', country: 'Australia', timezone: 'Australia/Adelaide', latitude: -34.9285, longitude: 138.6007, population: 1356000 }
      ],
      'CA': [
      { name: 'Toronto', country: 'Canada', timezone: 'America/Toronto', latitude: 43.6532, longitude: -79.3832, population: 2930000 },
      { name: 'Vancouver', country: 'Canada', timezone: 'America/Vancouver', latitude: 49.2827, longitude: -123.1207, population: 675218 },
      { name: 'Montreal', country: 'Canada', timezone: 'America/Toronto', latitude: 45.5017, longitude: -73.5673, population: 1780000 },
      { name: 'Calgary', country: 'Canada', timezone: 'America/Edmonton', latitude: 51.0447, longitude: -114.0719, population: 1300000 },
      { name: 'Ottawa', country: 'Canada', timezone: 'America/Toronto', latitude: 45.4215, longitude: -75.6972, population: 1017449 }
      ],
      'DE': [
      { name: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin', latitude: 52.5200, longitude: 13.4050, population: 3669000 },
      { name: 'Munich', country: 'Germany', timezone: 'Europe/Berlin', latitude: 48.1351, longitude: 11.5820, population: 1484000 },
      { name: 'Hamburg', country: 'Germany', timezone: 'Europe/Berlin', latitude: 53.5511, longitude: 9.9937, population: 1899000 },
      { name: 'Cologne', country: 'Germany', timezone: 'Europe/Berlin', latitude: 50.9375, longitude: 6.9603, population: 1086000 },
      { name: 'Frankfurt', country: 'Germany', timezone: 'Europe/Berlin', latitude: 50.1109, longitude: 8.6821, population: 753056 }
      ],
      'FR': [
      { name: 'Paris', country: 'France', timezone: 'Europe/Paris', latitude: 48.8566, longitude: 2.3522, population: 2161000 },
      { name: 'Marseille', country: 'France', timezone: 'Europe/Paris', latitude: 43.2965, longitude: 5.3698, population: 870000 },
      { name: 'Lyon', country: 'France', timezone: 'Europe/Paris', latitude: 45.7640, longitude: 4.8357, population: 515695 },
      { name: 'Toulouse', country: 'France', timezone: 'Europe/Paris', latitude: 43.6047, longitude: 1.4442, population: 479553 },
      { name: 'Nice', country: 'France', timezone: 'Europe/Paris', latitude: 43.7102, longitude: 7.2620, population: 340017 }
      ],
      'KR': [
      { name: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul', latitude: 37.5665, longitude: 126.9780, population: 9720846 },
      { name: 'Busan', country: 'South Korea', timezone: 'Asia/Seoul', latitude: 35.1796, longitude: 129.0756, population: 3448737 },
      { name: 'Incheon', country: 'South Korea', timezone: 'Asia/Seoul', latitude: 37.4563, longitude: 126.7052, population: 2954315 },
      { name: 'Daegu', country: 'South Korea', timezone: 'Asia/Seoul', latitude: 35.8714, longitude: 128.6014, population: 2410000 },
      { name: 'Daejeon', country: 'South Korea', timezone: 'Asia/Seoul', latitude: 36.3504, longitude: 127.3845, population: 1470000 }
    ]
  };

  return mockCities[countryCode] || [];
};

/**
 * Get timezone for a specific city
 */
export const getTimezoneForCity = (cityName: string, countryCode: string): string => {
  const cities = cache.cities.get(countryCode);
  if (cities) {
    const city = cities.find(c => c.name.toLowerCase() === cityName.toLowerCase());
    return city?.timezone || '';
  }
  return '';
};

/**
 * Get all available timezones
 */
export const fetchTimezones = async (): Promise<TimezoneInfo[]> => {
  const cacheKey = 'timezones';
  
  if (cache.timezones.has(cacheKey) && isCacheValid(cacheKey)) {
    return cache.timezones.get(cacheKey)!;
  }

  try {
    // Try to use Timezone API if key is configured
    if (TIMEZONE_API_KEY) {
      const url = `${TIMEZONE_API}?key=${TIMEZONE_API_KEY}&format=json`;
      
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          
          if (data.zones && data.zones.length > 0) {
            const timezones: TimezoneInfo[] = data.zones.map((zone: any) => ({
              timezone: zone.zoneName,
              utc_offset: zone.gmtOffset,
              country: zone.countryName,
              countryCode: zone.countryCode
            }));

            cache.timezones.set(cacheKey, timezones);
            cache.lastFetch.set(cacheKey, Date.now());
    return timezones;
          }
        } else {
          console.error('TimezoneDB API error:', response.status, response.statusText);
        }
      } catch (fetchError) {
        console.error('TimezoneDB API fetch error:', fetchError);
      }
      }
    
    // Fallback: Use timezone data from countries API
    const countries = await fetchCountries();
    const timezoneList: TimezoneInfo[] = [];
    
    countries.forEach(country => {
      country.timezones.forEach(timezone => {
        // Avoid duplicates
        if (!timezoneList.find(t => t.timezone === timezone)) {
          timezoneList.push({
            timezone,
            utc_offset: '', // Will be calculated if needed
            country: country.name,
            countryCode: country.code
          });
        }
      });
    });
    
    if (timezoneList.length > 0) {
      cache.timezones.set(cacheKey, timezoneList);
      cache.lastFetch.set(cacheKey, Date.now());
      return timezoneList;
    }
    
    // Fallback to static timezone list
    console.warn('Using static timezone data. Configure TIMEZONE_API_KEY for real-time data.');
    const staticTimezones = getStaticTimezones();
    cache.timezones.set(cacheKey, staticTimezones);
    cache.lastFetch.set(cacheKey, Date.now());
    return staticTimezones;
    
  } catch (error) {
    console.error('Error fetching timezones:', error);
    
    // Return cached data if available
    if (cache.timezones.has(cacheKey)) {
      console.warn('Using cached timezone data due to API error');
      return cache.timezones.get(cacheKey)!;
    }
    
    return getStaticTimezones();
  }
};

/**
 * Static timezone data for fallback
 */
const getStaticTimezones = (): TimezoneInfo[] => [
  { timezone: 'Asia/Ho_Chi_Minh', utc_offset: '+07:00', country: 'Vietnam', countryCode: 'VN' },
  { timezone: 'America/New_York', utc_offset: '-05:00', country: 'United States', countryCode: 'US' },
  { timezone: 'America/Los_Angeles', utc_offset: '-08:00', country: 'United States', countryCode: 'US' },
  { timezone: 'America/Chicago', utc_offset: '-06:00', country: 'United States', countryCode: 'US' },
  { timezone: 'Europe/London', utc_offset: '+00:00', country: 'United Kingdom', countryCode: 'GB' },
  { timezone: 'Asia/Tokyo', utc_offset: '+09:00', country: 'Japan', countryCode: 'JP' },
  { timezone: 'Asia/Singapore', utc_offset: '+08:00', country: 'Singapore', countryCode: 'SG' },
  { timezone: 'Australia/Sydney', utc_offset: '+10:00', country: 'Australia', countryCode: 'AU' },
  { timezone: 'Australia/Melbourne', utc_offset: '+10:00', country: 'Australia', countryCode: 'AU' },
  { timezone: 'America/Toronto', utc_offset: '-05:00', country: 'Canada', countryCode: 'CA' },
  { timezone: 'America/Vancouver', utc_offset: '-08:00', country: 'Canada', countryCode: 'CA' },
  { timezone: 'Europe/Berlin', utc_offset: '+01:00', country: 'Germany', countryCode: 'DE' },
  { timezone: 'Europe/Paris', utc_offset: '+01:00', country: 'France', countryCode: 'FR' },
  { timezone: 'Asia/Seoul', utc_offset: '+09:00', country: 'South Korea', countryCode: 'KR' }
];

/**
 * Search countries by name
 */
export const searchCountries = async (query: string): Promise<Country[]> => {
  if (!query.trim()) return [];
  
  try {
  const countries = await fetchCountries();
  return countries.filter(country => 
      country.name.toLowerCase().includes(query.toLowerCase()) ||
      country.code.toLowerCase().includes(query.toLowerCase()) ||
      (country.region && country.region.toLowerCase().includes(query.toLowerCase()))
  );
  } catch (error) {
    console.error('Error searching countries:', error);
    return [];
  }
};

/**
 * Search cities by name within a country
 */
export const searchCities = async (query: string, countryCode: string): Promise<City[]> => {
  if (!query.trim() || !countryCode) return [];
  
  try {
  const cities = await fetchCitiesByCountry(countryCode);
  return cities.filter(city => 
      city.name.toLowerCase().includes(query.toLowerCase()) ||
      (city.adminCode1 && city.adminCode1.toLowerCase().includes(query.toLowerCase()))
    );
  } catch (error) {
    console.error('Error searching cities:', error);
    return [];
  }
};

/**
 * Search all locations (countries, cities, timezones) with a single query
 */
export const searchAllLocations = async (query: string): Promise<LocationSearchResult> => {
  if (!query.trim()) {
    return { countries: [], cities: [], timezones: [] };
  }

  try {
    const [countries, timezones] = await Promise.all([
      searchCountries(query),
      searchTimezones(query)
    ]);

    // Get cities from all countries that match the search
    const cityPromises = countries.map(country => 
      searchCities(query, country.code)
    );
    const cityResults = await Promise.all(cityPromises);
    const cities = cityResults.flat();

    return { countries, cities, timezones };
  } catch (error) {
    console.error('Error searching all locations:', error);
    return { countries: [], cities: [], timezones: [] };
  }
};

/**
 * Search timezones by name or country
 */
export const searchTimezones = async (query: string): Promise<TimezoneInfo[]> => {
  if (!query.trim()) return [];
  
  try {
    const timezones = await fetchTimezones();
    return timezones.filter(timezone => 
      timezone.timezone.toLowerCase().includes(query.toLowerCase()) ||
      timezone.country.toLowerCase().includes(query.toLowerCase()) ||
      (timezone.countryCode && timezone.countryCode.toLowerCase().includes(query.toLowerCase()))
    );
  } catch (error) {
    console.error('Error searching timezones:', error);
    return [];
  }
};

/**
 * Get country by code
 */
export const getCountryByCode = async (code: string): Promise<Country | null> => {
  try {
    const countries = await fetchCountries();
    return countries.find(country => country.code.toLowerCase() === code.toLowerCase()) || null;
  } catch (error) {
    console.error('Error getting country by code:', error);
    return null;
  }
};

/**
 * Get city by name and country
 */
export const getCityByName = async (cityName: string, countryCode: string): Promise<City | null> => {
  try {
    const cities = await fetchCitiesByCountry(countryCode);
    return cities.find(city => city.name.toLowerCase() === cityName.toLowerCase()) || null;
  } catch (error) {
    console.error('Error getting city by name:', error);
    return null;
  }
};

/**
 * Clear cache for a specific key or all cache
 */
export const clearCache = (key?: string): void => {
  if (key) {
    cache.lastFetch.delete(key);
    if (key === 'countries') {
      cache.countries = null;
    } else if (key.startsWith('cities_')) {
      const countryCode = key.replace('cities_', '');
      cache.cities.delete(countryCode);
    } else if (key === 'timezones') {
      cache.timezones.delete(key);
    }
  } else {
    // Clear all cache
    cache.countries = null;
    cache.cities.clear();
    cache.timezones.clear();
    cache.lastFetch.clear();
  }
};

/**
 * Get cache status
 */
export const getCacheStatus = () => {
  return {
    countries: cache.countries ? cache.countries.length : 0,
    cities: cache.cities.size,
    timezones: cache.timezones.size,
    lastFetch: Object.fromEntries(cache.lastFetch)
  };
};

/**
 * Test API connections and return status
 */
export const testAPIConnections = async () => {
  const results = {
    countries: { status: 'unknown', error: null as string | null, count: 0 },
    cities: { status: 'unknown', error: null as string | null, count: 0 },
    timezones: { status: 'unknown', error: null as string | null, count: 0 }
  };

  // Test Countries API
  try {
    const countries = await fetchCountries();
    results.countries = { status: 'success', error: null, count: countries.length };
  } catch (error: any) {
    results.countries = { status: 'error', error: error.message, count: 0 };
  }

  // Test Cities API (using Vietnam as test)
  try {
    const cities = await fetchCitiesByCountry('VN');
    results.cities = { status: 'success', error: null, count: cities.length };
  } catch (error: any) {
    results.cities = { status: 'error', error: error.message, count: 0 };
  }

  // Test Timezones API
  try {
    const timezones = await fetchTimezones();
    results.timezones = { status: 'success', error: null, count: timezones.length };
  } catch (error: any) {
    results.timezones = { status: 'error', error: error.message, count: 0 };
  }

  return results;
};

