// src/components/Chat/ChatMessageList.tsx
import React, { useState } from 'react';
import type { ChatMessage as ChatMessageType, SuggestedAction, Place } from '../../types/chat.types';
import { ChatMessage } from './ChatMessage';
import { ChatSuggestedActions } from './ChatSuggestedActions';

interface ChatMessageListProps {
  messages: ChatMessageType[];
  suggestedActions?: SuggestedAction[]; // ✅ Optional
  onLocationClick?: (placeId: string) => void;
  onMapAction?: (action: string, data: any) => void;
  onSuggestionClick?: (suggestion: string) => void;
  onActionClick?: (action: SuggestedAction) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  suggestedActions = [], // ✅ Default to empty array
  onLocationClick,
  onMapAction,
  onSuggestionClick,
  onActionClick,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const suggestions = [
    'Find Vietnamese restaurants nearby',
    'Suggest signature regional dishes',
    'Family-friendly dining ideas'
  ];
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6">
        <div className="w-20 h-20 mb-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-xl">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Hello there! 👋</h3>
        <p className="text-xs text-center max-w-xs leading-relaxed text-gray-600">
          I'm BEESRS AI – your smart assistant. Ask me about restaurants, dishes, or local food culture!
        </p>
        
        {/* Quick suggestions */}
        <div className="mt-6 space-y-2 w-full max-w-xs">
          <p className="text-[11px] font-medium text-gray-500 mb-3">Try asking:</p>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick?.(suggestion)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="w-full bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 rounded-xl px-4 py-2.5 text-xs text-gray-700 border border-blue-200/50 text-left transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center gap-2 group"
              >
                <span className={`transition-transform duration-200 ${hoveredIndex === index ? 'scale-125' : ''}`}>
                  💡
                </span>
                <span className="flex-1 group-hover:text-purple-700 font-medium">{suggestion}</span>
                <span className={`text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity ${hoveredIndex === index ? 'translate-x-1' : ''}`}>
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Parse response data from messages
  const getMessageData = (message: ChatMessageType) => {
    let places: Place[] = [];
    let suggestedActions: SuggestedAction[] = [];

    // Try to parse from referencedPlaces if it exists
    if (message.referencedPlaces) {
      try {
        const data = typeof message.referencedPlaces === 'string'
          ? JSON.parse(message.referencedPlaces)
          : message.referencedPlaces;
        
        if (data.places) {
          places = data.places;
        }
        if (data.suggestedActions) {
          suggestedActions = data.suggestedActions;
        }
      } catch (e) {
        // Silent error handling
      }
    }

    return { places, suggestedActions };
  };

  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const { places, suggestedActions: messageActions } = getMessageData(message);
        
        return (
          <ChatMessage
            key={`${message.messageId}-${index}`}
            message={message}
            places={places}
            suggestedActions={messageActions}
            onLocationClick={onLocationClick}
            onMapAction={onMapAction}
            onActionClick={onActionClick}
          />
        );
      })}
      
      {/* Display global suggested actions after messages */}
      {messages.length > 0 && suggestedActions && suggestedActions.length > 0 && onActionClick && (
        <div className="mt-4 px-2">
          <ChatSuggestedActions
            actions={suggestedActions}
            onActionClick={onActionClick}
          />
        </div>
      )}
    </div>
  );
};