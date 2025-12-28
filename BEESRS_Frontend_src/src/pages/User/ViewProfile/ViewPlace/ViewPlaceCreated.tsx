import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Star, 
  DollarSign, 
  Building, 
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react'
import { UserViewPlaceCreated, ViewDetailPlace, CheckIfReviewPlace } from '@/services/userService'
import { DeletePlace } from '@/services/moderatorService'
import PageTransition from '@/components/Transition/PageTransition'
import PlaceDetailModal from '@/pages/User/ViewProfile/ViewPlace/PlaceDetailModal'
import ReviewModal from '@/pages/User/ViewProfile/ViewPlace/ReviewModal'
import ViewReviewsModal from '@/pages/User/ViewProfile/ViewPlace/ViewReviewsModal'
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
import { useToast } from '@/components/ui/use-toast'

interface PlaceCreated {
  placeId: string
  name: string
  categoryId: number
  categoryName: string
  priceLevel: number
  isVerified: boolean
  verificationStatus: string
  averageRating: number
  isReviewed?: boolean // Add review status
}

interface PlaceCreatedResponse {
  page: number
  pageSize: number
  totalItems: number
  items: PlaceCreated[]
}

interface ImageData {
  imageId: string
  imageUrl: string
  altText: string
}

interface PlaceDetail {
  placeId: string
  googlePlaceId: string | null
  name: string
  description: string
  categoryId: number
  categoryName: string
  addressLine1: string
  openTime: string
  closeTime: string
  city: string
  stateProvince: string
  phoneNumber: string
  websiteUrl: string
  email: string
  priceLevel: number
  averageRating: number
  totalReviews: number
  aiCategoryConfidence: number | null
  aiSuggestedTags: string | null
  aiPriceEstimate: number | null
  isVerified: boolean
  verificationStatus: string
  createdBy: string
  createdByAvatar: string
  createdAt: string
  updatedAt: string
  verifiedAt: string | null
  imageUrls: ImageData[]
  latitude: number
  longitude: number
  bestTimeToVisit?: string
  busyTime?: string
  suitableFor?: string
}


export default function ViewPlaceCreated() {
  const navigate = useNavigate()
  // Get current user from Redux store
  const currentUser = useSelector((state: any) => state.auth.user)
  const { toast } = useToast()
  
  const [places, setPlaces] = useState<PlaceCreated[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const pageSize = 9
  const [deleteTarget, setDeleteTarget] = useState<{ placeId: string; placeName: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPlaceDetail, setSelectedPlaceDetail] = useState<PlaceDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  
  // Review modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [selectedPlaceForReview, setSelectedPlaceForReview] = useState<{ placeId: string; name: string } | null>(null)
  
  // View reviews modal state
  const [isViewReviewsModalOpen, setIsViewReviewsModalOpen] = useState(false)
  const [selectedPlaceForViewReviews, setSelectedPlaceForViewReviews] = useState<{ placeId: string; name: string } | null>(null)
  
  // Review status state
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, boolean>>({})
  const [isCheckingReviews, setIsCheckingReviews] = useState(false)

  // Function to check review status for all places
  const checkReviewStatuses = async (placeIds: string[]) => {
    try {
      setIsCheckingReviews(true)
      const statusPromises = placeIds.map(async (placeId) => {
        try {
          const isReviewed = await CheckIfReviewPlace(placeId)
          return { placeId, isReviewed }
        } catch (error) {
          console.warn(`Failed to check review status for place ${placeId}:`, error)
          return { placeId, isReviewed: false }
        }
      })
      
      const results = await Promise.all(statusPromises)
      const statusMap: Record<string, boolean> = {}
      results.forEach(({ placeId, isReviewed }) => {
        statusMap[placeId] = isReviewed
      })
      
      setReviewStatuses(prev => ({ ...prev, ...statusMap }))
    } catch (error) {
      console.error('Error checking review statuses:', error)
    } finally {
      setIsCheckingReviews(false)
    }
  }

  const fetchPlaces = async (page: number = 1, search: string = '', category: string = '', sortField: string = '', sortDirection: string = '') => {
    try {
      setIsLoading(true)
      setError('')
      
      const response: PlaceCreatedResponse = await UserViewPlaceCreated({
        page,
        pageSize,
        search: search || undefined,
        isActive: true
      })

      if (response) {
        let filteredPlaces = response.items || []
        
        // Filter by category
        if (category) {
          filteredPlaces = filteredPlaces.filter(place => place.categoryName === category)
        }
        
        // Sort places
        if (sortField) {
          filteredPlaces.sort((a, b) => {
            let aValue, bValue
            
            if (sortField === 'priceLevel') {
              aValue = a.priceLevel
              bValue = b.priceLevel
            } else if (sortField === 'averageRating') {
              aValue = a.averageRating
              bValue = b.averageRating
            } else {
              return 0
            }
            
            if (sortDirection === 'asc') {
              return aValue - bValue
            } else {
              return bValue - aValue
            }
          })
        }
        
        setPlaces(filteredPlaces)
        setTotalPages(Math.ceil((response.totalItems || 0) / pageSize))
        setCurrentPage(response.page || 1)
        
        // Extract unique categories for filter dropdown
        const categories = [...new Set((response.items || []).map(place => place.categoryName))]
        setAvailableCategories(categories)
        
        // Check review statuses for all places
        const placeIds = filteredPlaces.map(place => place.placeId)
        if (placeIds.length > 0) {
          checkReviewStatuses(placeIds)
        }
      } else {
        setError('Failed to load places')
      }
    } catch (error: any) {
      console.error('Error fetching places:', error)
      setError(error.response?.data?.message || error.message || 'Failed to load places')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPlaces(1, '', categoryFilter, sortBy, sortOrder)
  }, [])

  const handleCategoryFilter = (category: string) => {
    setCategoryFilter(category)
    setCurrentPage(1)
    fetchPlaces(1, '', category, sortBy, sortOrder)
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
    setCurrentPage(1)
    fetchPlaces(1, '', categoryFilter, field, sortOrder)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      fetchPlaces(newPage, '', categoryFilter, sortBy, sortOrder)
    }
  }

  const handleViewPlaceDetail = async (placeId: string) => {
    try {
      setIsLoadingDetail(true)
      setError('')
      
      const placeDetail = await ViewDetailPlace({ placeId })
      setSelectedPlaceDetail(placeDetail)
      setIsModalOpen(true)
    } catch (error: any) {
      console.error('Error fetching place details:', error)
      setError(error.response?.data?.message || error.message || 'Failed to load place details')
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedPlaceDetail(null)
  }

  const handleImageUploaded = async (newImageUrls: string[]) => {
    // If empty array is passed, it means we need to refetch the place data
    if (newImageUrls.length === 0 && selectedPlaceDetail) {
      try {
        setIsLoadingDetail(true)
        const updatedPlaceDetail = await ViewDetailPlace({ placeId: selectedPlaceDetail.placeId })
        setSelectedPlaceDetail(updatedPlaceDetail)
      } catch (error: any) {
        console.error('Error refetching place details after image upload:', error)
        // Keep the existing data if refetch fails
      } finally {
        setIsLoadingDetail(false)
      }
    } else if (newImageUrls.length > 0 && selectedPlaceDetail) {
      // Legacy support: Update the selected place detail with new image URLs
      const newImageData: ImageData[] = newImageUrls.map((url, index) => ({
        imageId: `temp-${Date.now()}-${index}`,
        imageUrl: url,
        altText: `Uploaded image ${index + 1}`
      }))
      
      setSelectedPlaceDetail({
        ...selectedPlaceDetail,
        imageUrls: [...selectedPlaceDetail.imageUrls, ...newImageData]
      })
    }
  }

  const handleReviewAction = (placeId: string, placeName: string) => {
    const isReviewed = reviewStatuses[placeId]
    if (isReviewed) {
      // If already reviewed, open view reviews modal
      setSelectedPlaceForViewReviews({ placeId, name: placeName })
      setIsViewReviewsModalOpen(true)
    } else {
      // If not reviewed, open review modal
      setSelectedPlaceForReview({ placeId, name: placeName })
      setIsReviewModalOpen(true)
    }
  }

  const handleReviewSubmitted = () => {
    // Update review status for the place
    if (selectedPlaceForReview) {
      setReviewStatuses(prev => ({
        ...prev,
        [selectedPlaceForReview.placeId]: true
      }))
    }
  }

  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false)
    setSelectedPlaceForReview(null)
  }

  const handleCloseViewReviewsModal = () => {
    setIsViewReviewsModalOpen(false)
    setSelectedPlaceForViewReviews(null)
  }

  const handleReviewDeleted = () => {
    // Update review status for the place
    if (selectedPlaceForViewReviews) {
      setReviewStatuses(prev => ({
        ...prev,
        [selectedPlaceForViewReviews.placeId]: false
      }))
    }
  }

  const handleDeletePlace = async () => {
    if (!deleteTarget) return
    try {
      setIsDeleting(true)
      await DeletePlace(deleteTarget.placeId)
      toast({
        title: 'Place deleted',
        description: `${deleteTarget.placeName} has been removed successfully.`,
        variant: 'default'
      })
      setDeleteTarget(null)
      fetchPlaces(currentPage, '', categoryFilter, sortBy, sortOrder)
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

  const getPriceLevelText = (level: number) => {
    const priceLevels = ['', 'Cheap', 'Fair', 'Moderate', 'Expensive', 'Luxury']
    return priceLevels[level] || 'Not specified'
  }

  const getVerificationBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'rejected':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getVerificationBadgeText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified':
        return 'Verified'
      case 'pending':
        return 'Pending'
      case 'rejected':
        return 'Rejected'
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
  return (
      <div className="py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-1">
      <PageTransition delayMs={100} durationMs={600} variant="zoom">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          {/* <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Created Places</h1>
                <p className="text-gray-600 mt-1">Manage and view all the places you've created</p>
              </div>
            </div>
          </div> */}

          {/* Filter and Sort Bar */}
          <div className="mb-2">
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
                    <Filter className="h-4 w-4 text-white" />
                  </div>
                  Filter & Sort
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Category Filter */}
                  <div className="flex items-center gap-2 flex-1">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Filter className="h-4 w-4 text-indigo-600" />
                    </div>
                    <select
                      value={categoryFilter}
                      onChange={(e) => handleCategoryFilter(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 bg-white h-9"
                    >
                      <option value="">All Categories</option>
                      {availableCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort Options */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by:</span>
                    <Button
                      variant={sortBy === 'priceLevel' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSort('priceLevel')}
                      className={`h-9 ${
                        sortBy === 'priceLevel' 
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white' 
                          : ''
                      }`}
                    >
                      <DollarSign className="h-3.5 w-3.5 mr-1" />
                      Price {sortBy === 'priceLevel' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />)}
                    </Button>
                    <Button
                      variant={sortBy === 'averageRating' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSort('averageRating')}
                      className={`h-9 ${
                        sortBy === 'averageRating' 
                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white' 
                          : ''
                      }`}
                    >
                      <Star className="h-3.5 w-3.5 mr-1" />
                      Rating {sortBy === 'averageRating' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />)}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Places Grid */}
          {places.length === 0 ? (
            <Card className="overflow-hidden">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 mb-6 shadow-lg">
                  <Building className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  You haven't created any places yet
                </h3>
                <p className="text-gray-600 text-center max-w-md mb-8">
                  Start building your place collection by creating your first place. Share your favorite spots with the community!
                </p>
                <Button 
                  onClick={() => navigate('/create-place')}
                  className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Place
                </Button>
                <div className="mt-8 flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
                  <Building className="h-4 w-4" />
                  <span>Last checked: {new Date().toLocaleTimeString()}</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {places.map((place, index) => {
                const gradientColors = [
                  'from-blue-500 via-cyan-500 to-blue-500',
                  'from-purple-500 via-pink-500 to-purple-500',
                  'from-emerald-500 via-teal-500 to-emerald-500',
                  'from-orange-500 via-amber-500 to-orange-500',
                  'from-indigo-500 via-violet-500 to-indigo-500',
                  'from-rose-500 via-pink-500 to-rose-500',
                ]
                const gradientIndex = index % gradientColors.length
                const accentGradient = gradientColors[gradientIndex]
                
                return (
                  <Card key={place.placeId} className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-gray-200">
                    {/* Gradient accent bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accentGradient}`}></div>
                    
                    <CardHeader className="pb-3 pt-5">
                      <div className="flex flex-col gap-2 mb-2">
                        <div className="flex items-start gap-2">
                          <CardTitle 
                            className="text-lg font-bold text-gray-900 flex-1 min-w-0 truncate pr-2" 
                            title={place.name}
                          >
                            {place.name}
                          </CardTitle>
                        </div>
                        <Badge 
                          variant={getVerificationBadgeVariant(place.verificationStatus)}
                          className={`self-start whitespace-nowrap ${
                            place.verificationStatus.toLowerCase() === 'verified'
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0'
                              : place.verificationStatus.toLowerCase() === 'pending'
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0'
                              : ''
                          }`}
                        >
                          {getVerificationBadgeText(place.verificationStatus)}
                        </Badge>
                      </div>
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2 border border-gray-200">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="p-1.5 bg-blue-500 rounded-lg">
                            <Building className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="font-medium text-gray-700">{place.categoryName}</span>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0 space-y-3">
                      {/* Rating */}
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-100">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Rating</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(place.averageRating)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {place.averageRating > 0 ? place.averageRating.toFixed(1) : 'No ratings'}
                          </span>
                        </div>
                      </div>

                      {/* Price Level */}
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Price Level</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-semibold text-gray-900">
                            {getPriceLevelText(place.priceLevel)}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-3 border-t border-gray-200">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
                          onClick={() => handleViewPlaceDetail(place.placeId)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          className={`flex-1 ${
                            reviewStatuses[place.placeId] 
                              ? "bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white" 
                              : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                          } transition-all duration-200`}
                          onClick={() => handleReviewAction(place.placeId, place.name)}
                          disabled={isCheckingReviews}
                        >
                          {isCheckingReviews ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                          ) : (
                            <Edit className="h-4 w-4 mr-1" />
                          )}
                          {reviewStatuses[place.placeId] ? 'Reviewed' : 'Review'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-200"
                          onClick={() =>
                            setDeleteTarget({
                              placeId: place.placeId,
                              placeName: place.name
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8">
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1 flex-wrap justify-center">
                      {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 6, currentPage - 3)) + i
                        if (pageNum > totalPages) return null
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-10 h-10 ${
                              currentPage === pageNum
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0'
                                : 'border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300'
                            } transition-all duration-200`}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="flex items-center gap-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </PageTransition>

      {/* Place Detail Modal */}
      <PlaceDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        placeDetail={selectedPlaceDetail}
        isLoading={isLoadingDetail}
        onImageUploaded={handleImageUploaded}
        isOwnerOverride={true}
      />

      {/* Review Modal */}
      {selectedPlaceForReview && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={handleCloseReviewModal}
          placeId={selectedPlaceForReview.placeId}
          placeName={selectedPlaceForReview.name}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}

      {/* View Reviews Modal */}
      {selectedPlaceForViewReviews && (
        <ViewReviewsModal
          isOpen={isViewReviewsModalOpen}
          onClose={handleCloseViewReviewsModal}
          placeId={selectedPlaceForViewReviews.placeId}
          placeName={selectedPlaceForViewReviews.name}
          currentUserId={currentUser?.userId || ''}
          onReviewDeleted={handleReviewDeleted}
        />
      )}
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
                ? `This action cannot be undone. ${deleteTarget.placeName} and all related data will be permanently removed.`
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
    </div>
  )
}