import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, X, Filter, Star, ArrowUpRight } from 'lucide-react';
import { ViewPlacesOnMap, ViewCategory, ViewDetailPlace } from '@/services/userService';
import { colors } from '@/lib/colors';
import { TrackMap } from '@/pages/User/Place/TrackMap';
import PlaceDetailModal from '@/pages/User/ViewProfile/ViewPlace/PlaceDetailModal';

interface Place {
  placeId: string;
  name: string;
  categoryName: string;
  latitude: number;
  longitude: number;
}

interface Category {
  categoryId: number;
  name: string;
}

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose }) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapBounds, setMapBounds] = useState({
    minLatitude: 10.0,
    maxLatitude: 11.0,
    minLongitude: 106.0,
    maxLongitude: 107.0
  });
  const [filters, setFilters] = useState({
    priceLevel: null as number | null,
    minAverageRating: 0,
    openNow: true,
    categoryId: null as number | null
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [placeDetail, setPlaceDetail] = useState<any>(null);
  const [isLoadingPlaceDetail, setIsLoadingPlaceDetail] = useState(false);

  // Get category icon based on category name
  const getCategoryIcon = useCallback((categoryName: string): string => {
    const iconMap: Record<string, string> = {
      'restaurant': '🍽️',
      'cafe': '☕',
      'bar': '🍺',
      'fast food': '🍔',
      'food court': '🍜',
      'street food': '🌮',
      'bakery': '🥖',
      'dessert': '🍰',
      'hotel': '🏨',
      'shopping mall': '🛍️',
      'entertainment': '🎭',
      'health': '🏥',
      'education': '🎓',
      'transport': '🚌',
      'park': '🌳',
      'museum': '🏛️',
      'beach': '🏖️',
      'temple': '🛕',
      'market': '🏪',
      'tourist spot': '🗺️',
    };
    
    // Try exact match first
    const lowerCategory = categoryName.toLowerCase();
    if (iconMap[lowerCategory]) {
      return iconMap[lowerCategory];
    }
    
    // Try partial match
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerCategory.includes(key) || key.includes(lowerCategory)) {
        return icon;
      }
    }
    
    return '📍'; // Default icon
  }, []);

  // Fetch places based on current bounds and filters
  const fetchPlaces = useCallback(async (customBounds?: typeof mapBounds, customFilters?: typeof filters) => {
    setLoading(true);
    try {
      const bounds = customBounds || mapBounds;
      const currentFilters = customFilters || filters;
      const requestData = {
        priceLevel: currentFilters.priceLevel,
        minAverageRating: currentFilters.minAverageRating,
        openNow: !currentFilters.openNow,
        categoryId: currentFilters.categoryId,
        ...bounds
      };
      const response = await ViewPlacesOnMap(requestData);
      setPlaces(response);
    } catch (error) {
      console.error('Error fetching places:', error);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [filters, mapBounds]);

  // Initial fetch when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPlaces();
    }
  }, [isOpen, fetchPlaces]);

  // Load categories when modal opens
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const data = await ViewCategory();
        if (!cancelled) setCategories(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setCategories([]);
      }
    };
    if (isOpen) run();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Refetch places when filters change
  useEffect(() => {
    if (isOpen) {
      fetchPlaces();
    }
  }, [filters, isOpen, fetchPlaces]);

  // Refetch places when map bounds change (from TrackMap)
  useEffect(() => {
    if (isOpen) {
      fetchPlaces();
    }
  }, [mapBounds, isOpen, fetchPlaces]);

  // Handle bounds change with current filters
  const handleBoundsChanged = useCallback((minLat: number, maxLat: number, minLng: number, maxLng: number) => {
    const newBounds = {
      minLatitude: minLat,
      maxLatitude: maxLat,
      minLongitude: minLng,
      maxLongitude: maxLng,
    };
    setMapBounds(newBounds);
  }, []);

  // Handle place click to show detail
  const handlePlaceClick = async (placeId: string) => {
    setSelectedPlaceId(placeId);
    setIsLoadingPlaceDetail(true);
    try {
      const detail = await ViewDetailPlace({ placeId });
      setPlaceDetail(detail);
    } catch (error) {
      console.error('Error fetching place detail:', error);
      setPlaceDetail(null);
    } finally {
      setIsLoadingPlaceDetail(false);
    }
  };

  const handleGetDirections = (place: Place) => {
    if (typeof place.latitude !== 'number' || typeof place.longitude !== 'number') return;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  // Close place detail modal
  const handleClosePlaceDetail = () => {
    setSelectedPlaceId(null);
    setPlaceDetail(null);
  };

  // Handle image uploaded or place updated - refresh place detail
  const handleImageUploaded = async (newImageUrls: string[]) => {
    // If empty array is passed, it means we need to refetch the place data
    if (newImageUrls.length === 0 && selectedPlaceId) {
      try {
        setIsLoadingPlaceDetail(true);
        const updatedPlaceDetail = await ViewDetailPlace({ placeId: selectedPlaceId });
        setPlaceDetail(updatedPlaceDetail);
      } catch (error) {
        console.error('Error refetching place details after update:', error);
        // Keep the existing data if refetch fails
      } finally {
        setIsLoadingPlaceDetail(false);
      }
    } else if (newImageUrls.length > 0 && placeDetail) {
      // Legacy support: Update the place detail with new image URLs
      const newImageData = newImageUrls.map((url, index) => ({
        imageId: `temp-${Date.now()}-${index}`,
        imageUrl: url,
        altText: `Uploaded image ${index + 1}`
      }));
      
      setPlaceDetail({
        ...placeDetail,
        imageUrls: [...(placeDetail.imageUrls || []), ...newImageData]
      });
    }
  };

  // TrackMap returns picked point; we also listen to map move via a wrapper
  const onMapMoved = (minLat: number, maxLat: number, minLng: number, maxLng: number) => {
    setMapBounds({
      minLatitude: minLat,
      maxLatitude: maxLat,
      minLongitude: minLng,
      maxLongitude: maxLng
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col">
        <DialogHeader className="p-6 pb-0 border-b border-slate-100 bg-white/80 backdrop-blur">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2 text-slate-900">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md">
                <MapPin className="w-5 h-5" />
              </div>
              Places on Map
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 flex-col md:flex-row gap-6">
          {/* Stats + Map Column */}
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-3 shadow-sm">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Places Found</p>
                <p className="text-2xl font-bold text-slate-900">{places.length}</p>
                <p className="text-xs text-slate-500">Within current map bounds</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 p-3 shadow-sm">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Category</p>
                <p className="text-base font-semibold text-slate-900 truncate">
                  {categories.find((c) => c.categoryId === filters.categoryId)?.name || 'All'}
                </p>
                <p className="text-xs text-slate-500">Filtering by category</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-3 shadow-sm">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Preferences</p>
                <p className="text-sm font-semibold text-slate-900">
                  Price {filters.priceLevel !== null ? `≤ ${filters.priceLevel}` : 'Any'} • Rating ≥ {filters.minAverageRating}
                </p>
                <p className="text-xs text-slate-500">{filters.openNow ? 'Showing places open now' : 'All opening times'}</p>
              </div>
            </div>

            <div className="flex-1 relative bg-slate-900/5 rounded-2xl overflow-hidden min-h-[360px]">
              <div className="absolute inset-0" style={{ zIndex: 1 }}>
                <TrackMap
                  visible={isOpen}
                  onPick={(lat, lng) => {
                    const span = 0.02;
                    onMapMoved(lat - span, lat + span, lng - span, lng + span);
                    fetchPlaces();
                  }}
                  onBoundsChanged={handleBoundsChanged}
                  places={places.filter(p => 
                    typeof p.latitude === 'number' && 
                    typeof p.longitude === 'number' &&
                    !isNaN(p.latitude) && 
                    !isNaN(p.longitude) &&
                    p.latitude !== 0 &&
                    p.longitude !== 0
                  ).map(p => ({
                    placeId: p.placeId,
                    latitude: p.latitude,
                    longitude: p.longitude,
                    categoryName: p.categoryName
                  }))}
                  onPlaceClick={handlePlaceClick}
                  getCategoryIcon={getCategoryIcon}
                />
              </div>
              <style>{`
                .trackasiagl-marker {
                  z-index: 1000 !important;
                }
                .trackasiagl-marker > div {
                  z-index: 1000 !important;
                }
              `}</style>
              {/* Map Info */}
              <div className="absolute bottom-4 left-4 rounded-2xl border border-white/60 bg-white/80 backdrop-blur p-4 shadow-xl w-64 space-y-1 text-sm text-slate-700" style={{ zIndex: 20 }}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Current window</p>
                <div className="flex justify-between">
                  <span>Lat:</span>
                  <span>{mapBounds.minLatitude.toFixed(2)} – {mapBounds.maxLatitude.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lng:</span>
                  <span>{mapBounds.minLongitude.toFixed(2)} – {mapBounds.maxLongitude.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-900">
                  <span>Markers</span>
                  <span>{places.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Explorer Panel */}
          <div className="w-full md:w-96 flex-shrink-0 border border-slate-100 bg-gradient-to-b from-white/95 via-slate-50 to-slate-100 rounded-3xl shadow-lg flex flex-col min-h-0">
            <div className="p-5 border-b border-slate-100 bg-white/90 backdrop-blur sticky top-0 z-10 rounded-t-3xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase text-slate-500 font-semibold tracking-wide">Explorer panel</p>
                  <h3 className="text-lg font-bold text-slate-900">Places Found</h3>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchPlaces()}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 flex items-center gap-1 transition-all duration-200 border-none shadow-sm"
                >
                  <Filter className="w-3 h-3" />
                  Refresh
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-[11px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  Category · {categories.find((c) => c.categoryId === filters.categoryId)?.name || 'All'}
                </span>
                <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  Price {filters.priceLevel !== null ? `≤ ${filters.priceLevel}` : 'Any'}
                </span>
                <span className="text-[11px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                  Rating ≥ {filters.minAverageRating}
                </span>
                {filters.openNow && (
                  <span className="text-[11px] px-2 py-1 rounded-full bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100">
                    Open now
                  </span>
                )}
              </div>
              
              {/* Filters */}
              <div className="mt-4 space-y-3 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Category</label>
                  <select
                    value={filters.categoryId ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilters({ ...filters, categoryId: value === '' ? null : Number(value) });
                    }}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  >
                    <option value="">All</option>
                    {categories.map((c) => (
                      <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Price level</label>
                    <select
                      value={filters.priceLevel ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilters({ ...filters, priceLevel: value === '' ? null : Number(value) });
                      }}
                      className="text-sm border border-slate-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    >
                      <option value="">Any</option>
                      <option value={1}>Cheap</option>
                      <option value={2}>Fair</option>
                      <option value={3}>Moderate</option>
                      <option value={4}>Expensive</option>
                      <option value={5}>Luxury</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Min rating</label>
                    <select
                      value={filters.minAverageRating}
                      onChange={(e) => setFilters({...filters, minAverageRating: Number(e.target.value)})}
                      className="text-sm border border-slate-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    >
                      <option value={0}>Any</option>
                      <option value={3}>3+</option>
                      <option value={4}>4+</option>
                      <option value={4.5}>4.5+</option>
                    </select>
                  </div>
                </div>
                
                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    id="openNow"
                    checked={filters.openNow}
                    onChange={(e) => setFilters({...filters, openNow: e.target.checked})}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Show places open now
                </label>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3 scrollbar-hide">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="spinner-gradient h-8 w-8"></div>
                </div>
              ) : places.length === 0 ? (
                <div className="text-center text-slate-500 py-8 rounded-2xl border border-dashed border-slate-200 bg-white/70">
                  <MapPin className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium">No places found in this area</p>
                  <p className="text-xs">Adjust the map or filters to explore more</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {places.map((place, index) => (
                    <Card
                      key={place.placeId}
                      className="relative overflow-hidden border border-slate-200 bg-white/95 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                      onClick={() => handlePlaceClick(place.placeId)}
                    >
                      <CardContent className="p-4">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                        <div className="flex items-start justify-between gap-2 pt-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-slate-900 truncate" title={place.name}>
                              {place.name}
                            </h4>
                            <Badge variant="secondary" className="mt-1 text-[11px] capitalize">
                              {place.categoryName}
                            </Badge>
                          </div>
                          <div className="flex flex-col items-end text-right">
                            <div className="flex items-center gap-1 text-xs text-amber-600">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              4.5
                            </div>
                            <span className="text-[11px] text-slate-400">Marker {index + 1}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-md"
                            style={{ background: `linear-gradient(135deg, ${colors.primary.to}, ${colors.primary.toHover})` }}
                          >
                            {index + 1}
                          </div>
                          Tap to open place details
                        </div>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleGetDirections(place);
                            }}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                            Get directions
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </DialogContent>
      
      {/* Place Detail Modal */}
      <PlaceDetailModal
        isOpen={selectedPlaceId !== null}
        onClose={handleClosePlaceDetail}
        placeDetail={placeDetail}
        isLoading={isLoadingPlaceDetail}
        onImageUploaded={handleImageUploaded}
      />
    </Dialog>
  );
};
