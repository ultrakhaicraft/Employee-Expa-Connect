import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ViewDetailPlace } from '@/services/userService'
import PlaceDetailModal from '../ViewProfile/ViewPlace/PlaceDetailModal'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isTrackAsiaPlaceId, placeService } from '@/services/placeService'

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
  imageUrls: Array<{
    imageId: string
    imageUrl: string
    altText: string
  }>
  latitude: number
  longitude: number
  bestTimeToVisit?: string
  busyTime?: string
  suitableFor?: string
}

export default function PlaceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [placeDetail, setPlaceDetail] = useState<PlaceDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(true)

  useEffect(() => {
    if (id) {
      loadPlaceDetail()
    } else {
      setError('Place ID is required')
      setIsLoading(false)
    }
  }, [id])

  const loadPlaceDetail = async () => {
    if (!id) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      // Check if this is a TrackAsia place_id
      if (isTrackAsiaPlaceId(id)) {
        // Use TrackAsia Place Details API
        const trackAsiaData = await placeService.getPlaceDetails(id)
        const result = trackAsiaData.result || trackAsiaData
        
        // Map TrackAsia response to PlaceDetail format
        const mappedPlace: PlaceDetail = {
          placeId: result.place_id || id,
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
          aiCategoryConfidence: null,
          aiSuggestedTags: null,
          aiPriceEstimate: null,
          isVerified: false,
          verificationStatus: 'unverified',
          createdBy: '',
          createdByAvatar: '',
          createdAt: '',
          updatedAt: '',
          verifiedAt: null,
          imageUrls: result.photos?.slice(0, 5).map((photo: any, index: number) => ({
            imageId: `trackasia-${index}`,
            imageUrl: photo.url || '',
            altText: result.name || 'Place image'
          })) || [],
          latitude: result.geometry?.location?.lat || 0,
          longitude: result.geometry?.location?.lng || 0
        }
        
        setPlaceDetail(mappedPlace)
      } else {
        // Use system API for internal places
        const data = await ViewDetailPlace({ placeId: id })
        setPlaceDetail(data)
      }
    } catch (error: any) {
      console.error('Error loading place detail:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load place details'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setIsModalOpen(false)
    navigate(-1) // Go back to previous page
  }

  const handleImageUploaded = async (_newImageUrls: string[]) => {
    // Reload place detail after image upload
    if (id) {
      await loadPlaceDetail()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading place details...</p>
        </div>
      </div>
    )
  }

  if (error || !placeDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error</h2>
            <p className="text-red-700 mb-4">{error || 'Place not found'}</p>
            <Button onClick={handleClose} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Always show modal in full screen mode */}
      <PlaceDetailModal
        isOpen={isModalOpen}
        onClose={handleClose}
        placeDetail={placeDetail}
        isLoading={isLoading}
        onImageUploaded={handleImageUploaded}
        isOwnerOverride={false}
      />
    </div>
  )
}

