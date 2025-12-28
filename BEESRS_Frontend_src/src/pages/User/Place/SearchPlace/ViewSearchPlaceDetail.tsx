import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ViewDetailPlace } from '@/services/userService'
import { PlaceCard } from '@/pages/public/Home/components/PlaceCard'
import { Search as SearchIcon } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useSelector } from 'react-redux'
import type { RootState } from '@/redux/store'
import { Header } from '@/commonPage/Header/Header'
import { LeftSidebar } from '@/pages/public/Home/components/LeftSidebar'
import { motion } from 'framer-motion'

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
}

function ViewSearchPlaceDetail() {
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const { decodedToken } = useSelector((state: RootState) => state.auth)
  
  const placeId = searchParams.get('placeId') || ''
  const [placeDetail, setPlaceDetail] = useState<PlaceDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Get current user ID
  const currentUserId = decodedToken?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || null

  // Fetch place detail when placeId changes
  useEffect(() => {
    const fetchPlaceDetail = async () => {
      if (!placeId.trim()) {
        setPlaceDetail(null)
        return
      }

      try {
        setIsLoading(true)
        
        // Check if this is a TrackAsia place_id
        const trimmedPlaceId = placeId.trim()
        const isTrackAsia = /^\d+:[a-z_]+:/.test(trimmedPlaceId)
        
        let detail: any = null
        
        if (isTrackAsia) {
          // Use TrackAsia Place Details API
          const { placeService } = await import('@/services/placeService')
          const trackAsiaData = await placeService.getPlaceDetails(trimmedPlaceId)
          const result = trackAsiaData.result || trackAsiaData
          
          // Map TrackAsia response to PlaceDetail format
          detail = {
            placeId: result.place_id || trimmedPlaceId,
            googlePlaceId: result.place_id || null,
            name: result.name || 'Unknown Place',
            description: result.editorial_summary?.overview || result.formatted_address || '',
            categoryId: 0,
            categoryName: result.types?.[0] || 'place',
            addressLine1: result.formatted_address || result.vicinity || '',
            openTime: result.opening_hours?.weekday_text?.[0] || '',
            closeTime: '',
            city: result.address_components?.find((c: any) => c.types?.includes('locality'))?.long_name || '',
            stateProvince: result.address_components?.find((c: any) => c.types?.includes('administrative_area_level_1'))?.long_name || '',
            phoneNumber: result.formatted_phone_number || result.international_phone_number || '',
            websiteUrl: result.website || '',
            email: '',
            priceLevel: result.price_level || 0,
            averageRating: result.rating || 0,
            totalReviews: result.user_ratings_total || 0,
            latitude: result.geometry?.location?.lat || 0,
            longitude: result.geometry?.location?.lng || 0,
            imageUrls: result.photos?.slice(0, 5).map((photo: any, index: number) => ({
              imageId: `trackasia-${index}`,
              imageUrl: photo.url || '',
              altText: result.name || 'Place image'
            })) || []
          }
        } else {
          // Use system API for internal places
          const response: any = await ViewDetailPlace({ placeId: trimmedPlaceId })
          detail = response?.data || response || null
        }
        
        if (!detail) {
          toast({
            title: "Place Not Found",
            description: "Unable to load place details",
            variant: "destructive"
          })
          setPlaceDetail(null)
        } else {
          setPlaceDetail(detail)
        }
      } catch (error: any) {
        console.error('Error fetching place detail:', error)
        toast({
          title: "Error Loading Place",
          description: error.response?.data?.message || error.message || "Failed to load place details",
          variant: "destructive"
        })
        setPlaceDetail(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPlaceDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId])

  const [activeNavItem, setActiveNavItem] = useState('home')

  if (!placeId.trim()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Header />
        </motion.div>

        <div className="flex">
          <motion.div 
            className="hidden lg:block relative"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            <LeftSidebar 
              activeItem={activeNavItem} 
              onItemClick={setActiveNavItem} 
            />
          </motion.div>

          <div className="flex-1 w-full overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 80px)' }}>
            <div className="max-w-4xl mx-auto p-4 lg:p-6">
              <div className="text-center py-12">
                <SearchIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Place Not Found</h2>
                <p className="text-gray-600">Please select a place from search results</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Header />
      </motion.div>

      <div className="flex">
        <motion.div 
          className="hidden lg:block relative"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          <LeftSidebar 
            activeItem={activeNavItem} 
            onItemClick={setActiveNavItem} 
          />
        </motion.div>

        <div className="flex-1 w-full overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          <div className="max-w-4xl mx-auto p-4 lg:p-6">
            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading place details...</span>
              </div>
            )}

            {/* Place Detail */}
            {!isLoading && placeDetail && (
              <PlaceCard
                placeDetail={placeDetail}
                currentUserId={currentUserId || undefined}
              />
            )}

            {/* Error State - Failed to load */}
            {!isLoading && !placeDetail && placeId.trim() && (
              <div className="text-center py-12">
                <SearchIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Place Not Found</h2>
                <p className="text-gray-600">
                  Unable to load place details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewSearchPlaceDetail
