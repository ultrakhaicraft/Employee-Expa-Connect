import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Building, CheckCircle, XCircle, MapPin, Edit3, Save, X, Camera, Upload, UserCircle, MapPin as MapPinIcon, Heart, ShieldCheck } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createPortal } from 'react-dom'
import { ViewProfile as ViewProfileAPI, UpdateProfile, CreateProfile, UpdateAvatarProfile } from '@/services/userService'
import ViewPreference from './ViewPreference/ViewPreference'
import { branchService, type Country as BranchCountry, type City as BranchCity } from '@/services/branchService'
import { updateUserProfile } from '@/redux/authSlice'
import PageTransition from '@/components/Transition/PageTransition'
import ViewPlaceCreated from './ViewPlace/ViewPlaceCreated'
import ViewLikedPlace from './ViewPlace/ViewLikedPlace'
// Removed moderator-specific imports; Moderator now has its own dashboard

interface ProfileDetails {
  homeCountry: string | null
  currentLocationCity: string | null
  currentLocationCountry: string | null
  timezone: string | null
  profilePictureUrl: string | null
  bio: string | null
}

interface UserProfile {
  userId: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  employeeId: string
  department: string
  currentBranch: string
  jobTitle: string
  phoneNumber: string
  roleName: string
  emailVerified: boolean
  profile: ProfileDetails
  profilePictureUrl: string // Optional for compatibility
}

export default function ViewProfile() {
  const dispatch = useDispatch()
  const authState = useSelector((state: any) => state.auth)
  const { user } = authState

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [updateSuccess, setUpdateSuccess] = useState('')
  const [isProfileCompletionModalOpen, setIsProfileCompletionModalOpen] = useState(false)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [profileCompletionError, setProfileCompletionError] = useState('')
  const [profileCompletionSuccess, setProfileCompletionSuccess] = useState('')
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [avatarSuccess, setAvatarSuccess] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('profile')

  // Location data states
  const [countries, setCountries] = useState<BranchCountry[]>([])
  const [currentCities, setCurrentCities] = useState<BranchCity[]>([])
  const [isLoadingCountries, setIsLoadingCountries] = useState(false)
  const [isLoadingCities, setIsLoadingCities] = useState(false)

  const [editFormData, setEditFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    department: '',
    jobTitle: '',
    phoneNumber: '',
    currentBranch: '',
    homeCountry: '',
    currentLocationCity: '',
    currentLocationCountry: '',
    timezone: '',
    bio: ''
  })

  const [profileCompletionFormData, setProfileCompletionFormData] = useState({
    homeCountry: '',
    currentLocationCity: '',
    currentLocationCountry: '',
    timezone: '',
    dateFormat: 'MM/dd/yyyy',
    bio: ''
  })

  const jobTitleOptions = [
    "Data Center",
    "Networking",
    "Cloud Computing",
    "Broadband and Wireless",
    "Storage",
    "Industrial",
    "Enterprise Software",
    "Mainframe",
    "Cybersecurity",
  ]

  const handleEditClick = async () => {
    if (userProfile) {

      // Ensure countries are loaded before opening modal
      let countriesData = countries
      if (countries.length === 0) {
        setIsLoadingCountries(true)
        try {
          countriesData = await branchService.getCountries()
          setCountries(countriesData)
        } catch (error) {
          console.error('Error loading countries:', error)
        } finally {
          setIsLoadingCountries(false)
        }
      }

      setEditFormData({
        email: userProfile.email,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        department: userProfile.department,
        jobTitle: userProfile.jobTitle,
        phoneNumber: userProfile.phoneNumber || '',
        currentBranch: userProfile.currentBranch || '',
        homeCountry: userProfile.profile?.homeCountry || '',
        currentLocationCity: userProfile.profile?.currentLocationCity || '',
        currentLocationCountry: userProfile.profile?.currentLocationCountry || '',
        timezone: userProfile.profile?.timezone || '',
        bio: userProfile.profile?.bio || '',
      })

      // Load cities if there's an existing current country
      if (userProfile.profile?.currentLocationCountry) {
        const country = countriesData.find(c => c.name === userProfile.profile?.currentLocationCountry)
        if (country) {
          await loadCurrentCities(country.countryId)
        }
      }

      setIsEditModalOpen(true)
      setUpdateError('')
      setUpdateSuccess('')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Load countries on component mount
  const loadCountries = async () => {
    setIsLoadingCountries(true)
    try {
      const countriesData = await branchService.getCountries()
      setCountries(countriesData)
    } catch (error) {
      console.error('Error loading countries:', error)
    } finally {
      setIsLoadingCountries(false)
    }
  }

  // Load cities for current country
  const loadCurrentCities = async (countryId: string) => {
    if (!countryId) {
      setCurrentCities([])
      return
    }

    setIsLoadingCities(true)
    try {
      const citiesData = await branchService.getCities(countryId)
      setCurrentCities(citiesData)
    } catch (error) {
      console.error('Error loading current cities:', error)
    } finally {
      setIsLoadingCities(false)
    }
  }

  // Handle home country change
  const handleHomeCountryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryId = e.target.value
    const country = countries.find(c => c.countryId === countryId)

    setEditFormData(prev => ({
      ...prev,
      homeCountry: country?.name || ''
      // No timezone auto-fill for home country
    }))
  }

  // Handle current country change
  const handleCurrentCountryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryId = e.target.value
    const country = countries.find(c => c.countryId === countryId)

    setEditFormData(prev => ({
      ...prev,
      currentLocationCountry: country?.name || '',
      currentLocationCity: '', // Reset city when country changes
      timezone: country?.timeZone || '' // Auto-fill timezone from country
    }))

    await loadCurrentCities(countryId)
  }

  // Handle current city change
  const handleCurrentCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityName = e.target.value
    const city = currentCities.find(c => c.name === cityName)
    const country = countries.find(c => c.countryId === city?.countryId)

    setEditFormData(prev => ({
      ...prev,
      currentLocationCity: cityName,
      timezone: country?.timeZone || prev.timezone // Use country timezone since cities don't have timezone
    }))
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile) return

    setIsUpdating(true)
    setUpdateError('')
    setUpdateSuccess('')

    try {
      const response = await UpdateProfile(userProfile.userId, editFormData)
      if (response.success) {
        setUpdateSuccess('Profile updated successfully!')
        // Refresh profile data
        const updatedProfile = await ViewProfileAPI()
        if (updatedProfile.success && updatedProfile.data) {
          setUserProfile(updatedProfile.data)
          updateReduxUserProfile(updatedProfile.data)
        }
        setTimeout(() => {
          setIsEditModalOpen(false)
          setUpdateSuccess('')
        }, 1500)
      } else {
        setUpdateError(response.message || 'Failed to update profile')
      }
    } catch (error: any) {
      setUpdateError(error.response?.data?.message || error.message || 'Failed to update profile')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCloseModal = () => {
    setIsEditModalOpen(false)
    setUpdateError('')
    setUpdateSuccess('')
  }

  const handleProfileCompletionInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setProfileCompletionFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle profile completion home country change
  const handleProfileCompletionHomeCountryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryId = e.target.value
    const country = countries.find(c => c.countryId === countryId)

    setProfileCompletionFormData(prev => ({
      ...prev,
      homeCountry: country?.name || ''
      // No timezone auto-fill for home country
    }))
  }

  // Handle profile completion current country change
  const handleProfileCompletionCurrentCountryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryId = e.target.value
    const country = countries.find(c => c.countryId === countryId)

    setProfileCompletionFormData(prev => ({
      ...prev,
      currentLocationCountry: country?.name || '',
      currentLocationCity: '', // Reset city when country changes
      timezone: country?.timeZone || '' // Auto-fill timezone from country
    }))

    await loadCurrentCities(countryId)
  }

  // Handle profile completion current city change
  const handleProfileCompletionCurrentCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityName = e.target.value
    const city = currentCities.find(c => c.name === cityName)
    const country = countries.find(c => c.countryId === city?.countryId)

    setProfileCompletionFormData(prev => ({
      ...prev,
      currentLocationCity: cityName,
      timezone: country?.timeZone || prev.timezone // Use country timezone since cities don't have timezone
    }))
  }

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    // Get userId from Redux store, userProfile, or localStorage
    let userId = user?.userId || userProfile?.userId

    if (!userId) {
      // Try to get from localStorage as fallback
      // Try persist:root (Redux Persist)
      const persistRoot = localStorage.getItem('persist:root')
      if (persistRoot) {
        try {
          const parsedPersist = JSON.parse(persistRoot)

          if (parsedPersist.auth) {
            const authData = JSON.parse(parsedPersist.auth)

            // Try to get userId from decodedToken
            if (authData.decodedToken) {
              userId = authData.decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
            }

            // Fallback to other fields
            if (!userId) {
              userId = authData.user?.userId || authData.user?.id || authData.user?.user_id
            }
          }
        } catch (error) {
          console.error('Error parsing persist:root:', error)
        }
      }

      // Try other common localStorage keys
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        userId = parsedUser.userId
      }
    }

    // Try alternative field names
    if (!userId) {
      userId = (user as any)?.id || (user as any)?.user_id
    }

    if (!userId) {
      console.error('No userId found anywhere')
      setProfileCompletionError('User ID not found. Please login again.')
      return
    }

    setIsCreatingProfile(true)
    setProfileCompletionError('')
    setProfileCompletionSuccess('')

    try {
      const profileData = {
        userId: userId,
        homeCountry: profileCompletionFormData.homeCountry,
        currentLocationCity: profileCompletionFormData.currentLocationCity,
        currentLocationCountry: profileCompletionFormData.currentLocationCountry,
        timezone: profileCompletionFormData.timezone,
        dateFormat: profileCompletionFormData.dateFormat,
        bio: profileCompletionFormData.bio
      }

      const response = await CreateProfile(profileData)

      if (response.success) {
        setProfileCompletionSuccess('Profile completed successfully!')
        setProfileCompletionError('')

        // Close modal first
        setIsProfileCompletionModalOpen(false)
        setProfileCompletionSuccess('')

        // Then refresh the page or refetch profile
        setTimeout(async () => {
          try {
            const updatedProfile = await ViewProfileAPI()
            if (updatedProfile.success && updatedProfile.data) {
              setUserProfile(updatedProfile.data)
              updateReduxUserProfile(updatedProfile.data)
              setError('') // Clear any error state

              // Ensure modal stays closed after successful profile creation
              setIsProfileCompletionModalOpen(false)
            }
          } catch (refreshError) {
            console.error('Error refreshing profile:', refreshError)
            // Just refresh the page to ensure clean state
            window.location.reload()
          }
        }, 1500)
      } else {
        setProfileCompletionError(response.message || 'Failed to complete profile')
        setProfileCompletionSuccess('')
      }
    } catch (error: any) {
      console.error('Error creating profile:', error)
      console.error('Error response:', error.response)
      setProfileCompletionError(error.response?.data?.message || error.message || 'Failed to complete profile')
      setProfileCompletionSuccess('')
    } finally {
      setIsCreatingProfile(false)
    }
  }

  const handleCloseProfileCompletionModal = () => {
    setIsProfileCompletionModalOpen(false)
    setProfileCompletionError('')
    setProfileCompletionSuccess('')
  }

  const handleAvatarClick = () => {
    setIsAvatarModalOpen(true)
    setAvatarError('')
    setAvatarSuccess('')
    setSelectedFile(null)
    setPreviewUrl(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setAvatarError('Please select an image file')
        return
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setAvatarError('File size must be less than 5MB')
        return
      }

      setSelectedFile(file)
      setAvatarError('')

      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleUploadAvatar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile || !selectedFile) return

    setIsUploadingAvatar(true)
    setAvatarError('')
    setAvatarSuccess('')

    try {
      const response = await UpdateAvatarProfile(userProfile.userId, selectedFile)

      if (response.success) {
        setAvatarSuccess('Avatar updated successfully!')
        // Refresh profile data
        const updatedProfile = await ViewProfileAPI()
        if (updatedProfile.success && updatedProfile.data) {
          // Add timestamp to force image refresh
          if (updatedProfile.data.profile?.profilePictureUrl) {
            const separator = updatedProfile.data.profile.profilePictureUrl.includes('?') ? '&' : '?'
            updatedProfile.data.profile.profilePictureUrl += `${separator}t=${Date.now()}`
          }
          setUserProfile(updatedProfile.data)
          updateReduxUserProfile(updatedProfile.data)
        }
        // Clear file selection and preview
        setSelectedFile(null)
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
          setPreviewUrl(null)
        }
        setTimeout(() => {
          setIsAvatarModalOpen(false)
          setAvatarSuccess('')
        }, 1500)
      } else {
        setAvatarError(response.message || 'Failed to update avatar')
      }
    } catch (error: any) {
      setAvatarError(error.response?.data?.message || error.message || 'Failed to update avatar')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleCloseAvatarModal = () => {
    setIsAvatarModalOpen(false)
    setAvatarError('')
    setAvatarSuccess('')
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }


  // Check if profile needs completion
  const needsProfileCompletion = () => {
    if (!userProfile?.profile) return true

    const { homeCountry, currentLocationCity, currentLocationCountry, timezone } = userProfile.profile

    // Profile needs completion if any field is missing or 'N/A'
    const needsCompletion = !homeCountry || homeCountry === 'N/A' ||
      !currentLocationCity || currentLocationCity === 'N/A' ||
      !currentLocationCountry || currentLocationCountry === 'N/A' ||
      !timezone || timezone === 'N/A'

    return needsCompletion
  }


  // Update Redux store with user profile data
  const updateReduxUserProfile = (profile: UserProfile) => {
    dispatch(updateUserProfile({
      firstName: profile.firstName,
      lastName: profile.lastName,
      fullName: profile.fullName,
      profilePictureUrl: profile.profile?.profilePictureUrl || null
    }))
  }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        const response = await ViewProfileAPI()
        if (response.success && response.data) {
          const profileData = response.data
          setUserProfile(profileData)
          updateReduxUserProfile(profileData)

          // Check if profile needs completion after setting state
          // Use setTimeout to ensure state is updated
          setTimeout(() => {
            const needsCompletion = !profileData.profile ||
              !profileData.profile.homeCountry || profileData.profile.homeCountry === 'N/A' ||
              !profileData.profile.currentLocationCity || profileData.profile.currentLocationCity === 'N/A' ||
              !profileData.profile.currentLocationCountry || profileData.profile.currentLocationCountry === 'N/A' ||
              !profileData.profile.timezone || profileData.profile.timezone === 'N/A'

            if (needsCompletion) {
              setIsProfileCompletionModalOpen(true)
            } else {
              setIsProfileCompletionModalOpen(false)
            }
          }, 100)
        } else {
          // If profile doesn't exist (404), open completion modal
          setIsProfileCompletionModalOpen(true)
        }
      } catch (error: any) {
        console.error('Error fetching profile:', error)

        // If 404 or profile not found, show completion modal instead of error
        if (error.response?.status === 404 || error.response?.status === 400) {
          setIsProfileCompletionModalOpen(true)
          setIsLoading(false)
          return
        }

        // Only set error for non-404 errors
        setError(error.response?.data?.message || 'Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    const initializeData = async () => {
      await fetchProfile()
      await loadCountries() // Load countries on component mount
    }

    initializeData()
  }, [])

  // Check for profile completion when user visits profile page
  useEffect(() => {
    if (userProfile) {
      const needsCompletion = needsProfileCompletion()

      if (needsCompletion) {
        setIsProfileCompletionModalOpen(true)
      } else {
        setIsProfileCompletionModalOpen(false)
      }
    }
  }, [userProfile])



  // Disable body scroll when modals are open
  useEffect(() => {
    if (isEditModalOpen || isProfileCompletionModalOpen || isAvatarModalOpen) {
      // Store the current scroll position
      const scrollY = window.scrollY

      // Disable body scroll
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'

      return () => {
        // Re-enable body scroll
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''

        // Restore scroll position
        window.scrollTo(0, scrollY)
      }
    }
  }, [isEditModalOpen, isProfileCompletionModalOpen, isAvatarModalOpen])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && !isProfileCompletionModalOpen) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
        {error}
      </div>
    )
  }

  // Show placeholder UI when profile is being completed
  if (!userProfile && !isLoading && !error) {
    return (
      <>
        <PageTransition delayMs={100} durationMs={600} variant="zoom">
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-600 mt-1">Welcome! Please complete your profile to get started</p>
            </div>

            <Card>
              <CardContent className="py-12 text-center">
                <UserCircle className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Incomplete</h2>
                <p className="text-gray-600 mb-6">Please complete your profile to continue</p>
                <Button onClick={() => setIsProfileCompletionModalOpen(true)}>
                  Complete Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>


      </>
    )
  }

  // Final check - userProfile should exist at this point
  if (!userProfile) {
    return null
  }

  const profileImageUrl = userProfile?.profile?.profilePictureUrl || userProfile?.profilePictureUrl || ''
  const currentLocationDisplay = [userProfile.profile?.currentLocationCity, userProfile.profile?.currentLocationCountry]
    .filter(Boolean)
    .join(', ')
  const homeLocationDisplay = userProfile.profile?.homeCountry || 'N/A'
  const timezoneDisplay = userProfile.profile?.timezone || 'N/A'

  return (
    <>
      <PageTransition delayMs={100} durationMs={600} variant="zoom">
        <div>
          {/* <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-1">Manage your personal and work information</p>
          </div> */}

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full mb-6 grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                Personal Information
              </TabsTrigger>
              <TabsTrigger value="places" className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4" />
                Created Places
              </TabsTrigger>
              <TabsTrigger value="liked" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Liked Places
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                      <div className="flex gap-4">
                        <div
                          className="relative w-24 h-24 rounded-full bg-slate-100 overflow-hidden ring-4 ring-blue-100 cursor-pointer"
                          onClick={handleAvatarClick}
                        >
                          {profileImageUrl ? (
                            <img
                              src={profileImageUrl}
                              alt={userProfile.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-10 h-10 text-blue-600" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                            <Camera className="w-5 h-5 text-white opacity-0 hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-2xl font-semibold text-slate-900">{userProfile.fullName}</h2>
                          <p className="text-sm text-slate-500">{userProfile.jobTitle || 'No title provided'}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <MapPin className="w-4 h-4 text-blue-600" />
                            <span>{currentLocationDisplay || 'Location not set'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                          {userProfile.roleName}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${userProfile.emailVerified ? 'border border-green-100 bg-green-50 text-green-700' : 'border border-amber-100 bg-amber-50 text-amber-700'}`}>
                          {userProfile.emailVerified ? <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> : <XCircle className="h-3.5 w-3.5 mr-1.5" />}
                          {userProfile.emailVerified ? 'Verified Email' : 'Email Pending'}
                        </span>
                      </div>
                    </div>

                    {/* <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        { label: 'Email Address', value: userProfile.email },
                        { label: 'Phone Number', value: userProfile.phoneNumber || 'N/A' },
                        { label: 'Employee ID', value: userProfile.employeeId },
                        { label: 'Current Branch', value: userProfile.currentBranch || 'N/A' },
                        { label: 'Home Country', value: homeLocationDisplay },
                        { label: 'Current Location', value: currentLocationDisplay || 'N/A' },
                        { label: 'Timezone', value: timezoneDisplay },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl border border-slate-200 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900 break-words">{value}</p>
                        </div>
                      ))}
                    </dl> */}

                    <div className="flex flex-wrap gap-3">
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleEditClick}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAvatarClick}
                        className="border-slate-200 text-slate-700 hover:bg-gray-300"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Update Avatar
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 min-h-[200px]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">About you</p>
                        <p className="text-base font-semibold text-slate-900">Personal Bio</p>
                      </div>
                      <UserCircle className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                      {userProfile.profile?.bio || 'Share more about yourself so teammates can connect with you.'}
                    </p>
                  </div>
                </div>
              </section>

              <div className="grid gap-5 lg:grid-cols-2">
                <Card className="border border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-slate-900 text-base font-semibold">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <dl className="divide-y divide-slate-100">
                      {[
                        { label: 'First Name', value: userProfile.firstName },
                        { label: 'Last Name', value: userProfile.lastName },
                        { label: 'Email', value: userProfile.email },
                        { label: 'Phone Number', value: userProfile.phoneNumber || 'N/A' },
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

                <Card className="border border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-slate-900 text-base font-semibold">Work Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <dl className="divide-y divide-slate-100">
                      {[
                        { label: 'Employee ID', value: userProfile.employeeId },
                        { label: 'Job Title', value: userProfile.jobTitle || 'N/A' },
                        { label: 'Current Branch', value: userProfile.currentBranch || 'N/A' },
                        { label: 'Email Verified', value: userProfile.emailVerified ? 'Yes' : 'No' },
                        { label: 'Profile Status', value: needsProfileCompletion() ? 'Incomplete' : 'Complete' },
                        { label: 'Role', value: userProfile.roleName },                      
                      ].map(({ label, value }) => (
                        <div key={label} className="grid grid-cols-[160px_1fr] gap-4 px-4 py-3">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                          <dd className="text-sm font-medium text-slate-900 break-words">{value || 'N/A'}</dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-5">
                <ViewPreference />
              </div>
            </TabsContent>

            <TabsContent value="places">
              <ViewPlaceCreated />
            </TabsContent>
            <TabsContent value="liked">
              <ViewLikedPlace />
            </TabsContent>
          </Tabs>
        </div>

        {/* Edit Profile Modal - Rendered via Portal */}
        {isEditModalOpen && createPortal(
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4"
            style={{
              zIndex: 999999,
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh'
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 rounded-md">
                      <Edit3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Edit Profile</h2>
                      <p className="text-blue-100 text-xs">Update your personal information</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="text-white/80 hover:text-white hover:bg-white/20 transition-all duration-200 rounded-full p-1.5"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="overflow-y-auto scrollbar-hide max-h-[calc(85vh-120px)]">
                <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
                  {/* Personal Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <User className="w-4 h-4 text-blue-600" />
                      <h3 className="text-base font-semibold text-gray-900">Personal Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="firstName" className="text-xs font-medium text-gray-700">First Name *</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={editFormData.firstName}
                          onChange={handleInputChange}
                          required
                          className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="lastName" className="text-xs font-medium text-gray-700">Last Name *</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={editFormData.lastName}
                          onChange={handleInputChange}
                          required
                          className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="email" className="text-xs font-medium text-gray-700">Email Address *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={editFormData.email}
                          readOnly
                          required
                          className="h-9 border-gray-300 bg-gray-100 opacity-70 cursor-not-allowed text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="phoneNumber" className="text-xs font-medium text-gray-700">Phone Number</Label>
                        <Input
                          id="phoneNumber"
                          name="phoneNumber"
                          value={editFormData.phoneNumber}
                          onChange={handleInputChange}
                          className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 text-sm"
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Work Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <Building className="w-4 h-4 text-blue-600" />
                      <h3 className="text-base font-semibold text-gray-900">Work Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1 md:col-span-2">
                        <Label htmlFor="jobTitle" className="text-xs font-medium text-gray-700">Job Title *</Label>
                        <select
                          id="jobTitle"
                          name="jobTitle"
                          value={editFormData.jobTitle}
                          onChange={handleInputChange}
                          required
                          className="w-full h-9 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
                        >
                          <option value="">Select Job Title</option>
                          {jobTitleOptions.map((title) => (
                            <option key={title} value={title}>
                              {title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Location Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <h3 className="text-base font-semibold text-gray-900">Location Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="homeCountry" className="text-xs font-medium text-gray-700">Home Country</Label>
                        <select
                          id="homeCountry"
                          name="homeCountry"
                          value={countries.find(c => c.name === editFormData.homeCountry)?.countryId || ''}
                          onChange={handleHomeCountryChange}
                          className="w-full h-9 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
                          disabled={isLoadingCountries}
                        >
                          <option value="">
                            {isLoadingCountries ? 'Loading countries...' : 'Select Home Country'}
                          </option>
                          {countries.map((country) => (
                            <option key={country.countryId} value={country.countryId}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="currentLocationCountry" className="text-xs font-medium text-gray-700">Current Country</Label>
                        <select
                          id="currentLocationCountry"
                          name="currentLocationCountry"
                          value={countries.find(c => c.name === editFormData.currentLocationCountry)?.countryId || ''}
                          onChange={handleCurrentCountryChange}
                          className="w-full h-9 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
                          disabled={isLoadingCountries}
                        >
                          <option value="">
                            {isLoadingCountries ? 'Loading countries...' : 'Select Current Country'}
                          </option>
                          {countries.map((country) => (
                            <option key={country.countryId} value={country.countryId}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="currentLocationCity" className="text-xs font-medium text-gray-700">Current City</Label>
                        <select
                          id="currentLocationCity"
                          name="currentLocationCity"
                          value={editFormData.currentLocationCity}
                          onChange={handleCurrentCityChange}
                          className="w-full h-9 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
                          disabled={!editFormData.currentLocationCountry || isLoadingCities}
                        >
                          <option value="">Select Current City</option>
                          {currentCities.map((city) => (
                            <option key={city.name} value={city.name}>
                              {city.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="timezone" className="text-xs font-medium text-gray-700">Timezone</Label>
                        <Input
                          id="timezone"
                          name="timezone"
                          value={editFormData.timezone}
                          onChange={handleInputChange}
                          className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 text-sm"
                          placeholder="Auto-filled based on city selection"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bio Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <UserCircle className="w-4 h-4 text-blue-600" />
                      <h3 className="text-base font-semibold text-gray-900">About You</h3>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="bio" className="text-xs font-medium text-gray-700">Bio</Label>
                      <textarea
                        id="bio"
                        name="bio"
                        value={editFormData.bio}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all duration-200 text-sm"
                        placeholder="Tell us about yourself, your interests, and what you do..."
                      />
                    </div>
                  </div>

                  {/* Status Messages */}
                  {updateError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-300">
                      <XCircle className="w-4 h-4" />
                      {updateError}
                    </div>
                  )}

                  {updateSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-300">
                      <CheckCircle className="w-4 h-4" />
                      {updateSuccess}
                    </div>
                  )}
                </form>
              </div>

              {/* Footer Actions */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border-gray-300 text-gray hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 text-sm hover:text-gray-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUpdating}
                    onClick={handleUpdateProfile}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 text-sm"
                  >
                    {isUpdating ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="w-3 h-3" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}


        {/* Avatar Upload Modal - Rendered via Portal */}
        {isAvatarModalOpen && createPortal(
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4"
            style={{
              zIndex: 999999,
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh'
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-xl font-semibold">Update Avatar</h2>
                  <p className="text-gray-600 text-sm mt-1">Choose a new profile picture</p>
                </div>
                <button
                  onClick={handleCloseAvatarModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200 hover:bg-gray-100 rounded-full p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUploadAvatar} className="p-6 space-y-6">
                {/* Preview Section */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-32 h-32 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : userProfile?.profile?.profilePictureUrl ? (
                      <img
                        src={userProfile.profile.profilePictureUrl}
                        alt="Current"
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                        onLoad={() => {
                          const fallback = document.querySelector('.modal-fallback-icon')
                          if (fallback) {
                            fallback.classList.add('hidden')
                          }
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const fallback = e.currentTarget.parentElement?.querySelector('.modal-fallback-icon')
                          if (fallback) {
                            fallback.classList.remove('hidden')
                          }
                        }}
                      />
                    ) : null}
                    <User size={48} className={`text-gray-400 ${previewUrl || userProfile?.profile?.profilePictureUrl ? 'hidden modal-fallback-icon' : ''}`} />
                  </div>

                  <div className="text-center">
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <div className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                        <Upload className="w-4 h-4" />
                        <span>Choose Image</span>
                      </div>
                    </Label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF. Max size 5MB.</p>
                  </div>
                </div>

                {avatarError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {avatarError}
                  </div>

                )}

                {avatarSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {avatarSuccess}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseAvatarModal}
                    disabled={isUploadingAvatar}
                    className="transition-all duration-200 hover:scale-105 text-gray-700 hover:text-gray-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUploadingAvatar || !selectedFile}
                    className="transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:opacity-70"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:rotate-12" />
                        Update Avatar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      </PageTransition>

      {/* Profile Completion Modal - Always available */}
      {isProfileCompletionModalOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseProfileCompletionModal()
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              width: '100%',
              maxWidth: '512px',
              maxHeight: '90vh',
              overflow: 'hidden'
            }}
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold">Complete Your Profile</h2>
                <p className="text-gray-600 text-sm mt-1">Please provide your location and timezone information to complete your profile.</p>
              </div>
              <button
                onClick={handleCloseProfileCompletionModal}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200 hover:bg-gray-100 rounded-full p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateProfile} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="homeCountry">Home Country *</Label>
                  <select
                    id="homeCountry"
                    name="homeCountry"
                    value={countries.find(c => c.name === profileCompletionFormData.homeCountry)?.countryId || ''}
                    onChange={handleProfileCompletionHomeCountryChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoadingCountries}
                  >
                    <option value="">Select Home Country</option>
                    {countries.map((country) => (
                      <option key={country.countryId} value={country.countryId}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="currentLocationCountry">Current Country *</Label>
                  <select
                    id="currentLocationCountry"
                    name="currentLocationCountry"
                    value={countries.find(c => c.name === profileCompletionFormData.currentLocationCountry)?.countryId || ''}
                    onChange={handleProfileCompletionCurrentCountryChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoadingCountries}
                  >
                    <option value="">Select Current Country</option>
                    {countries.map((country) => (
                      <option key={country.countryId} value={country.countryId}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="currentLocationCity">Current City *</Label>
                  <select
                    id="currentLocationCity"
                    name="currentLocationCity"
                    value={profileCompletionFormData.currentLocationCity}
                    onChange={handleProfileCompletionCurrentCityChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!profileCompletionFormData.currentLocationCountry || isLoadingCities}
                  >
                    <option value="">Select Current City</option>
                    {currentCities.map((city) => (
                      <option key={city.name} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone *</Label>
                  <Input
                    id="timezone"
                    name="timezone"
                    value={profileCompletionFormData.timezone}
                    onChange={handleProfileCompletionInputChange}
                    required
                    placeholder="Auto-filled based on city selection"
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <select
                    id="dateFormat"
                    name="dateFormat"
                    value={profileCompletionFormData.dateFormat}
                    onChange={handleProfileCompletionInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="MM/dd/yyyy">MM/dd/yyyy</option>
                    <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                    <option value="yyyy-MM-dd">yyyy-MM-dd</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={profileCompletionFormData.bio}
                    onChange={handleProfileCompletionInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>

              {profileCompletionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {profileCompletionError}
                </div>
              )}

              {profileCompletionSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {profileCompletionSuccess}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseProfileCompletionModal}
                  disabled={isCreatingProfile}
                  className="transition-all duration-200 hover:scale-105 text-gray-700 hover:text-gray-100"
                >
                  Skip for now
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingProfile}
                  className="transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:opacity-70"
                >
                  {isCreatingProfile ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Completing...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:rotate-12" />
                      Complete Profile
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </>
  )
}