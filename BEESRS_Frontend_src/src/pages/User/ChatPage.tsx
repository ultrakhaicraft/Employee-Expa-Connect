// src/pages/public/User/ChatPage.tsx
import React from 'react';
import { ChatContainer } from '../Chat/ChatContainer';
import { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLocationClick = (placeId: string) => {
    // Validate placeId before navigating
    if (!placeId || placeId === 'null' || placeId === 'undefined') {
      console.warn('Invalid placeId, cannot navigate:', placeId);
      return;
    }
    // Navigate to place detail page
    navigate(`/place/${placeId}`);
  };

  const handleMapAction = (action: string, data: any) => {
    console.log('Map action:', action, data);
    
    if (action === 'open_map') {
      // Navigate to map view with places
      navigate('/map', { state: { placeIds: data.placeIds } });
    } else if (action === 'get_directions') {
      // Open directions
      const { latitude, longitude } = data;
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
        '_blank'
      );
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Toaster position="top-right" />
      
      <ChatContainer
        onLocationClick={handleLocationClick}
        onMapAction={handleMapAction}
      />
    </div>
  );
};