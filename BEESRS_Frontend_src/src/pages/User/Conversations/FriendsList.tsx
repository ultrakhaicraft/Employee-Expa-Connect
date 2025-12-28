// src/pages/User/Conversations/FriendsList.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageCircle, Search } from 'lucide-react';
import { ViewFriends } from '../../../services/userService';
import { colors } from '../../../lib/colors';

interface Friend {
  userId: string;
  userName: string;
  fullName: string;
  profilePictureUrl: string | null;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

interface FriendsListProps {
  onSelectFriend: (friend: Friend) => void;
}

export const FriendsList: React.FC<FriendsListProps> = ({ onSelectFriend }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);

  const fetchFriends = async () => {
    try {
      setIsLoading(true);
      const response = await ViewFriends();
      const friendsData = response.items || [];
      
      // Remove duplicates based on userId
      const uniqueFriends = friendsData.filter((friend: Friend, index: number, self: Friend[]) => 
        index === self.findIndex((f: Friend) => f.userId === friend.userId)
      );
      
      setFriends(uniqueFriends);
      setFilteredFriends(uniqueFriends);
    } catch (error: any) {
      console.error('Error fetching friends:', error);
      
      // Handle 401 Unauthorized - token expired or invalid
      if (error.response?.status === 401) {
        console.warn('Authentication failed - token may be expired');
        // You could dispatch a logout action here if needed
        // dispatch(logout());
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredFriends(friends);
    } else {
      const filtered = friends.filter(friend =>
        friend.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.userName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFriends(filtered);
    }
  }, [searchQuery, friends]);

  const handleFriendClick = (friend: Friend) => {
    onSelectFriend(friend);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Friends</h2>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Friends List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600" />
              <p className="text-sm text-gray-600">Loading friends...</p>
            </div>
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center px-6"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No friends found' : 'No friends yet'}
              </h3>
              <p className="text-gray-600 text-sm">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'Add some friends to start chatting!'
                }
              </p>
            </motion.div>
          </div>
        ) : (
          <div className="p-2">
            <AnimatePresence>
              {filteredFriends.map((friend, index) => (
                <motion.div
                  key={friend.userId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleFriendClick(friend)}
                  className="group cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
                        style={{ 
                          background: friend.profilePictureUrl 
                            ? `url(${friend.profilePictureUrl})` 
                            : `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        {!friend.profilePictureUrl && getInitials(friend.fullName)}
                      </div>
                      {/* Online Status */}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                        friend.isOnline ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    </div>

                    {/* Friend Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {friend.fullName}
                        </h3>
                        {friend.isOnline && (
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        )}
                      </div>
                    </div>

                    {/* Chat Button */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200"
                      title="Start chat"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
