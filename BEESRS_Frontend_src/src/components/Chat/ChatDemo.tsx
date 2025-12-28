import React, { useState } from 'react';
import { PlaceCard } from './PlaceCard';
import { SuggestedActions } from './SuggestedActions';
import { MapView } from './MapView';
import { ChatMessage } from '../../pages/Chat/ChatMessage';
import type { Place, SuggestedAction, ChatMessage as ChatMessageType } from '../../types/chat.types';

// Demo data based on your example
const demoPlaces: Place[] = [
  {
    id: "16:venue:0e83e8e2-58a5-5956-915d-6133366ddeb2",
    name: "Cafe Dvdinh",
    address: "Thanh My Tay Ward, Ho Chi Minh City",
    latitude: 10.806708,
    longitude: 106.712463,
    distance: 3617,
    category: "point_of_interest",
    distanceText: "3.6 km",
    durationText: "43 minutes"
  },
  {
    id: "16:venue:078c0142-bb86-58c2-955f-61aac2b671d2",
    name: "The Daily Cafe",
    address: "An Khanh Ward, Ho Chi Minh City",
    latitude: 10.802118,
    longitude: 106.735831,
    distance: 4885,
    category: "point_of_interest",
    distanceText: "4.9 km",
    durationText: "58 minutes"
  },
  {
    id: "16:venue:2fe9ec97-b000-58c6-9f09-216f49687f0e",
    name: "Hao Sua",
    address: "Go Vap District, Ho Chi Minh City",
    latitude: 10.836499,
    longitude: 106.675594,
    distance: 7110,
    category: "point_of_interest",
    distanceText: "7.1 km",
    durationText: "1h 25m"
  }
];

const demoSuggestedActions: SuggestedAction[] = [
  {
    type: "show_map",
    label: "View map",
    data: {
      places: demoPlaces
    }
  },
  {
    type: "get_directions",
    label: "Directions to the first place",
    data: {
      place: demoPlaces[0]
    }
  }
];

const demoMessage: ChatMessageType = {
  messageId: "faf77bc4-1ca7-4e19-a38b-d7a8cb3ad526",
  conversationId: "a24896d2-6372-44d4-9fc9-7c432586832c",
  senderType: "assistant",
  messageText: `📍 1. **Cafe Dvdinh**
  📌 Thanh My Tay Ward, Ho Chi Minh City
  🚶 3.6 km (~43 minutes)

📍 2. **The Daily Cafe**
  📌 An Khanh Ward, Ho Chi Minh City
  🚶 4.9 km (~58 minutes)

📍 3. **Hao Sua**
  📌 Go Vap District, Ho Chi Minh City
  🚶 7.1 km (~1h 25m)`,
  botResponseType: "FIND_NEAREST_PLACES",
  detectedIntent: "FIND_NEAREST_PLACES",
  processingTimeMs: 919,
  referencedPlaces: {
    places: demoPlaces,
    suggestedActions: demoSuggestedActions
  },
  createdAt: new Date().toISOString()
};

export const ChatDemo: React.FC = () => {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const handleActionClick = (action: SuggestedAction) => {
    console.log('Action clicked:', action);
    if (action.type === 'show_map') {
      setIsMapOpen(true);
    }
  };

  const handlePlaceClick = (placeId: string) => {
    console.log('Place clicked:', placeId);
  };

  const handleGetDirections = (place: Place) => {
    console.log('Get directions to:', place.name);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🤖 Chatbot Redesign Demo
        </h1>
        <p className="text-gray-600">
          Demo of the new chatbot components with rich location content,
          suggested actions, and an interactive map.
        </p>
      </div>

      {/* Demo Chat Message */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">💬 Chat message with rich content</h2>
        <div className="space-y-4">
          <ChatMessage
            message={demoMessage}
            places={demoPlaces}
            suggestedActions={demoSuggestedActions}
            onLocationClick={handlePlaceClick}
            onMapAction={(action, data) => console.log('Map action:', action, data)}
          />
        </div>
      </div>

      {/* Demo Place Cards */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">📍 Place Cards</h2>
        <div className="space-y-4">
          {demoPlaces.map((place, index) => (
            <PlaceCard
              key={place.id}
              place={place}
              index={index}
              onClick={() => handlePlaceClick(place.id)}
              onGetDirections={() => handleGetDirections(place)}
              onViewOnMap={() => setIsMapOpen(true)}
            />
          ))}
        </div>
      </div>

      {/* Demo Suggested Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">🎯 Suggested Actions</h2>
        <SuggestedActions
          actions={demoSuggestedActions}
          onActionClick={handleActionClick}
        />
      </div>

      {/* Demo Map View */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">🗺️ Map View</h2>
        <button
          onClick={() => setIsMapOpen(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Open map
        </button>
      </div>

      {/* Map View Modal */}
      <MapView
        places={demoPlaces}
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onGetDirections={handleGetDirections}
      />
    </div>
  );
};


