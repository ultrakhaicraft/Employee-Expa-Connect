import { useState } from 'react';
import { MapPin, X, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (location: { lat: number; lng: number }, radius: number) => void;
  defaultLocation?: { lat: number; lng: number };
  defaultRadius?: number;
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  onConfirm,
  defaultLocation = { lat: 10.7769, lng: 106.7009 }, // TP.HCM
  defaultRadius = 5
}: LocationPickerModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number }>(defaultLocation);
  const [searchRadius, setSearchRadius] = useState<number>(defaultRadius);
  const [manualLat, setManualLat] = useState<string>(defaultLocation.lat.toString());
  const [manualLng, setManualLng] = useState<string>(defaultLocation.lng.toString());

  const quickLocations = [
    { name: 'District 1, Ho Chi Minh City', lat: 10.7769, lng: 106.7009 },
    { name: 'Thu Duc District, Ho Chi Minh City', lat: 10.8497, lng: 106.7537 },
    { name: 'Hanoi', lat: 21.0285, lng: 105.8542 },
    { name: 'Da Nang', lat: 16.0544, lng: 108.2022 },
  ];

  const handleQuickSelect = (location: { lat: number; lng: number }) => {
    setSelectedLocation(location);
    setManualLat(location.lat.toString());
    setManualLng(location.lng.toString());
  };

  const handleManualInput = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      return;
    }
    
    // Validate Vietnam coordinates
    if (lat < 8 || lat > 24 || lng < 102 || lng > 110) {
      alert('Invalid coordinates! Vietnam: Latitude 8-24°, Longitude 102-110°');
      return;
    }
    
    setSelectedLocation({ lat, lng });
  };

  const handleConfirm = () => {
    onConfirm(selectedLocation, searchRadius);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <DialogTitle>Select Search Location</DialogTitle>
          <DialogDescription>
            Choose a location for AI to search for nearby places
          </DialogDescription>
        </DialogHeader>
        <Card className="border-0 shadow-none">
          <CardHeader>
            <div className="flex items-center justify-end">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Quick Location Buttons */}
            <div>
              <label className="text-sm font-medium mb-2 block">Quick Locations:</label>
              <div className="grid grid-cols-2 gap-2">
                {quickLocations.map((loc) => (
                  <Button
                    key={loc.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSelect(loc)}
                    className="justify-start"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    {loc.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Manual Input */}
            <div>
              <label className="text-sm font-medium mb-2 block">Or enter coordinates manually:</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="number"
                    placeholder="Latitude"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    step="0.0001"
                    min="8"
                    max="24"
                  />
                  <p className="text-xs text-gray-500 mt-1">8° - 24° (North)</p>
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Longitude"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    step="0.0001"
                    min="102"
                    max="110"
                  />
                  <p className="text-xs text-gray-500 mt-1">102° - 110° (East)</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleManualInput}
                className="mt-2"
              >
                <Search className="h-4 w-4 mr-2" />
                Apply Coordinates
              </Button>
            </div>

            {/* Map Preview */}
            <div>
              <label className="text-sm font-medium mb-2 block">Map Preview:</label>
              <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: '500px' }}>
                <iframe
                  src={`https://maps.track-asia.com/embed.html?center=${selectedLocation.lat},${selectedLocation.lng}&zoom=14&markers=${selectedLocation.lat},${selectedLocation.lng}`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  title="Location Picker"
                />
                <div className="absolute top-2 left-2 bg-white px-3 py-2 rounded shadow-lg text-xs">
                  📍 {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </div>
              </div>
            </div>

            {/* Radius Selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">Search Radius:</label>
              <select
                value={searchRadius}
                onChange={(e) => setSearchRadius(Number(e.target.value))}
                className="w-full border rounded px-3 py-2 bg-white"
              >
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={15}>15 km</option>
                <option value={20}>20 km</option>
                <option value={30}>30 km</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                AI will search for places within {searchRadius}km radius from the selected location
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleConfirm} className="flex-1 bg-green-600 hover:bg-green-700">
                <MapPin className="h-4 w-4 mr-2" />
                Confirm and Create Recommendations
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

