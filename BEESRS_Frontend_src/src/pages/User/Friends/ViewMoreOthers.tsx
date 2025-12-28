import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ViewAllUserProfiles, SendFriendRequest } from '@/services/userService'
import { useToast } from '@/components/ui/use-toast'
import { colors } from '@/lib/colors'
import { 
  Users, 
  Search,
  MapPin,
  Building2,
  UserCircle,
  ArrowLeft,
  Loader2,
  UserPlus,
  CheckCircle,
  Clock
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface UserProfile {
  profileId: string;
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  homeCountry: string;
  branch: string;
  currentBranch: string;
  profilePictureUrl: string;
  createdAt: string;
  updatedAt: string;
  friendshipStatus?: 'Not friend' | 'Pending' | 'Friend';
}

type FriendshipStatus = 'none' | 'requested' | 'friend'

function ViewMoreOthers() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [addingFriends, setAddingFriends] = useState<Set<string>>(new Set())
  const [friendshipStatuses, setFriendshipStatuses] = useState<Map<string, FriendshipStatus>>(new Map())

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = users.filter(user => {
      const branch = user.branch?.toLowerCase() || ''
      const homeCountry = user.homeCountry?.toLowerCase() || ''
      return (
        user.fullName?.toLowerCase().includes(query) ||
        user.firstName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query) ||
        branch.includes(query) ||
        homeCountry.includes(query)
      )
    })
    setFilteredUsers(filtered)
  }, [searchQuery, users])

  const mapFriendshipStatus = (status?: UserProfile['friendshipStatus']): FriendshipStatus => {
    switch (status) {
      case 'Friend':
        return 'friend'
      case 'Pending':
        return 'requested'
      default:
        return 'none'
    }
  }

  const updateStatusesFromUsers = (userList: UserProfile[]) => {
    const statusMap = new Map<string, FriendshipStatus>()
    userList.forEach(user => {
      statusMap.set(user.userId, mapFriendshipStatus(user.friendshipStatus))
    })
    setFriendshipStatuses(statusMap)
  }

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const response = await ViewAllUserProfiles()
      // Handle various response formats: response.data.items, response.items, or array directly
      const items = response?.data?.items || response?.items || (Array.isArray(response) ? response : [])
      setUsers(items)
      setFilteredUsers(items)
      updateStatusesFromUsers(items)
    } catch (error: any) {
      console.error('Error fetching users:', error)
      // Only show toast for actual errors, not empty data
      if (error.response?.status !== 404) {
        toast({
          title: "Error",
          description: "Failed to load users. Please try again later.",
          variant: "destructive"
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserClick = (userId: string) => {
    navigate(`/view-other-profile/${userId}`)
  }

  const handleAddFriend = async (userId: string, userName: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    
    const currentStatus = friendshipStatuses.get(userId)
    if (currentStatus === 'friend' || currentStatus === 'requested') {
      return
    }

    try {
      setAddingFriends(prev => new Set(prev).add(userId))
      await SendFriendRequest(userId)
      
      // Update friendship status to 'requested'
      setFriendshipStatuses(prev => {
        const newMap = new Map(prev)
        newMap.set(userId, 'requested')
        return newMap
      })
      setUsers(prev => prev.map(user => 
        user.userId === userId ? { ...user, friendshipStatus: 'Pending' } : user
      ))
      setFilteredUsers(prev => prev.map(user => 
        user.userId === userId ? { ...user, friendshipStatus: 'Pending' } : user
      ))
      
      toast({
        title: "Friend Request Sent!",
        description: `Friend request sent to ${userName}`,
        variant: "default"
      })
    } catch (error: any) {
      console.error('Error adding friend:', error)
      toast({
        title: "Failed to Send Request",
        description: error.response?.data?.message || "Failed to send friend request. Please try again.",
        variant: "destructive"
      })
    } finally {
      setAddingFriends(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(to right, ${colors.primary.to}, ${colors.primary.toHover})` }}
              >
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">All Users</h1>
                <p className="text-gray-600 mt-1">Discover and connect with people in the system</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search by name, branch, or country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              {searchQuery && (
                <p className="text-sm text-gray-500 mt-3">
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Users Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No users found' : 'No users available'}
              </h3>
              <p className="text-gray-500">
                {searchQuery 
                  ? 'Try adjusting your search query'
                  : 'There are no users in the system yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredUsers.map((user, index) => (
              <motion.div
                key={user.userId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-gray-200 hover:border-blue-300 overflow-hidden group">
                  <div className="relative">
                    {/* Header Gradient */}
                    <div 
                      className="h-20 w-full"
                      style={{ background: `linear-gradient(135deg, ${colors.primary.to}, ${colors.primary.toHover})` }}
                    />
                    
                    {/* Profile Picture */}
                    <div className="relative -mt-12 px-4 flex justify-center">
                      <div className="relative">
                        {user.profilePictureUrl ? (
                          <img
                            src={user.profilePictureUrl}
                            alt={user.fullName}
                            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement
                              if (fallback) {
                                fallback.style.display = 'flex'
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className="w-24 h-24 rounded-full border-4 border-white shadow-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-300"
                          style={{ 
                            display: user.profilePictureUrl ? 'none' : 'flex',
                            background: `linear-gradient(135deg, ${colors.primary.to}, ${colors.primary.toHover})`
                          }}
                        >
                          <span className="text-white font-bold text-2xl">
                            {user.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <CardContent className="pt-4 pb-4 px-4">
                    {/* User Name */}
                    <h3 className="text-xl font-bold text-gray-900 text-center mb-1 truncate">
                      {user.fullName}
                    </h3>
                    
                    {/* Branch Info */}
                    <div className="space-y-3 mt-4">
                      <div className="flex items-start gap-2">
                        <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">Branch</p>
                          <p className="text-sm text-gray-700 font-medium truncate">{user.currentBranch || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">Country</p>
                          <p className="text-sm text-gray-700 font-medium truncate">{user.homeCountry || 'N/A'}</p>
                        </div>
                      </div>
                      
                      {/* Joined Date */}
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-400">
                          Joined {formatDate(user.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* View Profile and Add Friend Buttons */}
                    <div className="flex gap-2 mt-4 min-w-0">
                      <Button
                        size="sm"
                        className="flex-1 text-xs px-2 py-2 group-hover:shadow-md transition-all duration-300 whitespace-nowrap min-w-0"
                        style={{
                          background: `linear-gradient(to right, ${colors.primary.to}, ${colors.primary.toHover})`
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUserClick(user.userId)
                        }}
                      >
                        <span className="truncate">View Profile</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`flex-1 text-xs px-2 py-2 transition-all duration-200 whitespace-nowrap min-w-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                          friendshipStatuses.get(user.userId) === 'friend'
                            ? 'bg-green-500 text-white border-2 border-green-500 hover:bg-green-600 hover:border-green-600 cursor-not-allowed'
                            : friendshipStatuses.get(user.userId) === 'requested'
                            ? 'bg-gray-400 text-white border-2 border-gray-400 cursor-not-allowed'
                            : 'border-blue-400 text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600'
                        }`}
                        onClick={(e) => handleAddFriend(user.userId, user.fullName, e)}
                        disabled={addingFriends.has(user.userId) || friendshipStatuses.get(user.userId) === 'friend' || friendshipStatuses.get(user.userId) === 'requested'}
                      >
                        {addingFriends.has(user.userId) ? (
                          <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                        ) : friendshipStatuses.get(user.userId) === 'friend' ? (
                          <span className="flex items-center justify-center gap-1 truncate">
                            <CheckCircle className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">Friend</span>
                          </span>
                        ) : friendshipStatuses.get(user.userId) === 'requested' ? (
                          <span className="flex items-center justify-center gap-1 truncate">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">Requested</span>
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1 truncate">
                            <UserPlus className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">Add Friend</span>
                          </span>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Total Count */}
        {!isLoading && users.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center pt-4"
          >
            <Badge 
              variant="secondary" 
              className="text-sm px-4 py-1.5"
              style={{ backgroundColor: colors.primary.to + '20', color: colors.primary.to }}
            >
              <Users className="w-4 h-4 mr-2" />
              {users.length} {users.length === 1 ? 'user' : 'users'} in total
            </Badge>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default ViewMoreOthers
