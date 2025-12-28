import { useState, useEffect } from 'react';
import { Search, MapPin, Building2, X, Loader2, Plus, Download, Map as MapIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import eventService from '../../services/eventService';
import { placeService } from '../../services/placeService';
import axiosInstance from '../../utils/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

interface AddPlaceOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess: () => void;
  eventLocation?: { lat: number; lng: number };
}

interface SystemPlace {
  placeId: string;
  name: string;
  addressLine1: string;
  categoryName?: string;
  averageRating?: number;
  totalReviews?: number;
  latitude: number;
  longitude: number;
}

interface TrackAsiaPlace {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type?: string;
  rating?: number;
  priceLevel?: number;
  phoneNumber?: string;
  website?: string;
  photos?: string[];
  openingHours?: string[];
}

export default function AddPlaceOptionModal({
  isOpen,
  onClose,
  eventId,
  onSuccess,
  eventLocation
}: AddPlaceOptionModalProps) {
  const [activeTab, setActiveTab] = useState<'system' | 'trackasia'>('system');
  const [searchQuery, setSearchQuery] = useState('');
  const [systemPlaces, setSystemPlaces] = useState<SystemPlace[]>([]);
  const [trackAsiaPlaces, setTrackAsiaPlaces] = useState<TrackAsiaPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingPlaceId, setAddingPlaceId] = useState<string | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [checkingPlaceId, setCheckingPlaceId] = useState<string | null>(null);
  const [existingPlaceIds, setExistingPlaceIds] = useState<Map<string, string>>(new Map()); // trackasia placeId -> system placeId
  const [searchRadius, setSearchRadius] = useState<number>(2); // Bán kính tìm kiếm (km)
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null);
  const [placeDetails, setPlaceDetails] = useState<Map<string, any>>(new Map()); // Cache place details
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);

  // Default location (Ho Chi Minh City)
  const defaultLocation = { lat: 10.7769, lng: 106.7009 };
  const searchLocation = selectedLocation || eventLocation || defaultLocation;

  // Search system places
  const searchSystemPlaces = async () => {
    setLoading(true);
    try {
      // Nếu không nhập từ khóa -> load toàn bộ địa điểm trong branch của user
      if (!searchQuery.trim()) {
        const response = await axiosInstance.get('/Place/get-all-place-by-branch', {
          params: {
            Page: 1,
            PageSize: 20,
          },
        });

        if (response.data && response.data.items) {
          const places = response.data.items.map((item: any) => {
            // Handle nested placeDetail structure or flat structure
            const placeData = item.placeDetail || item.PlaceDetail || item;
            
            return {
              // Backend uses PascalCase
              placeId: placeData.PlaceId || placeData.placeId,
              name: placeData.Name || placeData.name,
              addressLine1: placeData.AddressLine1 || placeData.addressLine1 || '',
              categoryName: placeData.CategoryName || placeData.categoryName,
              averageRating: placeData.AverageRating || placeData.averageRating,
              totalReviews: placeData.TotalReviews || placeData.totalReviews || 0,
              latitude: placeData.Latitude || placeData.latitude,
              longitude: placeData.Longitude || placeData.longitude,
            };
          });
          setSystemPlaces(places);
        } else {
          setSystemPlaces([]);
        }
        return;
      }

      // Có nhập từ khóa -> search theo tên/địa chỉ, ưu tiên gần user/event
      const response = await axiosInstance.post('/Place/search', {
        name: searchQuery,
        userLat: searchLocation.lat,
        userLng: searchLocation.lng,
        Page: 1,
        PageSize: 20,
      });

      if (response.data && response.data.items) {
        const places = response.data.items.map((item: any) => {
          // Handle nested placeDetail structure or flat structure
          const placeData = item.placeDetail || item.PlaceDetail || item;
          
          return {
            // Backend uses PascalCase
            placeId: placeData.PlaceId || placeData.placeId,
            name: placeData.Name || placeData.name,
            addressLine1: placeData.AddressLine1 || placeData.addressLine1 || '',
            categoryName: placeData.CategoryName || placeData.categoryName,
            averageRating: placeData.AverageRating || placeData.averageRating,
            totalReviews: placeData.TotalReviews || placeData.totalReviews || 0,
            latitude: placeData.Latitude || placeData.latitude,
            longitude: placeData.Longitude || placeData.longitude,
          };
        });
        setSystemPlaces(places);
      } else {
        setSystemPlaces([]);
      }
    } catch (error: any) {
      console.error('Error searching system places:', error);

      // Nếu không tìm thấy địa điểm (404) thì chỉ hiển thị empty state, không toast lỗi
      if (error.response?.status === 404) {
        setSystemPlaces([]);
      } else {
        toast.error('Không thể tìm kiếm địa điểm: ' + (error.response?.data?.message || error.message));
        setSystemPlaces([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  // Fetch and toggle place details
  const handleTogglePlaceDetails = async (placeId: string) => {
    if (expandedPlaceId === placeId) {
      // Collapse if already expanded
      setExpandedPlaceId(null);
      return;
    }

    // Expand
    setExpandedPlaceId(placeId);

    // If details already cached, don't fetch again
    if (placeDetails.has(placeId)) {
      return;
    }

    // Fetch details
    setLoadingDetails(placeId);
    try {
      const details = await eventService.getTrackAsiaPlaceDetails(placeId);
      setPlaceDetails(prev => new Map(prev).set(placeId, details));
    } catch (error: any) {
      console.error('Failed to fetch place details:', error);
      toast.error('Không thể tải thông tin chi tiết');
    } finally {
      setLoadingDetails(null);
    }
  };

  // Search TrackAsia places
  const searchTrackAsiaPlaces = async () => {
    setLoading(true);
    try {
      // Gọi API để lấy địa điểm gần sự kiện (radius in meters)
      const radiusInMeters = searchRadius * 1000;
      
      console.log('[Frontend] Calling TrackAsia API with:');
      console.log('  - Location:', searchLocation.lat, searchLocation.lng);
      console.log('  - Radius:', searchRadius, 'km =', radiusInMeters, 'meters');
      console.log('  - Type: restaurant');
      
      const places = await eventService.searchTrackAsiaPlaces(
        searchLocation.lat,
        searchLocation.lng,
        radiusInMeters,
        'restaurant' // Default type
      );

      console.log('[Frontend] TrackAsia raw results:', places);
      console.log('[Frontend] Number of results:', places?.length || 0);
      console.log('[Frontend] Search radius:', searchRadius, 'km');

      // Filter places by distance within search radius
      const nearbyPlaces = places.filter((place: any) => {
        const distance = calculateDistance(
          searchLocation.lat,
          searchLocation.lng,
          place.latitude,
          place.longitude
        );
        return distance <= searchRadius;
      });
      console.log('Filtered nearby places (within', searchRadius, 'km):', nearbyPlaces.length);

      // Hiển thị tối đa 20 địa điểm để tránh quá tải
      const limitedPlaces = nearbyPlaces.slice(0, 20);
      
      console.log('Sample place data:', limitedPlaces[0]);
      
      // Map to UI format - Backend returns PascalCase (PlaceId, Name, etc.)
      const mappedPlaces = limitedPlaces.map((place: any) => {
        const placeId = place.PlaceId || place.placeId || place.place_id;
        
        if (!placeId) {
          console.error('Place missing PlaceId:', place);
        }
        
        return {
          placeId: placeId,
          name: place.Name || place.name,
          address: place.Address || place.address,
          latitude: place.Latitude || place.latitude,
          longitude: place.Longitude || place.longitude,
          type: place.Type || place.type,
          rating: place.Rating || place.rating,
          priceLevel: place.PriceLevel || place.priceLevel,
          phoneNumber: undefined,
          website: undefined,
          photos: [],
          openingHours: []
        };
      }).filter(p => p.placeId); // Remove places without valid placeId

      // Filter by search query nếu có nhập từ khóa
      const finalPlaces = searchQuery.trim() 
        ? mappedPlaces.filter((place: TrackAsiaPlace) =>
            place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            place.address.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : mappedPlaces;

      setTrackAsiaPlaces(finalPlaces);

      // Check which places already exist in system (async, don't block UI)
      finalPlaces.forEach(async (place) => {
        await checkPlaceExists(place.placeId);
      });
    } catch (error: any) {
      console.error('Error searching TrackAsia places:', error);
      toast.error('Không thể tìm kiếm địa điểm TrackAsia: ' + (error.response?.data?.message || error.message));
      setTrackAsiaPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  // Validate and fix coordinates on mount
  useEffect(() => {
    // Check if coordinates are valid
    const currentLat = selectedLocation?.lat || eventLocation?.lat || defaultLocation.lat;
    const currentLng = selectedLocation?.lng || eventLocation?.lng || defaultLocation.lng;
    
    let needsFix = false;
    let fixedLat = currentLat;
    let fixedLng = currentLng;
    
    // Fix negative longitude (common mistake)
    if (currentLng < 0 && Math.abs(currentLng) > 100 && Math.abs(currentLng) < 110) {
      fixedLng = Math.abs(currentLng);
      needsFix = true;
      toast.warning(`Đã tự động sửa kinh độ từ ${currentLng} thành ${fixedLng}`);
    }
    
    // Validate Vietnam coordinates
    if (fixedLat < 8 || fixedLat > 24) {
      fixedLat = defaultLocation.lat;
      needsFix = true;
      toast.warning('Vĩ độ không hợp lệ! Đã reset về mặc định (TP.HCM)');
    }
    
    if (fixedLng < 102 || fixedLng > 110) {
      fixedLng = defaultLocation.lng;
      needsFix = true;
      toast.warning('Kinh độ không hợp lệ! Đã reset về mặc định (TP.HCM)');
    }
    
    if (needsFix) {
      setSelectedLocation({ lat: fixedLat, lng: fixedLng });
    }
  }, [isOpen]);

  // Handle search with auto-load and debounce
  useEffect(() => {
    if (!isOpen) return;
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      if (activeTab === 'system') {
        searchSystemPlaces();
      } else {
        searchTrackAsiaPlaces();
      }
    }, searchQuery ? 500 : 0); // No delay for initial load

    return () => clearTimeout(timeoutId);
  }, [isOpen, searchQuery, activeTab]);

  // Add place option
  const handleAddPlace = async (placeId: string) => {
    setAddingPlaceId(placeId);
    try {
      await eventService.addPlaceOption(eventId, placeId);
      toast.success('Đã thêm địa điểm vào event!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding place option:', error);
      toast.error('Không thể thêm địa điểm: ' + (error.response?.data?.message || error.message));
    } finally {
      setAddingPlaceId(null);
    }
  };

  // Check if TrackAsia place already exists in system
  const checkPlaceExists = async (trackAsiaPlaceId: string): Promise<string | null> => {
    setCheckingPlaceId(trackAsiaPlaceId);
    try {
      // Check in system by GooglePlaceId using new API
      const result = await placeService.checkPlaceByGooglePlaceId(trackAsiaPlaceId);
      
      if (result.exists && result.place) {
        const placeId = result.place.placeId;
        setExistingPlaceIds(prev => new Map(prev).set(trackAsiaPlaceId, placeId));
        return placeId;
      }
      
      return null;
    } catch (error: any) {
      // If error, assume place doesn't exist
      console.log('Could not check place existence (will create new):', error);
      return null;
    } finally {
      setCheckingPlaceId(null);
    }
  };

  // Handle TrackAsia place - add to system first, then add to event
  const handleAddTrackAsiaToSystem = async (trackAsiaPlace: TrackAsiaPlace) => {
    console.log('Adding TrackAsia place:', trackAsiaPlace);
    
    if (!trackAsiaPlace.placeId) {
      toast.error('Lỗi: Địa điểm không có ID hợp lệ');
      console.error('Invalid place data:', trackAsiaPlace);
      return;
    }
    
    setAddingPlaceId(trackAsiaPlace.placeId);
    try {
      // First check if place already exists (optional, không bắt buộc)
      let existingPlaceId: string | null = null;
      try {
        existingPlaceId = await checkPlaceExists(trackAsiaPlace.placeId);
      } catch (err) {
        console.log('Skip checking, will create new place');
      }
      
      let systemPlaceId: string;
      
      if (existingPlaceId) {
        toast.info('Địa điểm đã tồn tại trong hệ thống!');
        systemPlaceId = existingPlaceId;
      } else {
        toast.info('Đang thêm địa điểm vào hệ thống...');
        
        // Create place directly with basic info (không cần fetch details nếu API lỗi)
        try {
          // Try to get full details from TrackAsia
          const details = await eventService.getTrackAsiaPlaceDetails(trackAsiaPlace.placeId);
          const createdPlace = await placeService.createPlaceFromTrackAsia({ result: details });
          systemPlaceId = createdPlace.placeId;
        } catch (detailsError: any) {
          console.error('Could not fetch TrackAsia details, using basic info:', detailsError);
          
          // Fallback: Create with basic info from search results
          const basicPlaceData = {
            Name: trackAsiaPlace.name,
            Description: trackAsiaPlace.address || 'Địa điểm từ TrackAsia',
            CategoryId: 1, // Default category
            GooglePlaceId: trackAsiaPlace.placeId,
            Latitude: trackAsiaPlace.latitude,
            Longitude: trackAsiaPlace.longitude,
            AddressLine1: trackAsiaPlace.address || trackAsiaPlace.name,
            City: 'Ho Chi Minh City',
            StateProvince: 'Ho Chi Minh',
            ImageUrlsList: []
          };
          
          const response = await axiosInstance.post('/Place/create-new', basicPlaceData);
          systemPlaceId = response.data.placeId;
        }
        
        toast.success('Đã thêm địa điểm vào hệ thống!');
      }
      
      // Now add to event
      await eventService.addPlaceOption(eventId, systemPlaceId);
      
      toast.success('Đã thêm địa điểm vào event!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding TrackAsia place:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      toast.error('Không thể thêm địa điểm: ' + errorMsg);
    } finally {
      setAddingPlaceId(null);
    }
  };

  // Add existing place to event directly
  const handleAddExistingToEvent = async (systemPlaceId: string) => {
    setAddingPlaceId(systemPlaceId);
    try {
      await eventService.addPlaceOption(eventId, systemPlaceId);
      toast.success('Đã thêm địa điểm vào event!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding place to event:', error);
      toast.error('Failed to add place: ' + (error.message || 'Unknown error'));
    } finally {
      setAddingPlaceId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Add Place to Event</CardTitle>
              <CardDescription>
                Search and add places from system or TrackAsia
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search for places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Location Picker & Radius Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMapPicker(!showMapPicker)}
                className="flex-shrink-0"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {selectedLocation ? 'Change Location' : 'Select Location on Map'}
              </Button>
              
              {/* Radius Selector */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <label className="text-xs text-gray-600 whitespace-nowrap">Radius:</label>
                <select
                  value={searchRadius}
                  onChange={(e) => {
                    setSearchRadius(Number(e.target.value));
                    // Auto trigger search when radius changes
                    setTimeout(() => {
                      if (activeTab === 'trackasia') {
                        searchTrackAsiaPlaces();
                      }
                    }, 100);
                  }}
                  className="text-xs border rounded px-2 py-1 bg-white"
                >
                  <option value={0.5}>0.5 km</option>
                  <option value={1}>1 km</option>
                  <option value={2}>2 km</option>
                  <option value={3}>3 km</option>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                </select>
              </div>
              
              {selectedLocation && (
                <div className="text-xs text-gray-600 flex-1 truncate">
                  📍 {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedLocation(null);
                      setShowMapPicker(false);
                    }}
                    className="ml-2 h-5 w-5 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'system' | 'trackasia')} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="system">
                <Building2 className="h-4 w-4 mr-2" />
                System
              </TabsTrigger>
              <TabsTrigger value="trackasia">
                <MapPin className="h-4 w-4 mr-2" />
                TrackAsia
              </TabsTrigger>
            </TabsList>

            {/* System Places Tab */}
            <TabsContent value="system" className="flex-1 overflow-y-auto mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Searching...</span>
                </div>
              ) : systemPlaces.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No places found' : 'Loading places list...'}
                </div>
              ) : (
                <div className="space-y-2">
                  {systemPlaces.map((place) => {
                    // Calculate distance if we have location data
                    const distance = (place.latitude && place.longitude && searchLocation) 
                      ? calculateDistance(
                          searchLocation.lat,
                          searchLocation.lng,
                          place.latitude,
                          place.longitude
                        )
                      : null;

                    return (
                      <Card key={place.placeId} className="hover:bg-gray-50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <h3 className="font-semibold text-gray-900">{place.name}</h3>
                                {distance !== null && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    📍 {distance.toFixed(1)}km
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{place.addressLine1}</p>
                              <div className="flex items-center gap-2 mt-2">
                                {place.categoryName && (
                                  <Badge variant="outline">{place.categoryName}</Badge>
                                )}
                                {place.averageRating && (
                                  <Badge variant="outline">
                                    ⭐ {place.averageRating.toFixed(1)} ({place.totalReviews} reviews)
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAddPlace(place.placeId)}
                              disabled={addingPlaceId === place.placeId}
                              className="ml-4"
                            >
                              {addingPlaceId === place.placeId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* TrackAsia Places Tab */}
            <TabsContent value="trackasia" className="flex-1 overflow-y-auto mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Searching for nearby places...</span>
                </div>
              ) : trackAsiaPlaces.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No places found within {searchRadius}km radius</p>
                  <p className="text-xs text-gray-400 mt-1">Try increasing the search radius or selecting a different location</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-gray-500 mb-2 flex items-center justify-between">
                    <span>Found {trackAsiaPlaces.length} places within {searchRadius}km radius</span>
                    <Badge variant="secondary" className="text-xs">
                      🎯 Radius: {searchRadius}km
                    </Badge>
                  </div>
                  {trackAsiaPlaces.map((place) => {
                    const distance = calculateDistance(
                      searchLocation.lat,
                      searchLocation.lng,
                      place.latitude,
                      place.longitude
                    );
                    const existingId = existingPlaceIds.get(place.placeId);
                    const isExpanded = expandedPlaceId === place.placeId;
                    const details = placeDetails.get(place.placeId);
                    const isLoadingDetails = loadingDetails === place.placeId;
                    
                    return (
                      <Card key={place.placeId} className="hover:bg-gray-50 transition-colors border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <h3 className="font-semibold text-gray-900">{place.name}</h3>
                                <Badge variant="outline" className="ml-2 text-xs">
                                  📍 {distance.toFixed(1)}km
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{place.address}</p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {place.type && (
                                  <Badge key="type" variant="outline" className="text-xs">{place.type}</Badge>
                                )}
                                {place.rating && (
                                  <Badge key="rating" variant="outline" className="text-xs">
                                    ⭐ {place.rating.toFixed(1)}
                                  </Badge>
                                )}
                                {place.priceLevel && (
                                  <Badge key="price" variant="outline" className="text-xs">
                                    {'$'.repeat(place.priceLevel)}
                                  </Badge>
                                )}
                                <Button 
                                  key="details-btn"
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleTogglePlaceDetails(place.placeId)}
                                  className="text-xs h-6 px-2"
                                >
                                  {isExpanded ? '▼ Thu gọn' : '▶ Xem chi tiết'}
                                </Button>
                              </div>

                              {/* Expanded Details */}
                              {isExpanded && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  {isLoadingDetails ? (
                                    <div className="flex items-center justify-center py-4">
                                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                      <span className="ml-2 text-sm text-gray-500">Đang tải thông tin...</span>
                                    </div>
                                  ) : details ? (
                                    <div className="space-y-3">
                                      {/* Photos */}
                                      {details.photos && details.photos.length > 0 && (
                                        <div>
                                          <h4 className="text-sm font-semibold mb-2">📸 Hình ảnh:</h4>
                                          <div className="grid grid-cols-3 gap-2">
                                            {details.photos.slice(0, 6).map((photo: any, idx: number) => (
                                              <img 
                                                key={idx}
                                                src={photo.url || `https://maps.track-asia.com/api/v2/place/photo?photo_reference=${photo.photo_reference}&key=public_key&maxwidth=400`}
                                                alt={`${place.name} ${idx + 1}`}
                                                className="w-full h-20 object-cover rounded"
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Contact Info */}
                                      <div className="grid grid-cols-1 gap-2 text-sm">
                                        {details.formatted_phone_number && (
                                          <div className="flex items-center">
                                            <span className="font-semibold mr-2">📞 Điện thoại:</span>
                                            <a href={`tel:${details.formatted_phone_number}`} className="text-blue-600 hover:underline">
                                              {details.formatted_phone_number}
                                            </a>
                                          </div>
                                        )}
                                        {details.website && (
                                          <div className="flex items-center">
                                            <span className="font-semibold mr-2">🌐 Website:</span>
                                            <a href={details.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                                              {details.website}
                                            </a>
                                          </div>
                                        )}
                                        {details.user_ratings_total && (
                                          <div className="flex items-center">
                                            <span className="font-semibold mr-2">👥 Lượt đánh giá:</span>
                                            <span>{details.user_ratings_total}</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Opening Hours */}
                                      {details.opening_hours?.weekday_text && details.opening_hours.weekday_text.length > 0 && (
                                        <div>
                                          <h4 className="text-sm font-semibold mb-2">🕒 Giờ mở cửa:</h4>
                                          <div className="text-sm space-y-1">
                                            {details.opening_hours.weekday_text.map((hours: string, idx: number) => (
                                              <div key={idx} className="text-gray-700">{hours}</div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Editorial Summary */}
                                      {details.editorial_summary?.overview && (
                                        <div>
                                          <h4 className="text-sm font-semibold mb-2">ℹ️ Mô tả:</h4>
                                          <p className="text-sm text-gray-700">{details.editorial_summary.overview}</p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500 py-2">Không có thông tin chi tiết</div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              {existingId ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleAddExistingToEvent(existingId)}
                                  disabled={addingPlaceId === existingId}
                                  className="whitespace-nowrap"
                                >
                                  {addingPlaceId === existingId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4 mr-1" />
                                      Thêm vào Event
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleAddTrackAsiaToSystem(place)}
                                  disabled={addingPlaceId === place.placeId || checkingPlaceId === place.placeId}
                                  className="whitespace-nowrap"
                                >
                                  {(addingPlaceId === place.placeId || checkingPlaceId === place.placeId) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Download className="h-4 w-4 mr-1" />
                                      Thêm vào Hệ thống & Event
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Map Picker Dialog */}
      <Dialog open={showMapPicker} onOpenChange={setShowMapPicker}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-primary" />
              Select Location on Map
            </DialogTitle>
            <DialogDescription>
              Choose a location on the map or select from quick locations
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Quick Location Buttons */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-2">Popular Locations:</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLocation({ lat: 10.7769, lng: 106.7009 })}
                >
                  District 1, HCM
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLocation({ lat: 10.8231, lng: 106.6297 })}
                >
                  Thu Duc, HCM
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLocation({ lat: 21.0285, lng: 105.8542 })}
                >
                  Hanoi
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLocation({ lat: 16.0544, lng: 108.2022 })}
                >
                  Da Nang
                </Button>
              </div>
            </div>

            {/* Map Display */}
            <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: '400px' }}>
              <iframe
                src={`https://maps.track-asia.com/embed.html?center=${selectedLocation?.lat || searchLocation.lat},${selectedLocation?.lng || searchLocation.lng}&zoom=14&markers=${selectedLocation?.lat || searchLocation.lat},${selectedLocation?.lng || searchLocation.lng}`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                title="Map Picker"
                key={`${selectedLocation?.lat}-${selectedLocation?.lng}`}
              />
              <div className="absolute top-2 left-2 bg-white px-3 py-2 rounded shadow-lg text-xs">
                📍 {(selectedLocation?.lat || searchLocation.lat).toFixed(4)}, {(selectedLocation?.lng || searchLocation.lng).toFixed(4)}
              </div>
            </div>

            {/* Coordinate Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Latitude (Vĩ độ)</label>
                <Input
                  type="number"
                  placeholder="Ví dụ: 10.7769"
                  value={selectedLocation?.lat || searchLocation.lat}
                  onChange={(e) => {
                    const newLat = parseFloat(e.target.value) || searchLocation.lat;
                    // Validation: Vietnam latitude should be between 8-24 (North)
                    if (newLat < 8 || newLat > 24) {
                      toast.error('Vĩ độ không hợp lệ! Việt Nam có vĩ độ từ 8° đến 24° (phía Bắc)');
                      return;
                    }
                    setSelectedLocation({ 
                      lat: newLat, 
                      lng: selectedLocation?.lng || searchLocation.lng 
                    });
                  }}
                  step="0.0001"
                  min="8"
                  max="24"
                />
                <p className="text-xs text-gray-500 mt-1">Vĩ độ Việt Nam: 8° - 24° (phía Bắc)</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Longitude (Kinh độ)</label>
                <Input
                  type="number"
                  placeholder="Ví dụ: 106.7009"
                  value={selectedLocation?.lng || searchLocation.lng}
                  onChange={(e) => {
                    const newLng = parseFloat(e.target.value) || searchLocation.lng;
                    // Validation: Vietnam longitude should be between 102-110 (East)
                    if (newLng < 102 || newLng > 110) {
                      toast.error('Kinh độ không hợp lệ! Việt Nam có kinh độ từ 102° đến 110° (dương)');
                      return;
                    }
                    setSelectedLocation({ 
                      lat: selectedLocation?.lat || searchLocation.lat, 
                      lng: newLng 
                    });
                  }}
                  step="0.0001"
                  min="102"
                  max="110"
                />
                <p className="text-xs text-gray-500 mt-1">Vietnam Longitude: 102° - 110° (East)</p>
              </div>
            </div>

            {/* Info and Action Buttons */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-900 mb-3">
                💡 <strong>Note:</strong> The system will search for places within <strong>{searchRadius}km</strong> radius from the location you selected. You can change the radius after selecting the location.
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedLocation(null);
                    setShowMapPicker(false);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowMapPicker(false);
                    toast.success(`Searching within ${searchRadius}km radius...`);
                    // Trigger search with new location
                    setTimeout(() => {
                      if (activeTab === 'system') {
                        searchSystemPlaces();
                      } else {
                        searchTrackAsiaPlaces();
                      }
                    }, 100);
                  }}
                  className="flex-1"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search at This Location
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

