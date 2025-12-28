// src/components/ConversationButton.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MessageCircle } from 'lucide-react';
import type { RootState } from '../redux/store';

interface ConversationButtonProps {
  variant?: 'icon' | 'button' | 'link';
  showBadge?: boolean;
  className?: string;
}

/**
 * Reusable button to navigate to conversations page
 * Shows unread message count badge
 * 
 * Usage:
 * <ConversationButton variant="icon" showBadge />
 * <ConversationButton variant="button" />
 * <ConversationButton variant="link" />
 */
export const ConversationButton: React.FC<ConversationButtonProps> = ({
  variant = 'icon',
  showBadge = true,
  className = '',
}) => {
  const navigate = useNavigate();
  const conversations = useSelector(
    (state: RootState) => state.conversation.conversations
  );

  // Calculate total unread count
  const totalUnread = conversations.reduce(
    (sum, conv) => sum + conv.unreadCount,
    0
  );

  const handleClick = () => {
    navigate('/conversations');
  };

  // Icon variant - just icon with badge
  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        className={`relative p-2 rounded-full hover:bg-gray-100 transition-colors ${className}`}
        title="Messages"
        aria-label="Open conversations"
      >
        <MessageCircle className="w-6 h-6 text-gray-700" />
        {showBadge && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>
    );
  }

  // Button variant - full button with text
  if (variant === 'button') {
    return (
      <button
        onClick={handleClick}
        className={`
          relative flex items-center gap-2 px-4 py-2 
          bg-blue-600 text-white rounded-lg 
          hover:bg-blue-700 transition-colors
          ${className}
        `}
        aria-label="Open conversations"
      >
        <MessageCircle className="w-5 h-5" />
        <span>Messages</span>
        {showBadge && totalUnread > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>
    );
  }

  // Link variant - text link with icon
  return (
    <button
      onClick={handleClick}
      className={`
        relative flex items-center gap-2 
        text-gray-700 hover:text-blue-600 transition-colors
        ${className}
      `}
      aria-label="Open conversations"
    >
      <MessageCircle className="w-5 h-5" />
      <span>Messages</span>
      {showBadge && totalUnread > 0 && (
        <span className="ml-1 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
          {totalUnread}
        </span>
      )}
    </button>
  );
};

/**
 * Example usage in Header:
 * 
 * import { ConversationButton } from './components/ConversationButton';
 * 
 * function Header() {
 *   return (
 *     <header>
 *       <nav>
 *         <ConversationButton variant="icon" showBadge />
 *       </nav>
 *     </header>
 *   );
 * }
 */

/**
 * Example usage in Profile Menu:
 * 
 * function ProfileMenu() {
 *   return (
 *     <div>
 *       <ConversationButton variant="link" />
 *     </div>
 *   );
 * }
 */













