import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ViewOtherPlaceCreated } from '@/services/userService'
import { useToast } from '@/components/ui/use-toast'
import { PlaceCard } from '@/pages/public/Home/components/PlaceCard'
import { 
  ArrowLeft, 
  Loader2, 
  MapPin, 
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/redux/store'

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
  imageUrls: Array<{
    imageId: string
    imageUrl: string
    altText: string
  }>
  latitude?: number
  longitude?: number
  isSavedByCurrentUser?: boolean
  isLikedByCurrentUser?: boolean
}

interface ViewCreatedPlacesByOthersProps {
  userId?: string
  showStandaloneHeader?: boolean
  className?: string
}

function ViewCreatedPlacesByOthers({
  userId: propUserId,
  showStandaloneHeader = true,
  className
}: ViewCreatedPlacesByOthersProps) {
  const { userId: routeUserId } = useParams<{ userId: string }>()
  const resolvedUserId = propUserId || routeUserId
  const navigate = useNavigate()
  const { toast } = useToast()
  const [places, setPlaces] = useState<PlaceDetail[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const { decodedToken } = useSelector((state: RootState) => state.auth)
  const currentUserId = decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]

  useEffect(() => {
    if (resolvedUserId) {
      fetchPlaces(resolvedUserId)
    } else {
      setError('User ID is required')
    }
  }, [resolvedUserId, currentPage, pageSize])

  const fetchPlaces = async (targetUserId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await ViewOtherPlaceCreated(targetUserId, currentPage, pageSize)
      
      // Handle response structure: { page, pageSize, totalItems, items: [{ placeDetail, reviews }] }
      if (response?.items && Array.isArray(response.items)) {
        // Extract placeDetail from each item and ensure createdByAvatar has default
        const placesData = response.items
          .map((item: any) => {
            const place = item.placeDetail
            if (place) {
              return {
                ...place,
                createdByAvatar: place.createdByAvatar || '/placeholder-user.jpg'
              }
            }
            return null
          })
          .filter((place: any) => place != null)
        
        setPlaces(placesData)
        setTotalItems(response.totalItems || placesData.length)
        setTotalPages(response.totalPages || Math.ceil((response.totalItems || placesData.length) / pageSize))
      } else if (response?.data?.items && Array.isArray(response.data.items)) {
        // Handle nested data structure
        const placesData = response.data.items
          .map((item: any) => {
            const place = item.placeDetail
            if (place) {
              return {
                ...place,
                createdByAvatar: place.createdByAvatar || '/placeholder-user.jpg'
              }
            }
            return null
          })
          .filter((place: any) => place != null)
        
        setPlaces(placesData)
        setTotalItems(response.data.totalItems || placesData.length)
        setTotalPages(response.data.totalPages || Math.ceil((response.data.totalItems || placesData.length) / pageSize))
      } else if (Array.isArray(response)) {
        // Handle direct array response (fallback)
        const placesData = response
          .map((item: any) => {
            const place = item.placeDetail || item
            if (place) {
              return {
                ...place,
                createdByAvatar: place.createdByAvatar || '/placeholder-user.jpg'
              }
            }
            return null
          })
          .filter((place: any) => place != null)
        
        setPlaces(placesData)
        setTotalItems(placesData.length)
        setTotalPages(1)
      } else {
        setPlaces([])
        setTotalItems(0)
        setTotalPages(0)
      }
    } catch (error: any) {
      console.error('Error fetching places:', error)
      setError(error.response?.data?.message || 'Failed to load places. Please try again.')
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load places. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (!resolvedUserId) {
    return (
      <div className={`bg-gray-50 ${showStandaloneHeader ? 'min-h-screen flex items-center justify-center' : ''}`}>
        <Card className="p-8 max-w-md">
          <CardContent className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">User ID Required</h2>
              <p className="text-gray-600 mt-1">Please provide a valid user ID to view places.</p>
            </div>
            {showStandaloneHeader && (
              <Button onClick={() => navigate(-1)} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`${showStandaloneHeader ? 'min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4' : ''} ${className || ''} scrollbar-hide`}>
      <style>{`
        /* Hide scrollbar */
        .scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* Ensure place images (NOT avatar) show full content with background */
        .place-card-container .grid.grid-cols-2 > div,
        .place-card-container .grid.md\\:grid-cols-3 > div {
          background-color: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
        }
        
        /* Only override object-fit for place images in grid, NOT avatar */
        .place-card-container .grid.grid-cols-2 img,
        .place-card-container .grid.md\\:grid-cols-3 img {
          object-fit: contain !important;
          width: 100%;
          height: auto;
          max-height: 400px;
          background-color: #f9fafb;
        }
        
        /* Ensure avatar keeps object-cover (override the contain rule above) */
        .place-card-container .rounded-full {
          object-fit: cover !important;
        }
      `}</style>
      <div className={`${showStandaloneHeader ? 'max-w-7xl mx-auto space-y-6' : 'space-y-6'}`}>
        {showStandaloneHeader && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-wrap items-center gap-4 mb-6">
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
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                >
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Created Places</h1>
                  <p className="text-gray-600 mt-1">View all places created by this user</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-8 h-8 text-blue-600" />
            </motion.div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card>
            <CardContent className="py-20 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Places</h3>
              <p className="text-gray-500 mb-4">{error}</p>
               <Button
                 onClick={() => resolvedUserId && fetchPlaces(resolvedUserId)}
                 variant="outline"
                 className="gap-2"
                 disabled={!resolvedUserId}
               >
                 <RefreshCw className="w-4 h-4" />
                 Try Again
               </Button>
            </CardContent>
          </Card>
        )}

        {/* Places Grid */}
        {!isLoading && !error && (
          <>
            {places.length === 0 ? (
              <Card>
                <CardContent className="py-20 text-center">
                  <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Places Found</h3>
                  <p className="text-gray-500">
                    This user hasn't created any places yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Places Count */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">
                    Showing {places.length} of {totalItems} {totalItems === 1 ? 'place' : 'places'}
                  </p>
                </div>

                {/* Places List */}
                <div className="space-y-6">
                  {places.map((place, index) => (
                    <motion.div
                      key={place.placeId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="place-card-container"
                    >
                      <PlaceCard 
                        placeDetail={place}
                        currentUserId={currentUserId}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || isLoading}
                      className="gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        
  return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            disabled={isLoading}
                            className="min-w-[40px]"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || isLoading}
                      className="gap-1"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ViewCreatedPlacesByOthers
