// src/services/branchService.ts
import apiClient from '../utils/axios';

export interface Country {
  countryId: string;
  name: string;
  isoCode: string;
  currency: string;
  timeZone: string;
}

export interface City {
  cityId: string;
  countryId: string;
  name: string;
  stateProvince?: string;
}

export const branchService = {
  // Get all countries with branches
  async getCountriesWithBranches(): Promise<Country[]> {
    try {
      const response = await apiClient.get('/api/branches/get-countries-with-branches');
      // API returns data directly or wrapped in data.data
      const data = response.data?.data || response.data;
      if (Array.isArray(data)) {
        return data;
      }
      // If wrapped in ApiResponse format
      if (data && Array.isArray(data.items)) {
        return data.items;
      }
      return [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      console.error('Error fetching countries with branches:', error);
      console.error('Response:', error.response?.data);
      throw new Error(`Failed to fetch countries: ${error.message}`);
    }
  },

  // Get cities with branches in a country
  async getCitiesWithBranches(countryId?: string): Promise<City[]> {
    try {
      const params = countryId ? { countryId } : {};
      const response = await apiClient.get('/api/branches/get-cities-with-branches', { params });
      // API returns data directly or wrapped in data.data
      const data = response.data?.data || response.data;
      if (Array.isArray(data)) {
        return data;
      }
      // If wrapped in ApiResponse format
      if (data && Array.isArray(data.items)) {
        return data.items;
      }
      return [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      console.error('Error fetching cities with branches:', error);
      console.error('Response:', error.response?.data);
      throw new Error(`Failed to fetch cities: ${error.message}`);
    }
  },

  // Get branch by ID
  async getBranchById(branchId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/branches/${branchId}`);
      const data = response.data?.data || response.data;
      return data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching branch:', error);
      throw new Error(`Failed to fetch branch: ${error.message}`);
    }
  },

  // Get all countries (not just those with branches)
  async getCountries(): Promise<Country[]> {
    try {
      const response = await apiClient.get('/api/Branches/get-countries');
      const data = response.data?.data || response.data;
      if (Array.isArray(data)) {
        return data;
      }
      // If wrapped in ApiResponse format
      if (data && Array.isArray(data.items)) {
        return data.items;
      }
      return [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      console.error('Error fetching countries:', error);
      console.error('Response:', error.response?.data);
      throw new Error(`Failed to fetch countries: ${error.message}`);
    }
  },

  // Get cities by country (or all cities if no countryId)
  async getCities(countryId?: string): Promise<City[]> {
    try {
      const params = countryId ? { countryId } : {};
      const response = await apiClient.get('/api/Branches/get-cities', { params });
      const data = response.data?.data || response.data;
      if (Array.isArray(data)) {
        return data;
      }
      // If wrapped in ApiResponse format
      if (data && Array.isArray(data.items)) {
        return data.items;
      }
      return [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      console.error('Error fetching cities:', error);
      console.error('Response:', error.response?.data);
      throw new Error(`Failed to fetch cities: ${error.message}`);
    }
  },

  // Validate if a city/country combination has branches
  async validateDestination(cityName: string, countryName: string): Promise<boolean> {
    try {
      const countries = await this.getCountriesWithBranches();
      const country = countries.find(c => 
        c.name.toLowerCase() === countryName.toLowerCase()
      );
      
      if (!country) {
        return false;
      }

      const cities = await this.getCitiesWithBranches(country.countryId);
      const city = cities.find(c => 
        c.name.toLowerCase() === cityName.toLowerCase()
      );

      return !!city;
    } catch (error) {
      console.error('Error validating destination:', error);
      return false;
    }
  },
};

