import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Heart, 
  Star, 
  MapPin, 
  Clock, 
  DollarSign,
  MessageCircle,
  MoreVertical,
  Phone,
  Globe,
  Mail,
  Users,
  Calendar,
  ZoomIn,
  X,
  Edit3,
  Flag,
  Bookmark,
  BookmarkCheck,
  Trash2,
  RefreshCcw
} from 'lucide-react'
import { motion } from 'framer-motion'
import { colors } from '@/lib/colors'
import { ViewAllLikePlace, UnlikePlace, SavePlaces, UnsavePlaces } from '@/services/userService'
import { DeletePlace } from '@/services/moderatorService'
import { useToast } from '@/components/ui/use-toast'
import PlaceReviewModal from '../../../public/Home/components/PlaceReviewModal'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useSelector } from 'react-redux'
import EditPlaceModal, {type EditablePlaceDetail } from '@/pages/User/Place/EditPlaceModal'
import ReportPlaceModal from '@/components/PlaceReport/ReportPlaceModal'
import ViewOnMap from '@/pages/User/Place/MapModal/ViewOnMap'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { convertUtcToLocalTime } from '@/utils/timezone'

interface PlaceImage {
  imageId: string
  imageUrl: string
  altText: string
}

interface PlaceDetail {
  placeId: string
  googlePlaceId: string
  name: string
  description: string
  categoryName: string
  addressLine1: string
  openTime: string
  closeTime: string
  city: string
  stateProvince: string
  phoneNumber: string
  websiteUrl: string
  email: string
  bestTimeToVisit: string
  busyTime: string
  suitableFor: string
  priceLevel: number | null
  averageRating: number
  totalReviews: number
  totalLikes: number
  verificationStatus: string
  createdBy: string
  createdByAvatar: string
  createdByUserId?: string | null
  createdAt: string
  updatedAt: string
  verifiedAt: string
  imageUrls: PlaceImage[]
  latitude?: number
  longitude?: number
  isSavedByCurrentUser?: boolean
}

interface Review {
  isReviewByCurrentUser: boolean
  isHelpfulByCurrentUser: boolean
  reviewId: string
  placeId: string
  name: string
  userId: string
  fullName: string
  profilePictureUrl: string | null
  reviewText: string
  overallRating: number
  foodQualityRating: number
  serviceRating: number
  atmosphereRating: number
  priceLevelRating: number
  helpfulVotes: number
  visitDate: string
  visitType: string
  isFlagged: boolean
  moderationStatus: string
  moderationReason: string | null
  createdAt: string
  updatedAt: string
  reviewImageUrls: string[]
}

interface LikedPlace {
  placeDetail: PlaceDetail
  reviews: Review[]
}

function ViewLikedPlace() {
  const navigate = useNavigate()
  const [likedPlaces, setLikedPlaces] = useState<LikedPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<{placeId: string, placeName: string} | null>(null)
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false)
  const [unlikingPlaces, setUnlikingPlaces] = useState<Set<string>>(new Set())
  const [likeCounts, setLikeCounts] = useState<{[key: string]: number}>({})
  const [previewImage, setPreviewImage] = useState<PlaceImage | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null)
  const [editingInitialData, setEditingInitialData] = useState<EditablePlaceDetail | null>(null)
  const [reportingPlace, setReportingPlace] = useState<{ placeId: string; placeName: string } | null>(null)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isViewOnMapOpen, setIsViewOnMapOpen] = useState(false)
  const [selectedPlaceForMap, setSelectedPlaceForMap] = useState<{ placeId?: string; placeName: string; latitude: number; longitude: number; address?: string } | null>(null)
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({})
  const [savingPlaces, setSavingPlaces] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<{ placeId: string; placeName: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [visibleCount, setVisibleCount] = useState(10)
  const [isPaginating, setIsPaginating] = useState(false)
  const [activeImageIndices, setActiveImageIndices] = useState<Record<string, number>>({})
  const paginationTimeoutRef = useRef<number | null>(null)
  const { toast } = useToast()
  const authState = useSelector((state: any) => state.auth)
  const loggedInUser = authState?.user || authState?.userProfile || {}

  const visibleLikedPlaces = useMemo(
    () => likedPlaces.slice(0, visibleCount),
    [likedPlaces, visibleCount]
  )
  const hasMorePlaces = visibleCount < likedPlaces.length

  const fetchLikedPlaces = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await ViewAllLikePlace()
      // Handle both cases: empty array or no items property
      const places = response.items || response || []
      const likedPlacesArray = Array.isArray(places) ? places : []
      setLikedPlaces(likedPlacesArray)
      setVisibleCount(Math.min(10, likedPlacesArray.length))
      setActiveImageIndices({})

      const cachedSaved = localStorage.getItem('savedPlaces')
      const cachedIds = cachedSaved ? new Set<string>(JSON.parse(cachedSaved)) : new Set<string>()
      const initialSavedStatus: Record<string, boolean> = {}
      likedPlacesArray.forEach((entry: LikedPlace) => {
        const placeId = entry.placeDetail.placeId
        const isSaved = cachedIds.has(placeId) || Boolean(entry.placeDetail.isSavedByCurrentUser)
        initialSavedStatus[placeId] = isSaved
      })
      setSavedStatus(initialSavedStatus)
      
      // Initialize like counts - ensure minimum count of 1 for liked places
      const initialLikeCounts: {[key: string]: number} = {}
      likedPlacesArray.forEach((place: LikedPlace) => {
        const placeId = place.placeDetail.placeId
        const serverLikeCount = place.placeDetail.totalLikes
        
        // If this place is in liked places, ensure minimum count of 1
        initialLikeCounts[placeId] = Math.max(1, serverLikeCount)
      })
      setLikeCounts(initialLikeCounts)
    } catch (err: any) {
      console.error('Error fetching liked places:', err)
      // If it's a 404 or empty response, treat as no liked places instead of error
      if (err.response?.status === 404 || err.response?.status === 204) {
        setLikedPlaces([])
        setLikeCounts({})
        setError(null)
      } else {
        setError('Failed to load liked places')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLikedPlaces()
  }, [fetchLikedPlaces])

  const handleLoadMore = useCallback(() => {
    if (isPaginating || !hasMorePlaces) return
    setIsPaginating(true)
    if (paginationTimeoutRef.current) {
      window.clearTimeout(paginationTimeoutRef.current)
    }
    paginationTimeoutRef.current = window.setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 10, likedPlaces.length))
      setIsPaginating(false)
      paginationTimeoutRef.current = null
    }, 600)
  }, [hasMorePlaces, isPaginating, likedPlaces.length])

  useEffect(() => {
    const onScroll = () => {
      if (!hasMorePlaces || loading) return
      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200
      if (scrolledToBottom) {
        handleLoadMore()
      }
    }
    window.addEventListener('scroll', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [handleLoadMore, hasMorePlaces, loading])

  useEffect(() => {
    return () => {
      if (paginationTimeoutRef.current) {
        window.clearTimeout(paginationTimeoutRef.current)
      }
    }
  }, [])

  const handleViewReviews = (place: LikedPlace) => {
    setSelectedPlace({
      placeId: place.placeDetail.placeId,
      placeName: place.placeDetail.name
    })
    setIsReviewsModalOpen(true)
  }

  const updateSavedCache = (placeId: string, shouldSave: boolean) => {
    const cached = localStorage.getItem('savedPlaces')
    const savedIds = cached ? new Set<string>(JSON.parse(cached)) : new Set<string>()
    if (shouldSave) {
      savedIds.add(placeId)
    } else {
      savedIds.delete(placeId)
    }
    localStorage.setItem('savedPlaces', JSON.stringify(Array.from(savedIds)))
  }

  const removeIdFromLocalStorageList = (key: string, placeId: string) => {
    const cached = localStorage.getItem(key)
    if (!cached) return
    try {
      const ids: string[] = JSON.parse(cached)
      const updated = ids.filter((id) => id !== placeId)
      localStorage.setItem(key, JSON.stringify(updated))
    } catch (error) {
      console.error(`Failed to update ${key} cache:`, error)
    }
  }

  const handleToggleSave = async (place: PlaceDetail) => {
    const placeId = place.placeId
    if (!placeId) return
    if (savingPlaces.has(placeId)) return

    setSavingPlaces(prev => new Set(prev).add(placeId))
    try {
      if (savedStatus[placeId]) {
        await UnsavePlaces(placeId)
        setSavedStatus(prev => ({ ...prev, [placeId]: false }))
        updateSavedCache(placeId, false)
        toast({
          title: 'Removed',
          description: `Removed ${place.name} from saved places.`,
        })
      } else {
        await SavePlaces(placeId)
        setSavedStatus(prev => ({ ...prev, [placeId]: true }))
        updateSavedCache(placeId, true)
        toast({
          title: 'Saved',
          description: `${place.name} has been added to saved places.`,
        })
      }
    } catch (error: any) {
      console.error('Error toggling saved place:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update saved place',
        variant: 'destructive'
      })
    } finally {
      setSavingPlaces(prev => {
        const copy = new Set(prev)
        copy.delete(placeId)
        return copy
      })
    }
  }

  const handleUnlike = async (placeId: string, placeName: string) => {
    try {
      setUnlikingPlaces(prev => new Set(prev).add(placeId))
      await UnlikePlace(placeId)
      
      setLikedPlaces(prev => prev.filter(place => place.placeDetail.placeId !== placeId))
      
      // Update like count - decrease by 1 but don't go below 0
      setLikeCounts(prev => ({
        ...prev,
        [placeId]: Math.max(0, (prev[placeId] || 1) - 1)
      }))
      
      // Update localStorage cache
      const cachedLikedPlaces = localStorage.getItem('likedPlaces')
      if (cachedLikedPlaces) {
        const likedPlaceIds = JSON.parse(cachedLikedPlaces)
        const updatedIds = likedPlaceIds.filter((id: string) => id !== placeId)
        localStorage.setItem('likedPlaces', JSON.stringify(updatedIds))
      }
      
      toast({
        title: "Place Unliked",
        description: `You have unliked ${placeName}`,
        variant: "default"
      })
    } catch (error: any) {
      console.error('Error unliking place:', error)
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to unlike place",
        variant: "destructive"
      })
    } finally {
      setUnlikingPlaces(prev => {
        const newSet = new Set(prev)
        newSet.delete(placeId)
        return newSet
      })
    }
  }

  const normalizedUserId = useMemo(() => {
    const candidate =
      loggedInUser?.userId ||
      loggedInUser?.id ||
      loggedInUser?.employeeId ||
      authState?.decodedToken?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']

    return candidate ? String(candidate).trim().toLowerCase() : null
  }, [loggedInUser, authState])

  const canEditPlace = (creatorUserId?: string | null) => {
    if (!creatorUserId || !normalizedUserId) return false
    return String(creatorUserId).trim().toLowerCase() === normalizedUserId
  }

  const handleUserProfileClick = (createdByUserId?: string | null) => {
    if (!createdByUserId) return
    
    const createdByUserIdNormalized = String(createdByUserId).trim().toLowerCase()
    
    // Nếu là user đang login thì đi đến ViewProfile, ngược lại đi đến ViewOtherProfile
    if (normalizedUserId && createdByUserIdNormalized === normalizedUserId) {
      navigate('/profile')
    } else {
      navigate(`/view-other-profile/${createdByUserId}`)
    }
  }

  const openEditModal = (place: PlaceDetail) => {
    setEditingPlaceId(place.placeId)
    setEditingInitialData(place as EditablePlaceDetail)
    setIsEditModalOpen(true)
  }

  const handleEditSuccess = async (updated: EditablePlaceDetail) => {
    setLikedPlaces(prev =>
      prev.map(entry =>
        entry.placeDetail.placeId === updated.placeId
          ? { ...entry, placeDetail: { ...entry.placeDetail, ...updated } }
          : entry
      )
    )
    await fetchLikedPlaces()
  }

  const handleDeletePlace = async () => {
    if (!deleteTarget) return
    try {
      setIsDeleting(true)
      await DeletePlace(deleteTarget.placeId)
      toast({
        title: 'Place deleted',
        description: 'The place has been removed successfully.',
        variant: 'default'
      })

      setLikedPlaces(prev => prev.filter(entry => entry.placeDetail.placeId !== deleteTarget.placeId))
      setLikeCounts(prev => {
        const copy = { ...prev }
        delete copy[deleteTarget.placeId]
        return copy
      })
      setSavedStatus(prev => {
        const copy = { ...prev }
        delete copy[deleteTarget.placeId]
        return copy
      })

      setSelectedPlace(prev => {
        if (prev?.placeId === deleteTarget.placeId) {
          setIsReviewsModalOpen(false)
          return null
        }
        return prev
      })

      setReportingPlace(prev => {
        if (prev?.placeId === deleteTarget.placeId) {
          setIsReportModalOpen(false)
          return null
        }
        return prev
      })

      setSelectedPlaceForMap(prev => {
        if (prev?.placeId === deleteTarget.placeId) {
          setIsViewOnMapOpen(false)
          return null
        }
        return prev
      })

      removeIdFromLocalStorageList('likedPlaces', deleteTarget.placeId)
      removeIdFromLocalStorageList('savedPlaces', deleteTarget.placeId)

      setDeleteTarget(null)
    } catch (error: any) {
      console.error('Error deleting place:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete place',
        variant: 'destructive'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const formatTime = (time: string) => {
    if (!time) return 'N/A'
    // Convert UTC time from backend to local timezone for display
    const timezone = localStorage.getItem('timezone')
    return convertUtcToLocalTime(time, timezone)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    return date.toLocaleDateString('en-US')
  }

  const formatLastReviewedAt = (dateString: string | null | undefined) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Last reviewed just now'
    if (diffInHours < 24) return `Last reviewed ${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return 'Last reviewed 1 day ago'
    if (diffInDays < 30) return `Last reviewed ${diffInDays} days ago`
    const diffInMonths = Math.floor(diffInDays / 30)
    if (diffInMonths === 1) return 'Last reviewed 1 month ago'
    if (diffInMonths < 12) return `Last reviewed ${diffInMonths} months ago`
    const diffInYears = Math.floor(diffInMonths / 12)
    return diffInYears === 1 ? 'Last reviewed 1 year ago' : `Last reviewed ${diffInYears} years ago`
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating)
            ? 'text-yellow-400 fill-current'
            : 'text-gray-300'
        }`}
      />
    ))
  }

  const getPriceLevel = (level: number | null) => {
    if (!level) return 'Not specified'
    const priceLevels = ['', 'Cheap', 'Fair', 'Moderate', 'Expensive', 'Luxury']
    return priceLevels[level] || 'Not specified'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Liked Places</h2>
            <p className="text-gray-600">Places you've liked and saved</p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            Loading...
          </Badge>
        </div>

        <div className="flex items-center justify-center py-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 text-lg">Loading your liked places...</p>
            <p className="text-gray-500 text-sm mt-2">This may take a moment</p>
          </motion.div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Liked Places</h2>
            <p className="text-gray-600">Places you've liked and saved</p>
          </div>
          <Badge variant="destructive" className="text-sm px-3 py-1">
            Error
          </Badge>
        </div>

        <div className="text-center py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-24 h-24 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Heart className="w-12 h-12 text-red-500" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Unable to load liked places</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              There was an issue loading your liked places. Please try again or check your connection.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={fetchLikedPlaces}
                className="px-6 py-2"
                style={{ 
                  background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                  color: 'white',
                  border: 'none'
                }}
              >
                Try Again
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="px-6 py-2"
              >
                Go to Homepage
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (likedPlaces.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Liked Places</h2>
            <p className="text-gray-600">Places you've liked and saved</p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            0 places
          </Badge>
        </div>

        {/* Empty State */}
        <div className="text-center py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-24 h-24 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Heart className="w-12 h-12 text-pink-500" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-3">No liked places yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start exploring amazing places and like the ones you love! Your liked places will appear here.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => window.location.href = '/'}
                className="px-6 py-2"
                style={{ 
                  background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                  color: 'white',
                  border: 'none'
                }}
              >
                Explore Places
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="px-6 py-2"
              >
                Go to Homepage
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Liked Places</h2>
          <p className="text-gray-600">Places you've liked and saved</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {likedPlaces.length} places
        </Badge>
      </div> */}

      <div className="space-y-6">
        {visibleLikedPlaces.map((place, index) => {
          const placeImages = place.placeDetail.imageUrls || []
          const activeImageIndex = activeImageIndices[place.placeDetail.placeId] ?? 0
          const showImageNavigation = placeImages.length > 2
          const visibleImages =
            placeImages.length === 0
              ? []
              : placeImages.length <= 2
                ? placeImages
                : [
                    placeImages[activeImageIndex],
                    placeImages[(activeImageIndex + 1) % placeImages.length]
                  ]
          const isSingleVisibleImage = visibleImages.length === 1

          const userCanEdit = canEditPlace(place.placeDetail.createdByUserId)
          const userCanReport = Boolean(normalizedUserId && place.placeDetail.createdByUserId && !userCanEdit)

          return (
            <motion.div
            key={place.placeDetail.placeId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                {/* Place Header */}
                <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    {/* Creator Avatar */}
                    <div 
                      className="relative cursor-pointer group"
                      onClick={() => handleUserProfileClick(place.placeDetail.createdByUserId)}
                    >
                      <img
                        src={place.placeDetail.createdByAvatar}
                        alt={place.placeDetail.createdBy}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md transition-all duration-200 group-hover:ring-2 group-hover:ring-blue-400"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/placeholder-user.jpg'
                        }}
                      />
                      {place.placeDetail.verificationStatus === 'Approved' && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="font-semibold text-gray-900 text-lg cursor-pointer transition-all duration-200 hover:underline decoration-2 underline-offset-2 decoration-blue-500"
                          onClick={() => handleUserProfileClick(place.placeDetail.createdByUserId)}
                        >
                          {place.placeDetail.createdBy}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                        <span>• {formatDate(place.placeDetail.createdAt)}</span>
                        {place.placeDetail.categoryName && (
                          <span 
                            className="px-2 py-1 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full text-xs font-medium text-white"
                          >
                            {place.placeDetail.categoryName}
                          </span>
                        )}
                        {(place.placeDetail as any).lastReviewedAt ? (
                          formatLastReviewedAt((place.placeDetail as any).lastReviewedAt) && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-lg text-xs font-semibold text-white shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                              <Clock className="w-3 h-3" />
                              {formatLastReviewedAt((place.placeDetail as any).lastReviewedAt)}
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-gray-400 to-gray-500 rounded-lg text-xs font-semibold text-white shadow-sm">
                            <MessageCircle className="w-3 h-3" />
                            No reviews yet
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleSave(place.placeDetail)}
                      disabled={savingPlaces.has(place.placeDetail.placeId)}
                      className={`p-2 rounded-full border transition-colors ${savedStatus[place.placeDetail.placeId] ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-gray-500 border-gray-200 hover:bg-gray-100'} disabled:opacity-60`}
                      aria-label={savedStatus[place.placeDetail.placeId] ? 'Remove from saved places' : 'Save place'}
                    >
                      {savedStatus[place.placeDetail.placeId] ? (
                        <BookmarkCheck className={`w-5 h-5 ${savingPlaces.has(place.placeDetail.placeId) ? 'animate-pulse' : ''}`} />
                      ) : (
                        <Bookmark className={`w-5 h-5 ${savingPlaces.has(place.placeDetail.placeId) ? 'animate-pulse' : ''}`} />
                      )}
                    </button>
                    {(userCanEdit || userCanReport) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Open place actions"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {userCanEdit && (
                            <>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => openEditModal(place.placeDetail)}
                              >
                                <Edit3 className="mr-2 h-4 w-4" />
                                Edit place
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-red-600 focus:text-red-600"
                                onClick={() =>
                                  setDeleteTarget({
                                    placeId: place.placeDetail.placeId,
                                    placeName: place.placeDetail.name
                                  })
                                }
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete place
                              </DropdownMenuItem>
                            </>
                          )}
                          {userCanReport && (
                            <DropdownMenuItem
                              className="cursor-pointer text-red-600 focus:text-red-600"
                              onClick={() => {
                                setReportingPlace({
                                  placeId: place.placeDetail.placeId,
                                  placeName: place.placeDetail.name
                                })
                                setIsReportModalOpen(true)
                              }}
                            >
                              <Flag className="mr-2 h-4 w-4" />
                              Report place
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Place Name */}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{place.placeDetail.name}</h2>
                </div>


                {/* Place Description */}
                <div className="mb-4">
                  <p className="text-gray-700 leading-relaxed">
                    {place.placeDetail.description}
                  </p>
                </div>

                {/* Place Images */}
                {placeImages.length > 0 && (
                  <div className="mb-4">
                    <div className="relative rounded-2xl overflow-hidden border border-gray-100 bg-gradient-to-b from-white to-gray-50 p-3 shadow-sm">
                      <div
                        className={
                          isSingleVisibleImage
                            ? 'flex justify-center'
                            : 'grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4'
                        }
                      >
                        {visibleImages.map((image, imgIndex) => (
                          <motion.div
                            key={`${image.imageId}-${imgIndex}`}
                            className={`relative cursor-pointer overflow-hidden rounded-xl group ${
                              isSingleVisibleImage ? 'w-full max-w-[420px] md:max-w-[460px]' : ''
                            }`}
                            whileHover={{ scale: 1.01 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: imgIndex * 0.08 }}
                          >
                            <img
                              src={image.imageUrl}
                              alt={image.altText || place.placeDetail.name}
                              className="w-full h-52 md:h-60 object-cover rounded-xl transition-transform duration-500 group-hover:scale-105"
                              onClick={() => setPreviewImage(image)}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              if (target.dataset.fallbackApplied === 'true') return
                              target.dataset.fallbackApplied = 'true'
                              target.src = '/placeholder.jpg'
                            }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                          </motion.div>
                        ))}
                      </div>
                      {showImageNavigation && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveImageIndices((prev) => {
                                const current = prev[place.placeDetail.placeId] ?? 0
                                const next =
                                  (current - 1 + placeImages.length) % placeImages.length
                                return { ...prev, [place.placeDetail.placeId]: next }
                              })
                            }
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 text-gray-700 shadow-xl flex items-center justify-center hover:bg-white hover:text-gray-900 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500"
                            aria-label="View previous image"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveImageIndices((prev) => {
                                const current = prev[place.placeDetail.placeId] ?? 0
                                const next = (current + 1) % placeImages.length
                                return { ...prev, [place.placeDetail.placeId]: next }
                              })
                            }
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 text-gray-700 shadow-xl flex items-center justify-center hover:bg-white hover:text-gray-900 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500"
                            aria-label="View next image"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <div className="absolute bottom-3 right-5 bg-white/90 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 shadow-lg">
                            {(activeImageIndex % placeImages.length) + 1}/{placeImages.length}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Place Details */}
                <div className="mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Left Column */}
                    <div className="space-y-3">
                      {/* Address */}
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600 text-sm">{place.placeDetail.addressLine1}</span>
                      </div>

                      {/* Hours */}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-gray-600 text-sm">
                          {formatTime(place.placeDetail.openTime)} - {formatTime(place.placeDetail.closeTime)}
                        </span>
                      </div>

                      {/* Rating */}
                      {place.placeDetail.averageRating > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {renderStars(place.placeDetail.averageRating)}
                          </div>
                          <span className="text-gray-600 text-sm">
                            {place.placeDetail.averageRating.toFixed(1)} ({place.placeDetail.totalReviews} reviews)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-3">
                      {/* Price Level */}
                      {place.placeDetail.priceLevel && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="text-gray-600 text-sm">
                            {getPriceLevel(place.placeDetail.priceLevel)}
                          </span>
                        </div>
                      )}

                      {/* Best Time to Visit */}
                      {place.placeDetail.bestTimeToVisit && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="text-gray-600 text-sm">
                            Best time: {place.placeDetail.bestTimeToVisit}
                          </span>
                        </div>
                      )}

                      {/* Suitable For */}
                      {place.placeDetail.suitableFor && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="text-gray-600 text-sm">
                            Suitable for: {place.placeDetail.suitableFor}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {place.placeDetail.phoneNumber && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">{place.placeDetail.phoneNumber}</span>
                      </div>
                    )}
                    {place.placeDetail.websiteUrl && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-500" />
                        <a 
                          href={place.placeDetail.websiteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Website
                        </a>
                      </div>
                    )}
                    {place.placeDetail.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">{place.placeDetail.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Engagement Metrics */}
                <div className="flex items-center gap-6 text-gray-500 text-sm ">
                  <button 
                    onClick={() => handleViewReviews(place)}
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{place.placeDetail.totalReviews} reviews</span>
                  </button>
                  <button 
                    onClick={() => handleUnlike(place.placeDetail.placeId, place.placeDetail.name)}
                    disabled={unlikingPlaces.has(place.placeDetail.placeId)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                  >
                    <Heart className={`w-4 h-4 fill-current ${unlikingPlaces.has(place.placeDetail.placeId) ? 'animate-pulse' : ''}`} />
                    <span>{likeCounts[place.placeDetail.placeId] || Math.max(1, place.placeDetail.totalLikes)} Likes</span>
                  </button>
                  
                  {place.placeDetail.latitude && place.placeDetail.longitude && (
                    <button 
                      onClick={() => {
                        setSelectedPlaceForMap({
                              placeId: place.placeDetail.placeId,
                          placeName: place.placeDetail.name,
                          latitude: place.placeDetail.latitude!,
                          longitude: place.placeDetail.longitude!,
                          address: place.placeDetail.addressLine1
                        })
                        setIsViewOnMapOpen(true)
                      }}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Open Map</span>
                  </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
        })}
        {isPaginating && hasMorePlaces && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-3 text-sm text-gray-500 bg-white/80 px-4 py-2 rounded-full shadow">
              <RefreshCcw className="w-4 h-4 animate-spin text-blue-500" />
              <span>Loading more places...</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Reviews Modal */}
      {selectedPlace && (
        <PlaceReviewModal
          isOpen={isReviewsModalOpen}
          onClose={() => {
            setIsReviewsModalOpen(false)
            setSelectedPlace(null)
          }}
          placeId={selectedPlace.placeId}
          placeName={selectedPlace.placeName}
          currentUserId={undefined} // PlaceReviewModal will get currentUserId from Redux store
          onReviewCreated={() => {
            // Optionally refresh liked places data if needed
          }}
          onReviewUpdated={() => {
            // Optionally refresh liked places data if needed
          }}
          onReviewDeleted={() => {
            // Optionally refresh liked places data if needed
          }}
        />
      )}

      {/* Image Preview Modal */}
      <Dialog
        open={!!previewImage}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null)
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden rounded-2xl">
          <div className="flex flex-col h-full">
            <DialogHeader className="flex flex-row items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50 space-y-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900">Image Preview</DialogTitle>
                  <p className="text-sm text-gray-600 mt-0.5">{previewImage?.altText || 'Place image'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-gray-400 hover:text-gray-600 transition-all duration-200 rounded-full p-2 hover:bg-white hover:scale-110"
                aria-label="Close preview"
              >
                <X className="w-6 h-6" />
              </button>
            </DialogHeader>

            <div className="flex-1 bg-gray-50 p-8 overflow-auto flex items-center justify-center">
              {previewImage ? (
                <img
                  src={previewImage.imageUrl}
                  alt={previewImage.altText || 'Preview image'}
                  className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg'
                  }}
                />
              ) : null}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setPreviewImage(null)}
                className="transition-all duration-200 hover:scale-105 px-6"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteTarget(null)
          }
        }}
      >
        <AlertDialogContent className="z-[10000]" style={{ zIndex: 10000 }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete this place?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This action cannot be undone. ${deleteTarget.placeName} and all of its related data will be permanently removed.`
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlace}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete place'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <EditPlaceModal
        placeId={isEditModalOpen ? editingPlaceId : null}
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={editingInitialData || undefined}
        onUpdated={async (updated) => {
          await handleEditSuccess(updated)
          setEditingInitialData(updated)
        }}
      />
      <ReportPlaceModal
        open={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false)
          setReportingPlace(null)
        }}
        placeId={isReportModalOpen && reportingPlace ? reportingPlace.placeId : null}
        placeName={reportingPlace?.placeName}
      />

      {selectedPlaceForMap && (
        <ViewOnMap
          isOpen={isViewOnMapOpen}
          onClose={() => {
            setIsViewOnMapOpen(false)
            setSelectedPlaceForMap(null)
          }}
          placeName={selectedPlaceForMap.placeName}
          latitude={selectedPlaceForMap.latitude}
          longitude={selectedPlaceForMap.longitude}
          address={selectedPlaceForMap.address}
        />
      )}
    </div>
  )
}

export default ViewLikedPlace