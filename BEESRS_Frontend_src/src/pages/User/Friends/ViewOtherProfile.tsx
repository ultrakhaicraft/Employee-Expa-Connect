import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ViewOtherUserProfile, SendFriendRequest } from '@/services/userService'
import { useToast } from '@/components/ui/use-toast'
import { useSelector } from 'react-redux'
import type { RootState } from '@/redux/store'
import {
  User,
  MapPin,
  Clock,
  Loader2,
  ShieldCheck,
  CheckCircle,
  XCircle,
  UserPlus,
  Sparkles,
  ArrowLeft,
  MapPinIcon
} from 'lucide-react'
import ViewCreatedPlacesByOthers from './ViewCreatedPlacesByOthers'

interface OtherUserProfile {
  userId: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  employeeId: string
  currentBranch: string
  jobTitle: string
  phoneNumber: string
  roleName: string
  emailVerified: boolean
  friendshipStatus?: 'Not friend' | 'Pending' | 'Friend'
  profile: {
    profileId: string
    userId: string
    homeCountry: string
    currentLocationCity: string
    currentLocationCountry: string
    currentBranch: string
    timezone: string
    dateFormat: string
    profilePictureUrl: string
    bio: string
    createdAt: string
    updatedAt: string
  }
}

type FriendshipStatus = 'none' | 'requested' | 'friend'

export default function ViewOtherProfile() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [profile, setProfile] = useState<OtherUserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingFriend, setIsAddingFriend] = useState(false)
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none')
  const [activeTab, setActiveTab] = useState('profile')

  const { decodedToken: _decodedToken } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (userId) {
      fetchProfile()
    }
  }, [userId])

  const mapFriendshipStatus = (status?: OtherUserProfile['friendshipStatus']): FriendshipStatus => {
    switch (status) {
      case 'Friend':
        return 'friend'
      case 'Pending':
        return 'requested'
      default:
        return 'none'
    }
  }

  const fetchProfile = async () => {
    if (!userId) return
    
    try {
      setIsLoading(true)
      const response = await ViewOtherUserProfile(userId)
      if (response?.data) {
        setProfile(response.data)
        setFriendshipStatus(mapFriendshipStatus(response.data.friendshipStatus))
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error)
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load user profile",
        variant: "destructive"
      })
      navigate(-1)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddFriend = async () => {
    if (!profile) return

    const currentStatus = friendshipStatus
    if (currentStatus === 'friend' || currentStatus === 'requested') {
      return
    }
    
    try {
      setIsAddingFriend(true)
      await SendFriendRequest(profile.userId)

      setFriendshipStatus('requested')
      setProfile(prev => prev ? { ...prev, friendshipStatus: 'Pending' } : prev)

      toast({
        title: "Friend Request Sent!",
        description: `Friend request sent to ${profile.fullName}`,
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
      setIsAddingFriend(false)
    }
  }

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <CardContent className="text-center">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">User ID Required</h2>
            <p className="text-gray-600 mb-4">Please provide a valid user ID to view profile.</p>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-12 h-12 text-blue-600" />
        </motion.div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <CardContent className="text-center">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
            <p className="text-gray-600 mb-4">Failed to load user profile</p>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const profileImageUrl = profile.profile?.profilePictureUrl || ''
  const currentLocationDisplay = [profile.profile?.currentLocationCity, profile.profile?.currentLocationCountry]
    .filter(Boolean)
    .join(', ')
  const homeLocationDisplay = profile.profile?.homeCountry || 'N/A'
  const timezoneDisplay = profile.profile?.timezone || 'N/A'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <style>{`
        /* Hide scrollbar globally */
        body {
          overflow-y: scroll;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        body::-webkit-scrollbar {
          display: none;
        }
        
        /* Scrollbar hide utility */
        .scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* Fix container scrolling */
        .view-other-profile-container {
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .view-other-profile-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      <div className="max-w-7xl mx-auto py-8 px-4 space-y-6 view-other-profile-container">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </motion.div>

        {/* Profile Header Section - Always Visible */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6"
        >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="relative w-24 h-24 rounded-full bg-slate-100 overflow-hidden ring-4 ring-blue-100">
                        {profileImageUrl ? (
                          <img
                            src={profileImageUrl}
                            alt={profile.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-10 h-10 text-blue-600" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-slate-900">{profile.fullName}</h2>
                        <p className="text-sm text-slate-500">{profile.jobTitle || 'No title provided'}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span>{currentLocationDisplay || 'Location not set'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                        {profile.roleName}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${profile.emailVerified ? 'border border-green-100 bg-green-50 text-green-700' : 'border border-amber-100 bg-amber-50 text-amber-700'}`}>
                        {profile.emailVerified ? <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> : <XCircle className="h-3.5 w-3.5 mr-1.5" />}
                        {profile.emailVerified ? 'Verified Email' : 'Email Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      className={`${
                        friendshipStatus === 'friend'
                          ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                          : friendshipStatus === 'requested'
                          ? 'bg-gray-400 hover:bg-gray-500'
                          : 'bg-blue-600 hover:bg-blue-700'
                      } text-white`}
                      onClick={handleAddFriend}
                      disabled={isAddingFriend || friendshipStatus === 'friend' || friendshipStatus === 'requested'}
                    >
                      {isAddingFriend ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : friendshipStatus === 'friend' ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Friend
                        </>
                      ) : friendshipStatus === 'requested' ? (
                        <>
                          <Clock className="w-4 h-4 mr-2" />
                          Requested
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Friend
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 min-h-[200px]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">About</p>
                      <p className="text-base font-semibold text-slate-900">Personal Bio</p>
                    </div>
                    <Sparkles className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                    {profile.profile?.bio || 'No bio available.'}
                  </p>
                </div>
              </div>
        </motion.section>

        {/* Tabs Navigation - Below Profile Card */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full mb-6 grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Information
            </TabsTrigger>
            <TabsTrigger value="places" className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4" />
              Created Places
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            {/* Information Cards */}
            <div className="grid gap-5 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="border border-slate-200 bg-white shadow-sm">
                  <div className="px-4 py-3 border-b bg-slate-50">
                    <h3 className="text-slate-900 text-base font-semibold">Personal Information</h3>
                  </div>
                  <CardContent className="p-0">
                    <dl className="divide-y divide-slate-100">
                      {[
                        { label: 'First Name', value: profile.firstName },
                        { label: 'Last Name', value: profile.lastName },
                        { label: 'Email', value: profile.email },
                        { label: 'Phone Number', value: profile.phoneNumber || 'N/A' },
                        { label: 'Home Country', value: homeLocationDisplay },
                        { label: 'Current Location', value: currentLocationDisplay || 'N/A' },
                        { label: 'Timezone', value: timezoneDisplay },
                      ].map(({ label, value }) => (
                        <div key={label} className="grid grid-cols-[140px_1fr] gap-4 px-4 py-3">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                          <dd className="text-sm font-medium text-slate-900 break-words">{value || 'N/A'}</dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="border border-slate-200 bg-white shadow-sm">
                  <div className="px-4 py-3 border-b bg-slate-50">
                    <h3 className="text-slate-900 text-base font-semibold">Work Information</h3>
                  </div>
                  <CardContent className="p-0">
                    <dl className="divide-y divide-slate-100">
                      {[
                        { label: 'Employee ID', value: profile.employeeId },
                        { label: 'Job Title', value: profile.jobTitle || 'N/A' },
                        { label: 'Current Branch', value: profile.currentBranch || 'N/A' },
                        { label: 'Email Verified', value: profile.emailVerified ? 'Yes' : 'No' },
                        { label: 'Role', value: profile.roleName },
                        { label: 'Member Since', value: profile.profile?.createdAt ? formatDateShort(profile.profile.createdAt) : 'N/A' },
                      ].map(({ label, value }) => (
                        <div key={label} className="grid grid-cols-[160px_1fr] gap-4 px-4 py-3">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                          <dd className="text-sm font-medium text-slate-900 break-words">{value || 'N/A'}</dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="places" className="scrollbar-hide">
            <ViewCreatedPlacesByOthers 
              userId={userId}
              showStandaloneHeader={false}
              className="scrollbar-hide"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
