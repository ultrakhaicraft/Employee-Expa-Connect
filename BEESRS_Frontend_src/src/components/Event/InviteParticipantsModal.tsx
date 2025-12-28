import React, { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, Check, Mail, Sparkles, Users, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ViewFriends, searchUsers } from '../../services/userService';

interface User {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  isOnline?: boolean;
  invitationStatus?: string; // 'pending', 'accepted', 'declined', or undefined (not invited)
}

interface InviteParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (userIds: string[]) => Promise<void>;
  eventTitle: string;
  alreadyInvitedIds: string[];
}

const InviteParticipantsModal: React.FC<InviteParticipantsModalProps> = ({
  isOpen,
  onClose,
  onInvite,
  eventTitle,
  alreadyInvitedIds,
}) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'search'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'friends') {
        loadUsers();
      }
      // Reset search when modal opens
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUserIds(new Set());
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (activeTab === 'friends') {
      filterUsers();
    }
  }, [searchQuery, users, activeTab]);

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsers(query);
      
      // Transform API response to User format
      const transformedResults: User[] = results.map((user: any) => ({
        userId: user.userId || user.UserId,
        fullName: user.fullName || user.FullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email || user.Email,
        avatarUrl: user.profilePictureUrl || user.ProfilePictureUrl || user.userProfile?.profilePictureUrl || user.avatarUrl || '',
        isOnline: false,
        invitationStatus: alreadyInvitedIds.includes(user.userId || user.UserId) 
          ? 'pending' // Assume pending if already in invited list
          : undefined
      }));

      setSearchResults(transformedResults);
    } catch (error: any) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users: ' + (error.message || 'Unknown error'));
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [alreadyInvitedIds]);

  // Debounce search input
  useEffect(() => {
    if (activeTab === 'search') {
      // Clear previous timer
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }

      // Set new timer
      const timer = setTimeout(() => {
        performSearch(searchQuery);
      }, 500); // 500ms debounce

      setSearchDebounceTimer(timer);

      // Cleanup
      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    }
  }, [searchQuery, activeTab, performSearch]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Call ViewFriends API with pagination
      const friendsData = await ViewFriends(1, 100);
      
      // Handle both array and paginated responses
      const dataArray = Array.isArray(friendsData) 
        ? friendsData 
        : (friendsData.items || []);
      
      // Transform API data to match User interface
      const transformedUsers: User[] = dataArray.map((friend: any) => ({
        userId: friend.userId || friend.friendId || friend.id,
        fullName: friend.fullName || 
                  `${friend.firstName || ''} ${friend.lastName || ''}`.trim() || 
                  friend.email || '',
        email: friend.email || '',
        avatarUrl: friend.profilePictureUrl || friend.ProfilePictureUrl || friend.avatarUrl || friend.avatar || friend.userProfile?.profilePictureUrl || '',
        isOnline: friend.isOnline || false,
      }));
      
      console.log('✅ Loaded friends for invite:', transformedUsers.length, 'friends');
      setUsers(transformedUsers);
    } catch (error: any) {
      toast.error('Failed to load friends');
      console.error('❌ Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (user) =>
        !alreadyInvitedIds.includes(user.userId) &&
        (user.fullName?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query))
    );
    setFilteredUsers(filtered);
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleInvite = async () => {
    if (selectedUserIds.size === 0) {
      toast.error('Please select at least one user to invite');
      return;
    }

    try {
      setInviting(true);
      await onInvite(Array.from(selectedUserIds));
      toast.success(`Successfully invited ${selectedUserIds.size} user(s)`);
      setSelectedUserIds(new Set());
      onClose();
    } catch (error: any) {
      toast.error('Failed to invite users: ' + (error.message || 'Unknown error'));
    } finally {
      setInviting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <UserPlus className="mr-2 h-6 w-6 text-blue-600" />
            Invite Participants
          </DialogTitle>
          <DialogDescription>
            Invite your team members to <span className="font-semibold text-gray-900">{eventTitle}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'friends' | 'search')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Friends
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
          </TabsList>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-4 mt-4">
            {/* Search Bar for Friends */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search friends by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
              />
            </div>

            {/* Selected Count Badge */}
            {selectedUserIds.size > 0 && (
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {selectedUserIds.size} user(s) selected
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUserIds(new Set())}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Users List - Friends */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-[300px] max-h-[400px]">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {searchQuery ? 'No friends found matching your search' : 'No friends available to invite'}
                  </p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isAlreadyInvited = alreadyInvitedIds.includes(user.userId);
                  return (
                    <div
                      key={user.userId}
                      onClick={() => !isAlreadyInvited && toggleUserSelection(user.userId)}
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${
                        isAlreadyInvited 
                          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                          : selectedUserIds.has(user.userId)
                          ? 'border-blue-500 bg-blue-50 cursor-pointer hover:shadow-md'
                          : 'border-gray-200 hover:border-gray-300 cursor-pointer hover:shadow-md'
                      }`}
                    >
                      <Checkbox
                        checked={selectedUserIds.has(user.userId)}
                        onCheckedChange={() => !isAlreadyInvited && toggleUserSelection(user.userId)}
                        disabled={isAlreadyInvited}
                        className="pointer-events-none"
                      />
                      
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {user.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.fullName}
                          </p>
                          {isAlreadyInvited && (
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Invited
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>

                      {selectedUserIds.has(user.userId) && !isAlreadyInvited && (
                        <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-4 mt-4">
            {/* Search Bar for All Users */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by email or name (same branch)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>

            {/* Selected Count Badge */}
            {selectedUserIds.size > 0 && (
              <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">
                    {selectedUserIds.size} user(s) selected
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUserIds(new Set())}
                  className="text-green-600 hover:text-green-700"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-[300px] max-h-[400px]">
              {searching ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : !searchQuery.trim() ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Start typing to search for users in your branch</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No users found matching your search</p>
                </div>
              ) : (
                searchResults.map((user) => {
                  const isAlreadyInvited = alreadyInvitedIds.includes(user.userId);
                  return (
                    <div
                      key={user.userId}
                      onClick={() => !isAlreadyInvited && toggleUserSelection(user.userId)}
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${
                        isAlreadyInvited 
                          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                          : selectedUserIds.has(user.userId)
                          ? 'border-blue-500 bg-blue-50 cursor-pointer hover:shadow-md'
                          : 'border-gray-200 hover:border-gray-300 cursor-pointer hover:shadow-md'
                      }`}
                    >
                      <Checkbox
                        checked={selectedUserIds.has(user.userId)}
                        onCheckedChange={() => !isAlreadyInvited && toggleUserSelection(user.userId)}
                        disabled={isAlreadyInvited}
                        className="pointer-events-none"
                      />
                      
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                          <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                            {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {user.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.fullName}
                          </p>
                          {isAlreadyInvited && (
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Invited
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>

                      {selectedUserIds.has(user.userId) && !isAlreadyInvited && (
                        <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-500">
            {activeTab === 'friends' 
              ? `${filteredUsers.length} friend(s) available`
              : `${searchResults.length} user(s) found`
            }
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} disabled={inviting}>
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={selectedUserIds.size === 0 || inviting}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {inviting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Inviting...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite {selectedUserIds.size > 0 ? `(${selectedUserIds.size})` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteParticipantsModal;

