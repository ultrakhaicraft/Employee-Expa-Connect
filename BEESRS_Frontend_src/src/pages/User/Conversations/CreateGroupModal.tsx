// src/pages/User/Conversations/CreateGroupModal.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Search, Check, Plus } from 'lucide-react';
import { ViewFriends } from '../../../services/userService';
import { colors } from '../../../lib/colors';

interface Friend {
  userId: string;
  userName: string;
  fullName: string;
  profilePictureUrl: string | null;
  isOnline: boolean;
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (groupName: string, participantIds: string[]) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onCreateGroup,
}) => {
  const [groupName, setGroupName] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredFriends(friends);
    } else {
      const filtered = friends.filter(friend => {
        const fullName = friend.fullName?.toLowerCase() || '';
        const userName = friend.userName?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        return fullName.includes(query) || userName.includes(query);
      });
      setFilteredFriends(filtered);
    }
  }, [searchQuery, friends]);

  const fetchFriends = async () => {
    try {
      setIsLoading(true);
      const response = await ViewFriends();
      const friendsData = response.items || [];
      
      // Remove duplicates
      const uniqueFriends = friendsData.filter((friend: Friend, index: number, self: Friend[]) => 
        index === self.findIndex((f: Friend) => f.userId === friend.userId)
      );
      
      setFriends(uniqueFriends);
      setFilteredFriends(uniqueFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }
    
    if (selectedFriends.size < 2) {
      alert('Please select at least 2 friends to create a group');
      return;
    }

    onCreateGroup(groupName.trim(), Array.from(selectedFriends));
    handleClose();
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedFriends(new Set());
    setSearchQuery('');
    onClose();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create Group Chat</h2>
                <p className="text-sm text-gray-600">
                  {selectedFriends.size > 0 
                    ? `${selectedFriends.size} friend${selectedFriends.size > 1 ? 's' : ''} selected`
                    : 'Select friends to add'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Group Name Input */}
          <div className="px-6 py-4 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name *
            </label>
            <input
              type="text"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Search Bar */}
          <div className="px-6 py-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Friends List */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600" />
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {searchQuery ? 'No friends found' : 'No friends available'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFriends.map((friend) => {
                  const isSelected = selectedFriends.has(friend.userId);
                  return (
                    <motion.div
                      key={friend.userId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => toggleFriendSelection(friend.userId)}
                      className={`
                        flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200
                        ${isSelected
                          ? 'bg-blue-50 border-2 border-blue-500 shadow-sm'
                          : 'bg-white border border-gray-200 hover:bg-gray-50'
                        }
                      `}
                    >
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
                        {friend.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>

                      {/* Friend Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {friend.fullName}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          @{friend.userName}
                        </p>
                      </div>

                      {/* Checkbox */}
                      <div
                        className={`
                          w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                          ${isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                          }
                        `}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedFriends.size === 0 ? (
                'Select at least 2 friends'
              ) : selectedFriends.size === 1 ? (
                '1 friend selected (need at least 2)'
              ) : (
                `${selectedFriends.size} friends selected`
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedFriends.size < 2}
                className={`
                  px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2
                  ${!groupName.trim() || selectedFriends.size < 2
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:scale-105'
                  }
                `}
              >
                <Plus className="w-4 h-4" />
                Create Group
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

