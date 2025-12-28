import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { useSelector } from 'react-redux'
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
import {
  Star,
  DollarSign,
  Building,
  MapPin,
  Phone,
  Globe,
  Mail,
  CheckCircle,
  AlertCircle,
  XCircle,
  Camera,
  Upload,
  ZoomIn,
  X,
  Plus,
  Edit3,
  Clock,
  Calendar,
  Users
} from 'lucide-react'
import { UploadPlaceImages, DeletePlaceImage, ViewDetailPlace } from '@/services/userService'
import EditPlaceModal, { type EditablePlaceDetail } from '@/pages/User/Place/EditPlaceModal'
import { convertUtcToLocalTime } from '@/utils/timezone'

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
  createdByUserId?: string | null
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


interface PlaceDetailModalProps {
  isOpen: boolean
  onClose: () => void
  placeDetail: PlaceDetail | null
  isLoading: boolean
  onImageUploaded?: (newImageUrls: string[]) => void
  isOwnerOverride?: boolean // Override to force owner mode (e.g., from ViewPlaceCreated)
}

export default function PlaceDetailModal({ isOpen, onClose, placeDetail, isLoading, onImageUploaded, isOwnerOverride }: PlaceDetailModalProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [currentImageUrls, setCurrentImageUrls] = useState<ImageData[]>([])
  const [previewImage, setPreviewImage] = useState<ImageData | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [urlImages, setUrlImages] = useState<{ imageUrl: string; altText: string }[]>([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
 
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
 
  // Hide body scrollbar while this modal is open (like Edit Profile modal)
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])

  const authState = useSelector((state: any) => state.auth)
  const currentUser = authState.user || authState.userProfile || {}
  
  const normalizedUserId = (() => {
    const candidate =
      currentUser?.userId ||
      currentUser?.id ||
      currentUser?.employeeId ||
      authState?.decodedToken?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
    return candidate ? String(candidate).trim().toLowerCase() : null
  })()

  // Check if user is owner using createdByUserId
  // If isOwnerOverride is true (from ViewPlaceCreated), always treat as owner
  const isOwner = isOwnerOverride || (placeDetail?.createdByUserId && normalizedUserId && 
    String(placeDetail.createdByUserId).trim().toLowerCase() === normalizedUserId)

  useEffect(() => {
    if (placeDetail?.imageUrls) {
      setCurrentImageUrls(placeDetail.imageUrls)
    }
  }, [placeDetail?.imageUrls])

  useEffect(() => {
    if (!isOpen) {
      setShowEditModal(false)
      setIsEditModalOpen(false)
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      previewUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [previewUrls])

  const handleEdit = () => {
    if (placeDetail) {
      setShowEditModal(true)
      setIsEditModalOpen(true)
    }
  }

  const handleEditSuccess = async (_updated: EditablePlaceDetail) => {
    // Refresh place detail
    if (placeDetail?.placeId) {
      try {
        await ViewDetailPlace({ placeId: placeDetail.placeId })
        if (onImageUploaded) {
          onImageUploaded([])
        }
      } catch (error) {
        console.error('Error refreshing place detail:', error)
      }
    }
    // Close edit modal but keep detail modal open
    setShowEditModal(false)
    setIsEditModalOpen(false)
  }

  const handleEditClose = () => {
    // Close edit modal and show detail modal again
    setShowEditModal(false)
    setIsEditModalOpen(false)
  }

  const getVerificationBadgeVariant = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'VERIFIED':
      case 'APPROVED':
      case 'CONFIRMED':
        return 'default'
      case 'PENDING':
        return 'secondary'
      case 'REJECTED':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getVerificationIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'VERIFIED':
      case 'APPROVED':
      case 'CONFIRMED':
        return <CheckCircle className="h-3 w-3" />
      case 'PENDING':
        return <AlertCircle className="h-3 w-3" />
      case 'REJECTED':
        return <XCircle className="h-3 w-3" />
      default:
        return <AlertCircle className="h-3 w-3" />
    }
  }

  const getVerificationBadgeText = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'VERIFIED':
        return 'Verified'
      case 'PENDING':
        return 'Pending'
      case 'REJECTED':
        return 'Rejected'
      case 'APPROVED':
        return 'Verified'
      case 'CONFIRMED':
        return 'Verified'
      default:
        return 'Unknown'
    }
  }

  const getPriceLevelText = (level: number) => {
    switch (level) {
      case 1:
        return 'Cheap'
      case 2:
        return 'Fair'
      case 3:
        return 'Moderate'
      case 4:
        return 'Expensive'
      case 5:
        return 'Luxury'
      default:
        return 'Not specified'
    }
  }


  const formatTime = (time: string) => {
    if (!time) return 'Not specified'
    // Convert UTC time from backend to local timezone for display
    const timezone = localStorage.getItem('timezone')
    return convertUtcToLocalTime(time, timezone)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileArray = Array.from(e.target.files || [])

    const validFiles = fileArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        console.warn('Invalid file type:', file.name, file.type)
        return false
      }
      if (file.size > 5 * 1024 * 1024) {
        console.warn('File too large:', file.name, file.size)
        return false
      }
      return true
    })

    if (validFiles.length !== fileArray.length) {
      setUploadError(`Some files were skipped. Only image files under 5MB are allowed.`)
    }

    setSelectedFiles(validFiles)
    const urls = validFiles.map(file => URL.createObjectURL(file))
    setPreviewUrls(urls)
  }

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleAddUrlImage = () => {
    if (!imageUrl.trim()) return

    try {
      new URL(imageUrl)
      setUrlImages(prev => [...prev, {
        imageUrl: imageUrl.trim(),
        altText: `Image from URL ${urlImages.length + 1}`
      }])
      setImageUrl('')
      setUploadError('')
    } catch {
      setUploadError('Please enter a valid URL')
    }
  }

  const removeUrlImage = (index: number) => {
    setUrlImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleImageUpload = async () => {
    if ((selectedFiles.length === 0 && urlImages.length === 0) || !placeDetail) return

    try {
      setIsUploading(true)
      setUploadError('')

      if (selectedFiles.length > 0) {
        const altTexts = selectedFiles.map(file => file.name.split('.')[0])
        await UploadPlaceImages(placeDetail.placeId, selectedFiles, altTexts)
      }

      if (urlImages.length > 0) {
        const { AddPlaceImg } = await import('@/services/userService')
        await AddPlaceImg({
          placeId: placeDetail.placeId,
          imageUrlsList: urlImages
        })
      }

      setSelectedFiles([])
      setPreviewUrls([])
      setUrlImages([])

      const totalImages = selectedFiles.length + urlImages.length
      toast({
        title: "Upload Successful!",
        description: `Successfully added ${totalImages} image(s) to the place.`,
        variant: "default"
      })

      if (onImageUploaded) {
        onImageUploaded([])
      }
    } catch (error: any) {
      console.error('Error uploading images:', error)
      setUploadError(error.message || 'Failed to upload images')

      toast({
        title: "Upload Failed!",
        description: error.message || 'Failed to upload images.',
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const performDeleteImage = async (imageId: string) => {
    if (!imageId || imageId.startsWith('temp-')) {
      setCurrentImageUrls(prev => prev.filter(img => img.imageId !== imageId))
      toast({
        title: "Image Removed!",
        description: "Image has been removed from the place.",
        variant: "default"
      })
      return
    }

    try {
      setIsDeleting(imageId)

      await DeletePlaceImage(imageId)

      toast({
        title: "Image Deleted!",
        description: "Image has been successfully deleted from the place.",
        variant: "default"
      })

      if (onImageUploaded) {
        onImageUploaded([])
      }
    } catch (error: any) {
      console.error('Error deleting image:', error)

      toast({
        title: "Delete Failed!",
        description: error.message || 'Failed to delete image.',
        variant: "destructive"
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDeleteImage = (imageId: string) => {
    setConfirmAction({ type: 'delete', payload: imageId })
  }

  const [confirmAction, setConfirmAction] = useState<{ type: 'delete'; payload?: any } | null>(null)
  const [isProcessingConfirm, setIsProcessingConfirm] = useState(false)

  const confirmCopy = {
    delete: {
      title: 'Delete Image?',
      description: 'This image will be removed from the place and cannot be undone.'
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmAction) return
    setIsProcessingConfirm(true)
    try {
      if (confirmAction.type === 'delete') {
        await performDeleteImage(confirmAction.payload)
      }
      setConfirmAction(null)
    } finally {
      setIsProcessingConfirm(false)
    }
  }

  return (
    <>
    <Dialog open={isOpen && !showEditModal} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0 rounded-2xl overflow-hidden">
        <div className="flex flex-col max-h-[95vh]">
          {/* Header */}
          <DialogHeader className="p-6 border-b bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl shadow-sm">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-gray-900">
                    {isLoading ? 'Loading...' : placeDetail?.name || 'Place Details'}
                  </DialogTitle>
                  <p className="text-gray-600 text-sm mt-1">
                    {placeDetail?.categoryName && (
                      <>
                        <span className="px-2 py-1 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full text-xs font-medium text-white">
                          {placeDetail.categoryName}
                        </span>
                        {placeDetail?.city && ' • '}
                      </>
                    )}
                    {placeDetail?.city && `${placeDetail.city}, ${placeDetail.stateProvince}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {placeDetail && (
                  <Badge variant={getVerificationBadgeVariant(placeDetail.verificationStatus)} className="flex items-center gap-1 text-xs px-3 py-1">
                    {getVerificationIcon(placeDetail.verificationStatus)}
                    {getVerificationBadgeText(placeDetail.verificationStatus)}
                  </Badge>
                )}
                {isOwner && !showEditModal && (
                  <Button
                    onClick={handleEdit}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit Place
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(95vh - 140px)' }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : placeDetail ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column - Place Information */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Basic Information */}
                    <Card className="border border-blue-200 shadow-lg bg-gradient-to-br from-blue-50/30 to-indigo-50/30">
                      <CardContent className="p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                            <Building className="h-5 w-5 text-blue-600" />
                          </div>
                          Basic Information
                        </h3>
                        {/* Description */}
                        <div className="mb-6">
                          <label className="text-sm font-medium text-gray-500 block mb-2">Description</label>
                          <p className="text-base text-gray-900 leading-relaxed">{placeDetail.description || 'No description provided'}</p>
                        </div>

                        {/* Place Details - 2 Columns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left Column */}
                          <div className="space-y-4">
                            {/* Address */}
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <label className="text-sm font-medium text-gray-500 block">Address</label>
                                <p className="text-sm text-gray-900 mt-1">{placeDetail.addressLine1}</p>
                                {(placeDetail.city || placeDetail.stateProvince) && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    {placeDetail.city}{placeDetail.city && placeDetail.stateProvince ? ', ' : ''}{placeDetail.stateProvince}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Hours */}
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div>
                                <label className="text-sm font-medium text-gray-500 block">Hours</label>
                                <p className="text-sm text-gray-900 mt-1">
                                  {formatTime(placeDetail.openTime)} - {formatTime(placeDetail.closeTime)}
                                </p>
                              </div>
                            </div>

                            {/* Category */}
                            {placeDetail.categoryName && (
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <div>
                                  <label className="text-sm font-medium text-gray-500 block">Category</label>
                                  <p className="text-sm text-gray-900 mt-1">{placeDetail.categoryName}</p>
                                </div>
                              </div>
                            )}

                            {/* Best Time to Visit */}
                            {placeDetail.bestTimeToVisit && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <div>
                                  <label className="text-sm font-medium text-gray-500 block">Best Time to Visit</label>
                                  <p className="text-sm text-gray-900 mt-1">{placeDetail.bestTimeToVisit}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right Column */}
                          <div className="space-y-4">
                            {/* Rating */}
                            {placeDetail.averageRating > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < Math.floor(placeDetail.averageRating)
                                          ? 'text-yellow-400 fill-current'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500 block">Rating</label>
                                  <p className="text-sm text-gray-900 mt-1">
                                    {placeDetail.averageRating.toFixed(1)} ({placeDetail.totalReviews} reviews)
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Price Level */}
                            {placeDetail.priceLevel > 0 && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <div>
                                  <label className="text-sm font-medium text-gray-500 block">Price Level</label>
                                  <p className="text-sm text-gray-900 mt-1">{getPriceLevelText(placeDetail.priceLevel)}</p>
                                </div>
                              </div>
                            )}

                            {/* Suitable For */}
                            {placeDetail.suitableFor && (
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <div>
                                  <label className="text-sm font-medium text-gray-500 block">Suitable For</label>
                                  <p className="text-sm text-gray-900 mt-1">{placeDetail.suitableFor}</p>
                                </div>
                              </div>
                            )}

                            {/* Busy Time */}
                            {placeDetail.busyTime && (
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <div>
                                  <label className="text-sm font-medium text-gray-500 block">Busy Time</label>
                                  <p className="text-sm text-gray-900 mt-1">{placeDetail.busyTime}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <Card className="border border-green-200 shadow-lg bg-gradient-to-br from-green-50/30 to-emerald-50/30">
                      <CardContent className="p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                            <Phone className="h-5 w-5 text-green-600" />
                          </div>
                          Contact Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {placeDetail.phoneNumber && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div>
                                <label className="text-sm font-medium text-gray-500 block">Phone</label>
                                <p className="text-sm text-gray-900 mt-1">{placeDetail.phoneNumber}</p>
                              </div>
                            </div>
                          )}
                          {placeDetail.websiteUrl && (
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div>
                                <label className="text-sm font-medium text-gray-500 block">Website</label>
                                <a
                                  href={placeDetail.websiteUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm mt-1 block"
                                >
                                  Visit Website
                                </a>
                              </div>
                            </div>
                          )}
                          {placeDetail.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div>
                                <label className="text-sm font-medium text-gray-500 block">Email</label>
                                <p className="text-sm text-gray-900 mt-1">{placeDetail.email}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column - Images Section */}
                  <div className="lg:col-span-5">
                    <Card className="border border-purple-200 shadow-lg bg-gradient-to-br from-purple-50/30 to-pink-50/30 h-fit lg:sticky lg:top-4">
                      <CardContent className="p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                            <Camera className="h-5 w-5 text-purple-600" />
                          </div>
                          Place Images
                        </h3>

                        {/* Upload Section - Only show if owner */}
                        {isOwner && (
                          <div className="space-y-3 mb-6">
                            <div>
                              <input
                                ref={fileInputRef}
                                type="file"
                                id="image-upload"
                                multiple
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                                disabled={isUploading}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full cursor-pointer border-2 border-dashed hover:text-purple-500 border-purple-300 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 h-9"
                                disabled={isUploading}
                                onClick={triggerFileSelect}
                              >
                                <Camera className="h-4 w-4 mr-2" />
                                Select Images
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <Input
                                  type="url"
                                  placeholder="https://example.com/image.jpg"
                                  value={imageUrl}
                                  onChange={(e) => setImageUrl(e.target.value)}
                                  className="flex-1 h-8 text-sm border-dashed border-purple-300 "
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddUrlImage()
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={handleAddUrlImage}
                                  disabled={!imageUrl.trim() || isUploading}
                                  className="h-8 px-3"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <p className="text-xs text-gray-500">Paste URL and press Enter</p>
                            </div>

                            {(selectedFiles.length > 0 || urlImages.length > 0) && (
                              <Button
                                onClick={handleImageUpload}
                                size="sm"
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-9"
                                disabled={isUploading}
                              >
                                {isUploading ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload ({selectedFiles.length + urlImages.length})
                                  </>
                                )}
                              </Button>
                            )}

                            {uploadError && (
                              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                                {uploadError}
                              </div>
                            )}

                            {(previewUrls.length > 0 || urlImages.length > 0) && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-700">Selected Images:</h4>
                                <div className="grid grid-cols-3 gap-1">
                                  {previewUrls.map((url, index) => (
                                    <div key={index} className="relative group">
                                      <img
                                        src={url}
                                        alt={`Preview ${index + 1}`}
                                        className="w-full h-16 object-cover rounded border border-gray-200"
                                      />
                                      <button
                                        onClick={() => {
                                          setSelectedFiles(prev => prev.filter((_, i) => i !== index))
                                          setPreviewUrls(prev => prev.filter((_, i) => i !== index))
                                        }}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="h-2 w-2" />
                                      </button>
                                    </div>
                                  ))}
                                  {urlImages.map((img, index) => (
                                    <div key={index} className="relative group">
                                      <img
                                        src={img.imageUrl}
                                        alt={img.altText}
                                        className="w-full h-16 object-cover rounded border border-gray-200"
                                        onError={(e) => {
                                          e.currentTarget.src = '/placeholder.svg'
                                        }}
                                      />
                                      <button
                                        onClick={() => removeUrlImage(index)}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="h-2 w-2" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Current Images */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Current Images ({currentImageUrls.length}):</h4>
                          {currentImageUrls.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {currentImageUrls.map((image) => (
                                <div key={image.imageId} className="relative group bg-gray-100 rounded-lg overflow-hidden">
                                  <img
                                    src={image.imageUrl}
                                    alt={image.altText}
                                    className="w-full h-48 md:h-56 object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setPreviewImage(image)}
                                    onError={(e) => {
                                      e.currentTarget.src = '/placeholder.svg'
                                    }}
                                  />
                                  {isOwner && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteImage(image.imageId)
                                      }}
                                      disabled={isDeleting === image.imageId}
                                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 shadow-lg"
                                    >
                                      {isDeleting === image.imageId ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                      ) : (
                                        <X className="h-3 w-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Camera className="w-8 h-8 text-gray-400" />
                              </div>
                              <p className="text-sm font-medium">No images yet</p>
                              <p className="text-xs mt-1">Upload images to showcase this place</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
            ) : (
              <div className="text-center py-12">
                <Building className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-500">No place details available</p>
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>

    {/* Image Preview Modal */}
    <Dialog open={!!previewImage} onOpenChange={(open) => {
      if (!open) {
        setPreviewImage(null)
      }
    }}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden rounded-2xl">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                <ZoomIn className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Image Preview</h2>
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
          </div>

          <div className="flex-1 bg-gray-50 p-8 overflow-auto flex items-center justify-center">
            {previewImage ? (
              <img
                src={previewImage.imageUrl}
                alt={previewImage.altText || 'Preview image'}
                className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl"
                onError={(e) => { e.currentTarget.src = '/placeholder.svg' }}
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

    <AlertDialog open={!!confirmAction} onOpenChange={(open) => {
      if (!open && !isProcessingConfirm) {
        setConfirmAction(null)
      }
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmAction ? confirmCopy[confirmAction.type].title : ''}</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmAction ? confirmCopy[confirmAction.type].description : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessingConfirm} onClick={() => setConfirmAction(null)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmAction} disabled={isProcessingConfirm}>
            {isProcessingConfirm ? 'Processing...' : 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Edit Place Modal */}
    {placeDetail && (
      <EditPlaceModal
        placeId={placeDetail.placeId}
        open={isEditModalOpen}
        onClose={handleEditClose}
        initialData={{
          placeId: placeDetail.placeId,
          name: placeDetail.name,
          description: placeDetail.description,
          categoryId: placeDetail.categoryId,
          categoryName: placeDetail.categoryName,
          addressLine1: placeDetail.addressLine1,
          openTime: placeDetail.openTime,
          closeTime: placeDetail.closeTime,
          city: placeDetail.city,
          stateProvince: placeDetail.stateProvince,
          phoneNumber: placeDetail.phoneNumber,
          websiteUrl: placeDetail.websiteUrl,
          email: placeDetail.email,
          bestTimeToVisit: placeDetail.bestTimeToVisit,
          busyTime: placeDetail.busyTime,
          suitableFor: placeDetail.suitableFor,
          latitude: placeDetail.latitude,
          longitude: placeDetail.longitude,
          googlePlaceId: placeDetail.googlePlaceId || '',
          imageUrls: placeDetail.imageUrls
        }}
        onUpdated={handleEditSuccess}
      />
    )}
    </>
  )
}
