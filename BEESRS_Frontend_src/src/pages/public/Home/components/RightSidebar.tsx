import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ViewAllPeople, SendFriendRequest } from '@/services/userService'
import { motion } from 'framer-motion'
import { UserPlus, RefreshCw, ArrowRight } from 'lucide-react'
import { useSelector } from 'react-redux'
import { useToast } from '@/components/ui/use-toast'
import { colors, buttonStyles } from '@/lib/colors'
import { useNavigate } from 'react-router-dom'
import type { RootState } from '@/redux/store'

interface SuggestedFriend {
  userId: string
  fullName: string
  profilePictureUrl: string
  jobTitle: string
  branchName: string
}

interface RightSidebarProps {
  // No props needed - using real API data
}

export function RightSidebar({}: RightSidebarProps) {
  const navigate = useNavigate()
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)
  const { toast } = useToast()
  const [suggestedFriends, setSuggestedFriends] = useState<SuggestedFriend[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [addingFriends, setAddingFriends] = useState<Set<string>>(new Set())

  const fetchSuggestedFriends = async () => {
    try {
      setIsLoading(true)
      const response = await ViewAllPeople()
      setSuggestedFriends(response.items || [])
    } catch (error: any) {
      console.error('Error fetching suggested friends:', error)
      // Silently handle error - no error state or toast notification
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Only fetch suggested friends if user is authenticated
    if (isAuthenticated) {
      fetchSuggestedFriends()
    }
  }, [isAuthenticated])

  const handleAddFriend = async (userId: string, friendName: string) => {
    try {
      setAddingFriends(prev => new Set(prev).add(userId))
      await SendFriendRequest(userId)
      
      // Remove from suggested list after successful add
      setSuggestedFriends(prev => prev.filter(friend => friend.userId !== userId))
      
      // Show success toast
      toast({
        title: "Friend Request Sent!",
        description: `Friend request sent to ${friendName}`,
        variant: "default"
      })
    } catch (error: any) {
      console.error('Error adding friend:', error)
      
      // Show error toast
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

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full sticky top-0 z-40">
      <div className="p-6 space-y-6 overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 80px)' }}>
        {/* Suggested Friends - Only show if authenticated */}
        {isAuthenticated && (
          <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-md font-semibold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                People You May Know
              </CardTitle>
              <motion.button
                onClick={fetchSuggestedFriends}
                disabled={isLoading}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : suggestedFriends.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No suggestions available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {suggestedFriends.slice(0, 4).map((friend, index) => (
                  <motion.div
                    key={friend.userId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="relative group flex items-start gap-3 p-3 pr-3 rounded-lg hover:bg-blue-50 transition-all duration-300 overflow-hidden group-hover:pr-16 md:group-hover:pr-24"
                  >
                    <div 
                      className="relative cursor-pointer"
                      onClick={() => navigate(`/view-other-profile/${friend.userId}`)}
                    >
                      {friend.profilePictureUrl ? (
                        <img
                          src={friend.profilePictureUrl}
                          alt={friend.fullName}
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
                        className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-gray-200"
                        style={{ 
                          background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                          display: friend.profilePictureUrl ? 'none' : 'flex'
                        }}
                      >
                        <span className="text-white font-bold text-lg">
                          {friend.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <div 
                      className="flex-1 min-w-0 cursor-pointer transition-all duration-300 pr-0 group-hover:pr-16 md:group-hover:pr-24"
                      onClick={() => navigate(`/view-other-profile/${friend.userId}`)}
                    >
                      <h4 className="font-semibold text-gray-900 text-sm truncate">
                        {friend.fullName}
                      </h4>
                      <p className="text-gray-600 text-xs truncate">
                        {friend.jobTitle}
                      </p>
                      <p className="text-gray-500 text-xs truncate">
                        {friend.branchName}
                      </p>
                    </div>
                    
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 translate-x-full group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out z-10 pointer-events-none group-hover:pointer-events-auto"
                    >
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddFriend(friend.userId, friend.fullName)
                        }}
                        disabled={addingFriends.has(friend.userId)}
                        className={`${buttonStyles.primary} disabled:opacity-50 border-0 shadow-sm hover:shadow-md transition-all duration-200`}
                      >
                        {addingFriends.has(friend.userId) ? (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </motion.div>
                ))}
                
                {/* View More Link */}
                <div className="pt-2 border-t border-gray-200 mt-4">
                  <motion.button
                    onClick={() => navigate('/view-more-others')}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>View More</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
             )}
           </CardContent>
         </Card>
        )}

      </div>
    </div>
  )
}

