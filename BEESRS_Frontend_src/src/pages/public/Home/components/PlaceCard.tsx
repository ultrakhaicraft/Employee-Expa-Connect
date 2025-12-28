import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  MoreVertical,
  MessageCircle,
  Heart,
  Star,
  MapPin,
  Clock,
  Phone,
  Globe,
  Mail,
  Users,
  Calendar,
  DollarSign,
  ZoomIn,
  X,
  Edit3,
  Flag,
  Bookmark,
  BookmarkCheck,
  Trash2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { LikePlace, UnlikePlace, ViewAllLikePlace, SavePlaces, UnsavePlaces } from '@/services/userService'
import { DeletePlace } from '@/services/moderatorService'
import { useSelector } from 'react-redux'
import { useToast } from '@/components/ui/use-toast'
import PlaceReviewModal from './PlaceReviewModal'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import EditPlaceModal, { type EditablePlaceDetail } from '@/pages/User/Place/EditPlaceModal'
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
}


interface PlaceCardProps {
  placeDetail: PlaceDetail
  currentUserId?: string
  onPlaceDeleted?: (placeId: string) => void | Promise<void>
  onPlaceUpdated?: (placeId: string, updated: EditablePlaceDetail) => void | Promise<void>
}

export function PlaceCard({ placeDetail, currentUserId, onPlaceDeleted, onPlaceUpdated }: PlaceCardProps) {
  const navigate = useNavigate()
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(placeDetail.totalLikes)
  const [isLiking, setIsLiking] = useState(false)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState<PlaceImage | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null)
  const [editingInitialData, setEditingInitialData] = useState<EditablePlaceDetail | null>(null)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isViewOnMapOpen, setIsViewOnMapOpen] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const { toast } = useToast()

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, fallback = '/placeholder.jpg') => {
    const target = e.currentTarget
    // tránh vòng lặp request khi link ảnh hỏng
    if (target.dataset.fallbackApplied === 'true') return
    target.dataset.fallbackApplied = 'true'
    target.src = fallback
  }

  // Check like status when component mounts
  useEffect(() => {
    const checkLikeStatus = async () => {
      try {
        // First check localStorage cache
        const cachedLikedPlaces = localStorage.getItem('likedPlaces')
        if (cachedLikedPlaces) {
          const likedPlaceIds = JSON.parse(cachedLikedPlaces)
          const isPlaceLiked = likedPlaceIds.includes(placeDetail.placeId)
          setIsLiked(isPlaceLiked)
          
          // Ensure like count reflects the actual server state
          // If user has liked this place, the server count should be at least 1
          if (isPlaceLiked && placeDetail.totalLikes === 0) {
            setLikeCount(1) // Ensure minimum count of 1 if user has liked
          } else {
            setLikeCount(placeDetail.totalLikes)
          }
          return
        }

        // If no cache, fetch from API
        const response = await ViewAllLikePlace()
        const likedPlaces = response.items || []
        const likedPlaceIds = likedPlaces.map((likedPlace: any) => likedPlace.placeDetail.placeId)
        
        // Cache the result
        localStorage.setItem('likedPlaces', JSON.stringify(likedPlaceIds))
        
        // Set current place status
        const isPlaceLiked = likedPlaceIds.includes(placeDetail.placeId)
        setIsLiked(isPlaceLiked)
        
        // Ensure like count reflects the actual server state
        if (isPlaceLiked && placeDetail.totalLikes === 0) {
          setLikeCount(1) // Ensure minimum count of 1 if user has liked
        } else {
          setLikeCount(placeDetail.totalLikes)
        }
      } catch (error) {
        console.error('Error checking like status:', error)
        // If API fails, assume not liked and use server count
        setIsLiked(false)
        setLikeCount(placeDetail.totalLikes)
      }
    }

    checkLikeStatus()
  }, [placeDetail.placeId, placeDetail.totalLikes])

  // Initialize saved state from cache or API response hints
  useEffect(() => {
    const cachedSavedPlaces = localStorage.getItem('savedPlaces')
    if (cachedSavedPlaces) {
      const savedPlaceIds: string[] = JSON.parse(cachedSavedPlaces)
      setIsSaved(savedPlaceIds.includes(placeDetail.placeId))
      return
    }
    if ((placeDetail as any)?.isSavedByCurrentUser) {
      setIsSaved(true)
    }
  }, [placeDetail.placeId, (placeDetail as any)?.isSavedByCurrentUser])

  const authState = useSelector((state: any) => state.auth)
  const loggedInUser = authState?.user || authState?.userProfile || {}

  const normalizedUserId = useMemo(() => {
    const fromProp = currentUserId ? String(currentUserId).trim().toLowerCase() : null
    const fromAuth =
      loggedInUser?.userId ||
      loggedInUser?.id ||
      loggedInUser?.employeeId ||
      authState?.decodedToken?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']

    return (fromProp || fromAuth ? String(fromProp || fromAuth).trim().toLowerCase() : null)
  }, [currentUserId, loggedInUser, authState])

  const canEditPlace = useMemo(() => {
    if (!normalizedUserId) return false
    if (!placeDetail?.createdByUserId) return false
    return String(placeDetail.createdByUserId).trim().toLowerCase() === normalizedUserId
  }, [normalizedUserId, placeDetail?.createdByUserId])

  const canReportPlace = useMemo(() => {
    if (!normalizedUserId) return false
    if (!placeDetail?.createdByUserId) return false
    return !canEditPlace
  }, [normalizedUserId, placeDetail?.createdByUserId, canEditPlace])

  const handleUserProfileClick = () => {
    if (!placeDetail.createdByUserId) return
    
    const createdByUserIdNormalized = String(placeDetail.createdByUserId).trim().toLowerCase()
    
    // Nếu là user đang login thì đi đến ViewProfile, ngược lại đi đến ViewOtherProfile
    if (normalizedUserId && createdByUserIdNormalized === normalizedUserId) {
      navigate('/profile')
    } else {
      navigate(`/view-other-profile/${placeDetail.createdByUserId}`)
    }
  }

  const handleEditPlace = () => {
    setEditingPlaceId(placeDetail.placeId)
    setEditingInitialData(placeDetail as EditablePlaceDetail)
    setIsEditModalOpen(true)
  }

  const handleDeletePlace = async () => {
    if (isDeleting) return
    try {
      setIsDeleting(true)
      await DeletePlace(placeDetail.placeId)
      toast({
        title: 'Place deleted',
        description: 'The place has been removed successfully.',
        variant: 'default'
      })
      setIsDeleteDialogOpen(false)
      if (onPlaceDeleted) {
        await onPlaceDeleted(placeDetail.placeId)
      } else {
        window.location.reload()
      }
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

  const updateSavedCache = (placeId: string, shouldSave: boolean) => {
    const cached = localStorage.getItem('savedPlaces')
    const savedIds = cached ? (JSON.parse(cached) as string[]) : []
    const normalized = new Set(savedIds)
    if (shouldSave) {
      normalized.add(placeId)
    } else {
      normalized.delete(placeId)
    }
    localStorage.setItem('savedPlaces', JSON.stringify(Array.from(normalized)))
  }

  const handleSaveToggle = async () => {
    if (isSaving) return
    try {
      setIsSaving(true)
      if (isSaved) {
        await UnsavePlaces(placeDetail.placeId)
        setIsSaved(false)
        updateSavedCache(placeDetail.placeId, false)
        toast({
          title: 'Removed',
          description: 'Place has been removed from your saved list.',
          variant: 'default'
        })
      } else {
        await SavePlaces(placeDetail.placeId)
        setIsSaved(true)
        updateSavedCache(placeDetail.placeId, true)
        toast({
          title: 'Saved',
          description: 'Place has been added to your saved list.',
          variant: 'default'
        })
      }
    } catch (error: any) {
      console.error('Error toggling saved state:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update saved places',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditSuccess = async (updated: EditablePlaceDetail) => {
    toast({
      title: 'Place updated',
      description: 'Place information has been updated successfully.',
      variant: 'default'
    })

    if (onPlaceUpdated) {
      await onPlaceUpdated(updated.placeId, updated)
    } else {
      window.location.reload()
    }
  }

  const handleLike = async () => {
    if (isLiking) return
    
    try {
      setIsLiking(true)
      
      if (isLiked) {
        // Unlike the place
        await UnlikePlace(placeDetail.placeId)
        setIsLiked(false)
        
        // Update like count - ensure it doesn't go below 0
        setLikeCount(prev => Math.max(0, prev - 1))
        
        // Update localStorage cache
        const cachedLikedPlaces = localStorage.getItem('likedPlaces')
        if (cachedLikedPlaces) {
          const likedPlaceIds = JSON.parse(cachedLikedPlaces)
          const updatedIds = likedPlaceIds.filter((id: string) => id !== placeDetail.placeId)
          localStorage.setItem('likedPlaces', JSON.stringify(updatedIds))
        }
        
        toast({
          title: "Place Unliked",
          description: "You have unliked this place",
          variant: "default"
        })
      } else {
        // Like the place
        await LikePlace(placeDetail.placeId)
        setIsLiked(true)
        
        // Update like count - ensure it's at least 1 if user likes
        setLikeCount(prev => Math.max(1, prev + 1))
        
        // Update localStorage cache
        const cachedLikedPlaces = localStorage.getItem('likedPlaces')
        if (cachedLikedPlaces) {
          const likedPlaceIds = JSON.parse(cachedLikedPlaces)
          if (!likedPlaceIds.includes(placeDetail.placeId)) {
            likedPlaceIds.push(placeDetail.placeId)
            localStorage.setItem('likedPlaces', JSON.stringify(likedPlaceIds))
          }
        } else {
          localStorage.setItem('likedPlaces', JSON.stringify([placeDetail.placeId]))
        }
        
        toast({
          title: "Place Liked",
          description: "You have liked this place",
          variant: "default"
        })
      }
    } catch (error: any) {
      console.error('Error liking/unliking place:', error)
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to like/unlike place",
        variant: "destructive"
      })
    } finally {
      setIsLiking(false)
    }
  }

  // Function to sync like count with server state
  const syncLikeCount = () => {
    if (isLiked && likeCount === 0) {
      // If user has liked but count is 0, set to 1
      setLikeCount(1)
    } else if (!isLiked && likeCount < 0) {
      // If user hasn't liked but count is negative, set to 0
      setLikeCount(0)
    }
  }

  const placeImages = placeDetail.imageUrls || []
  const showImageNavigation = placeImages.length > 2

  const visibleImages = useMemo(() => {
    if (placeImages.length === 0) return []
    if (placeImages.length <= 2) return placeImages

    const secondIndex = (activeImageIndex + 1) % placeImages.length
    return [placeImages[activeImageIndex], placeImages[secondIndex]]
  }, [placeImages, activeImageIndex])

  const isSingleVisibleImage = visibleImages.length === 1

  const handleImageNavigation = (direction: 'prev' | 'next') => {
    if (!showImageNavigation) return
    setActiveImageIndex((prev) => {
      if (!placeImages.length) return 0
      if (direction === 'next') {
        return (prev + 1) % placeImages.length
      }
      return (prev - 1 + placeImages.length) % placeImages.length
    })
  }

  useEffect(() => {
    setActiveImageIndex(0)
  }, [placeDetail.placeId, placeImages.length])

  // Sync like count when isLiked or likeCount changes
  useEffect(() => {
    syncLikeCount()
  }, [isLiked, likeCount])

  const formatTime = (time: string) => {
    if (!time) return 'N/A'
    // Convert UTC time from backend to local timezone for display
    const timezone = localStorage.getItem('timezone')
    const localTime = convertUtcToLocalTime(time, timezone)
    return localTime
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

  return (
    <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        {/* Place Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Creator Avatar */}
            <div 
              className="relative cursor-pointer group"
              onClick={handleUserProfileClick}
            >
              <img
                src={placeDetail.createdByAvatar}
                alt={placeDetail.createdBy}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md transition-all duration-200 group-hover:ring-2 group-hover:ring-blue-400"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/placeholder-user.jpg'
                }}
              />
              {placeDetail.verificationStatus === 'Approved' && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span 
                  className="font-semibold text-gray-900 text-lg cursor-pointer transition-all duration-200 hover:underline decoration-2 underline-offset-2 decoration-blue-500"
                  onClick={handleUserProfileClick}
                >
                  {placeDetail.createdBy}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                <span>• {formatDate(placeDetail.createdAt)}</span>
                {placeDetail.categoryName && (
                  <span 
                    className="px-2 py-1 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full text-xs font-medium text-white"
                  >
                    {placeDetail.categoryName}
                  </span>
                )}
                {(placeDetail as any).lastReviewedAt ? (
                  formatLastReviewedAt((placeDetail as any).lastReviewedAt) && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-lg text-xs font-semibold text-white shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                      <Clock className="w-3 h-3" />
                      {formatLastReviewedAt((placeDetail as any).lastReviewedAt)}
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
              onClick={handleSaveToggle}
              disabled={isSaving}
              className={`p-2 rounded-full border transition-colors ${isSaved ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-gray-500 border-gray-200 hover:bg-gray-100'} disabled:opacity-60`}
              aria-label={isSaved ? 'Remove from saved places' : 'Save place'}
            >
              {isSaved ? (
                <BookmarkCheck className={`w-5 h-5 ${isSaving ? 'animate-pulse' : ''}`} />
              ) : (
                <Bookmark className={`w-5 h-5 ${isSaving ? 'animate-pulse' : ''}`} />
              )}
            </button>
            {(canEditPlace || canReportPlace) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
                    aria-label="Open place actions"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {canEditPlace && (
                    <>
                      <DropdownMenuItem onClick={handleEditPlace} className="cursor-pointer">
                        <Edit3 className="mr-2 h-4 w-4" />
                        Edit place
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer text-red-600 focus:text-red-600"
                        onClick={() => setIsDeleteDialogOpen(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete place
                      </DropdownMenuItem>
                    </>
                  )}
                  {canReportPlace && (
                    <DropdownMenuItem
                      className="cursor-pointer text-red-600 focus:text-red-600"
                      onClick={() => setIsReportModalOpen(true)}
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
          <h2 className="text-xl font-bold text-gray-900 mb-1">{placeDetail.name}</h2>
        </div>


        {/* Place Description */}
        <div className="mb-4">
          <p className="text-gray-700 leading-relaxed">
            {placeDetail.description}
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
                {visibleImages.map((image, index) => (
                  <motion.div
                    key={`${image.imageId}-${index}`}
                    className={`relative cursor-pointer overflow-hidden rounded-xl group ${
                      isSingleVisibleImage ? 'w-full max-w-[420px] md:max-w-[460px]' : ''
                    }`}
                    whileHover={{ scale: 1.01 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.08 }}
                  >
                    <img
                      src={image.imageUrl}
                      alt={image.altText || placeDetail.name}
                      className={`w-full rounded-xl transition-transform duration-500 group-hover:scale-105 ${
                        isSingleVisibleImage ? 'h-52 md:h-60 object-cover' : 'h-52 md:h-60 object-cover'
                      }`}
                      onClick={() => setPreviewImage(image)}
                  onError={(e) => handleImageError(e as any)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </motion.div>
                ))}
              </div>

              {showImageNavigation && (
                <>
                  <button
                    type="button"
                    onClick={() => handleImageNavigation('prev')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 text-gray-700 shadow-xl flex items-center justify-center hover:bg-white hover:text-gray-900 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500"
                    aria-label="View previous image"
                  >
                    <span className="sr-only">Previous image</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImageNavigation('next')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 text-gray-700 shadow-xl flex items-center justify-center hover:bg-white hover:text-gray-900 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500"
                    aria-label="View next image"
                  >
                    <span className="sr-only">Next image</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <div className="absolute bottom-3 right-5 bg-white/90 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 shadow-lg">
                    {activeImageIndex + 1}/{placeImages.length}
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
                <span className="text-gray-600 text-sm">{placeDetail.addressLine1}</span>
              </div>

              {/* Hours */}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-600 text-sm">
                  {formatTime(placeDetail.openTime)} - {formatTime(placeDetail.closeTime)}
                </span>
              </div>

              {/* Rating */}
              {placeDetail.averageRating > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {renderStars(placeDetail.averageRating)}
                  </div>
                  <span className="text-gray-600 text-sm">
                    {placeDetail.averageRating.toFixed(1)} ({placeDetail.totalReviews} reviews)
                  </span>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              {/* Price Level */}
              {placeDetail.priceLevel && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-600 text-sm">
                    {getPriceLevel(placeDetail.priceLevel)}
                  </span>
                </div>
              )}

              {/* Best Time to Visit */}
              {placeDetail.bestTimeToVisit && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-600 text-sm">
                    Best time: {placeDetail.bestTimeToVisit}
                  </span>
                </div>
              )}

              {/* Suitable For */}
              {placeDetail.suitableFor && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-600 text-sm">
                    Suitable for: {placeDetail.suitableFor}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {placeDetail.phoneNumber && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">{placeDetail.phoneNumber}</span>
              </div>
            )}
            {placeDetail.websiteUrl && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-500" />
                <a 
                  href={placeDetail.websiteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Website
                </a>
              </div>
            )}
            {placeDetail.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">{placeDetail.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="flex items-center gap-6 text-gray-500 text-sm ">
          <button 
            onClick={() => setIsReviewModalOpen(true)}
            className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{placeDetail.totalReviews} reviews</span>
          </button>
          <button 
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center gap-1 transition-colors disabled:opacity-50 ${
              isLiked ? 'text-red-600' : 'hover:text-red-600'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''} ${isLiking ? 'animate-pulse' : ''}`} />
            <span>{likeCount.toLocaleString()} Likes</span>
          </button>
          {placeDetail.latitude && placeDetail.longitude && (
            <button 
              onClick={() => setIsViewOnMapOpen(true)}
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              <span>Open Map</span>
            </button>
          )}
        </div>

      </CardContent>

      {/* Review Modal */}
      <PlaceReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        placeId={placeDetail.placeId}
        placeName={placeDetail.name}
        currentUserId={currentUserId}
        onReviewCreated={() => {
          // Refresh reviews or update UI as needed
        }}
        onReviewUpdated={() => {
          // Refresh reviews or update UI as needed
        }}
        onReviewDeleted={() => {
          // Refresh reviews or update UI as needed
        }}
      />

      {/* Image Preview Modal */}
      <Dialog
        open={!!previewImage}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewImage(null)
          }
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
                  onError={(e) => handleImageError(e as any, '/placeholder.svg')}
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
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setIsDeleteDialogOpen(open)
        }}
      >
        <AlertDialogContent className="z-[10000]" style={{ zIndex: 10000 }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete this place?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The place and all of its related data will be permanently removed.
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

      {/* Edit Place Modal */}
      <EditPlaceModal
        placeId={isEditModalOpen ? editingPlaceId : null}
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingPlaceId(null)
          setEditingInitialData(null)
        }}
        initialData={editingInitialData || undefined}
        onUpdated={async (updated) => {
          await handleEditSuccess(updated)
          setEditingInitialData(updated)
        }}
      />

      <ReportPlaceModal
        open={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        placeId={isReportModalOpen ? placeDetail.placeId : null}
        placeName={placeDetail.name}
      />

      <ViewOnMap
        isOpen={isViewOnMapOpen}
        onClose={() => setIsViewOnMapOpen(false)}
        placeName={placeDetail.name}
        latitude={placeDetail.latitude}
        longitude={placeDetail.longitude}
        address={placeDetail.addressLine1}
      />
    </Card>
  )
}
