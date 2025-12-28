import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ViewAllFriendRequest, ViewFriends, AcceptFriendRequest, RejectFriendRequest, DeleteFriend } from '@/services/userService'
import { useToast } from '@/components/ui/use-toast'
import { colors } from '@/lib/colors'
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserMinus,
  Clock, 
  Check, 
  X,
  RefreshCw
} from 'lucide-react'

interface FriendRequest {
  friendshipId: string
  requestedId: string
  fullName: string
  profilePictureUrl: string
  addresseeId: string
  status: string
  createdAt: string
  updatedAt: string
}

interface Friend {
  friendshipId: string
  userId: string
  fullName: string
  profilePictureUrl: string
  status: string
  createdAt: string
  updatedAt: string
}

function ViewAllFriends() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set())
  const [deletingFriends, setDeletingFriends] = useState<Set<string>>(new Set())
  const [unfriendDialogOpen, setUnfriendDialogOpen] = useState(false)
  const [friendToUnfriend, setFriendToUnfriend] = useState<{ userId: string; name: string } | null>(null)

  const fetchFriendRequests = async () => {
    try {
      setIsLoadingRequests(true)
      const response = await ViewAllFriendRequest()
      setFriendRequests(response || [])
    } catch (error: any) {
      console.error('Error fetching friend requests:', error)
      // Silently handle error - no toast notification
    } finally {
      setIsLoadingRequests(false)
    }
  }

  const fetchFriends = async () => {
    try {
      setIsLoadingFriends(true)
      const response = await ViewFriends()
      
      // Support both paginated response { items: [...] } and plain array []
      const friendsData: Friend[] = Array.isArray(response)
        ? response
        : response?.items || []
      
      // Remove duplicates based on userId
      const uniqueFriends = friendsData.filter((friend: Friend, index: number, self: Friend[]) => 
        index === self.findIndex((f: Friend) => f.userId === friend.userId)
      )
      
      setFriends(uniqueFriends)
    } catch (error: any) {
      console.error('Error fetching friends:', error)
      // Silently handle error - no toast notification
    } finally {
      setIsLoadingFriends(false)
    }
  }

  useEffect(() => {
    fetchFriendRequests()
    fetchFriends()
  }, [])

  const handleAcceptRequest = async (friendshipId: string, friendName: string) => {
    try {
      setProcessingRequests(prev => new Set(prev).add(friendshipId))
      await AcceptFriendRequest(friendshipId)
      
      // Remove from requests list
      setFriendRequests(prev => prev.filter(req => req.friendshipId !== friendshipId))
      
      toast({
        title: "Request Accepted!",
        description: `You are now friends with ${friendName}`,
        variant: "default"
      })
      
      // Refresh friends list
      fetchFriends()
    } catch (error: any) {
      console.error('Error accepting friend request:', error)
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive"
      })
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(friendshipId)
        return newSet
      })
    }
  }

  const handleRejectRequest = async (friendshipId: string, friendName: string) => {
    try {
      setProcessingRequests(prev => new Set(prev).add(friendshipId))
      await RejectFriendRequest(friendshipId)
      
      // Remove from requests list
      setFriendRequests(prev => prev.filter(req => req.friendshipId !== friendshipId))
      
      toast({
        title: "Request Rejected",
        description: `Friend request from ${friendName} has been rejected`,
        variant: "default"
      })
    } catch (error: any) {
      console.error('Error rejecting friend request:', error)
      toast({
        title: "Error",
        description: "Failed to reject friend request",
        variant: "destructive"
      })
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(friendshipId)
        return newSet
      })
    }
  }

  const handleUnfriendClick = (userId: string, friendName: string) => {
    setFriendToUnfriend({ userId, name: friendName })
    setUnfriendDialogOpen(true)
  }

  const handleConfirmUnfriend = async () => {
    if (!friendToUnfriend) return

    try {
      setDeletingFriends(prev => new Set(prev).add(friendToUnfriend.userId))
      await DeleteFriend(friendToUnfriend.userId)
      
      // Remove from friends list
      setFriends(prev => prev.filter(friend => friend.userId !== friendToUnfriend.userId))
      
      toast({
        title: "Friend Removed",
        description: `You are no longer friends with ${friendToUnfriend.name}`,
        variant: "default"
      })
    } catch (error: any) {
      console.error('Error removing friend:', error)
      toast({
        title: "Error",
        description: "Failed to remove friend",
        variant: "destructive"
      })
    } finally {
      setDeletingFriends(prev => {
        const newSet = new Set(prev)
        newSet.delete(friendToUnfriend.userId)
        return newSet
      })
      setUnfriendDialogOpen(false)
      setFriendToUnfriend(null)
    }
  }

  const handleCancelUnfriend = () => {
    setUnfriendDialogOpen(false)
    setFriendToUnfriend(null)
  }

  const handleViewProfile = (userId: string) => {
    navigate(`/view-other-profile/${userId}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Friends</h1>
            <p className="text-gray-600">Manage your friend requests and connections</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              My Friends
              {friends.length > 0 && (
                <Badge 
                  variant="secondary" 
                  className="ml-2 text-white text-xs px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.primary.to }}
                >
                  {friends.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Friend Requests
              {friendRequests.length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 text-white text-xs px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.status.error.primary }}
                >
                  {friendRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-green-500" />
                    My Friends
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchFriends}
                    disabled={isLoadingFriends}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingFriends ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingFriends ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No friends yet</p>
                    <p className="text-gray-400 text-sm mt-1">Start connecting with people!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {friends.map((friend, index) => (
                      <motion.div
                        key={friend.userId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleViewProfile(friend.userId)}
                      >
                        {/* Profile Picture */}
                        <div className="relative">
                          {friend.profilePictureUrl ? (
                            <img
                              src={friend.profilePictureUrl}
                              alt={friend.fullName}
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
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
                            className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center border-2 border-gray-200"
                            style={{ display: friend.profilePictureUrl ? 'none' : 'flex' }}
                          >
                            <span className="text-white font-bold text-sm">
                              {friend.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{friend.fullName}</h3>
                          <p className="text-gray-500 text-xs">
                            Friends since {formatDate(friend.updatedAt)}
                          </p>
                        </div>

                        {/* Status Badge and Actions */}
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Friends
                          </Badge>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUnfriendClick(friend.userId, friend.fullName)
                              }}
                              disabled={deletingFriends.has(friend.userId)}
                              className="border-red-300 text-red-600 hover:bg-red-100 hover:border-red-400 hover:text-red-700 transition-all duration-200"
                            >
                              {deletingFriends.has(friend.userId) ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <UserMinus className="w-4 h-4" />
                              )}
                            </Button>
                          </motion.div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Friend Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    Pending Friend Requests
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchFriendRequests}
                    disabled={isLoadingRequests}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingRequests ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingRequests ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : friendRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No pending friend requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {friendRequests.map((request, index) => {
                      const requestUserId = request.requestedId || request.addresseeId
                      return (
                      <motion.div
                        key={request.friendshipId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => requestUserId && handleViewProfile(requestUserId)}
                      >
                        {/* Profile Picture */}
                        <div className="relative">
                          {request.profilePictureUrl ? (
                            <img
                              src={request.profilePictureUrl}
                              alt={request.fullName}
                              className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
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
                            className="w-12 h-12 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center border-2 border-gray-200"
                            style={{ display: request.profilePictureUrl ? 'none' : 'flex' }}
                          >
                            <span className="text-white font-bold text-lg">
                              {request.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* User Info */}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{request.fullName}</h3>
                          <p className="text-gray-500 text-sm">
                            Sent {formatDate(request.updatedAt)}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAcceptRequest(request.friendshipId, request.fullName)
                              }}
                              disabled={processingRequests.has(request.friendshipId)}
                              className="bg-green-500 hover:bg-green-600 text-white"
                            >
                              {processingRequests.has(request.friendshipId) ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </Button>
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRejectRequest(request.friendshipId, request.fullName)
                              }}
                              disabled={processingRequests.has(request.friendshipId)}
                              className="border-red-300 text-red-600 hover:bg-red-100 hover:border-red-400 hover:text-red-700 transition-all duration-200"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </motion.div>
                        </div>
                      </motion.div>
                    )
                  })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Unfriend Confirmation Dialog */}
      <AlertDialog open={unfriendDialogOpen} onOpenChange={setUnfriendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Friend</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{friendToUnfriend?.name}</strong> from your friends list? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelUnfriend}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmUnfriend}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deletingFriends.has(friendToUnfriend?.userId || '')}
            >
              {deletingFriends.has(friendToUnfriend?.userId || '') ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Friend'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}

export default ViewAllFriends