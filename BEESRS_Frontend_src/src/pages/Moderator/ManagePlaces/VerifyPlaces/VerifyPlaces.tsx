import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import {
  MapPin,
  Clock,
  Phone,
  Globe,
  Mail,
  Star,
  Image as ImageIcon,
  ShieldCheck,
  XCircle,
  RefreshCw,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  Heart,
  DollarSign,
  Sparkles,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react'
import { ViewAllPendingPlace, VerifyPlace } from '@/services/moderatorService'
import { convertUtcToLocalTime } from '@/utils/timezone'

interface PlaceImage {
  imageId: string
  imageUrl: string
  altText: string
}

interface PendingPlace {
  placeId: string
  googlePlaceId: string
  latitude?: number
  longitude?: number
  categoryId?: number
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
  aiCategoryConfidence?: number | null
  aiSuggestedTags?: string | null
  aiPriceEstimate?: number | null
  verificationStatus: string
  fullName: string
  createdByAvatar?: string | null
  createdAt: string
  updatedAt: string
  verifiedAt?: string | null
  imageUrls: PlaceImage[]
}

type VerificationStatus = 'Approved' | 'Rejected'

interface ActionModalState {
  open: boolean
  status: VerificationStatus
  place: PendingPlace | null
  notes: string
  isVerified: boolean
}

export default function VerifyPlaces() {
  const [pendingPlaces, setPendingPlaces] = useState<PendingPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionModal, setActionModal] = useState<ActionModalState>({
    open: false,
    status: 'Approved',
    place: null,
    notes: '',
    isVerified: false
  })
  const [previewImages, setPreviewImages] = useState<PlaceImage[]>([])
  const [previewIndex, setPreviewIndex] = useState(0)
  const isPreviewOpen = previewImages.length > 0
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const fetchPendingPlaces = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await ViewAllPendingPlace()
      if (Array.isArray(response)) {
        setPendingPlaces(response)
      } else if (response?.items) {
        setPendingPlaces(response.items)
      } else {
        setPendingPlaces([])
      }
    } catch (err: any) {
      console.error('Error fetching pending places:', err)
      setError(err?.response?.data?.message || err?.message || 'Failed to load pending places')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingPlaces()
  }, [])

  const filteredPlaces = useMemo(() => {
    if (!searchTerm.trim()) return pendingPlaces
    const normalized = searchTerm.toLowerCase()
    return pendingPlaces.filter((place) =>
      [place.name, place.categoryName, place.addressLine1, place.city, place.stateProvince]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(normalized))
    )
  }, [pendingPlaces, searchTerm])

  const summaryCards = [
    {
      label: 'Pending submissions',
      value: pendingPlaces.length > 20 ? '20+' : pendingPlaces.length,
      helper: `${pendingPlaces.length} total`
    },
    {
      label: 'Avg. rating (visible)',
      value:
        filteredPlaces.length > 0
          ? (
              filteredPlaces.reduce((sum, place) => sum + (place.averageRating || 0), 0) /
              filteredPlaces.length
            ).toFixed(1)
          : '—',
      helper: 'Based on submissions'
    },
    {
      label: 'Last sync',
      value: new Date().toLocaleDateString('en-US'),
      helper: 'Local time'
    }
  ]

  const openActionModal = (place: PendingPlace, status: VerificationStatus) => {
    setActionModal({
      open: true,
      status,
      place,
      notes: '',
      isVerified: false
    })
  }

  const closeActionModal = () => {
    setActionModal((prev) => ({ ...prev, open: false, place: null, notes: '', isVerified: false }))
  }

  const handleSubmitVerification = async () => {
    if (!actionModal.place) return

    try {
      setSubmitting(true)
      await VerifyPlace({
        placeId: actionModal.place.placeId,
        status: actionModal.status,
        notes: actionModal.notes
      })
      toast({
        title: `Place ${actionModal.status === 'Approved' ? 'approved' : 'rejected'}`,
        description: `${actionModal.place.name} has been ${actionModal.status.toLowerCase()} successfully.`,
        variant: 'default'
      })
      
      // Show success screen instead of closing immediately
      setActionModal((prev) => ({ ...prev, isVerified: true }))
      setSubmitting(false)
      
      // Refresh data after showing success
      fetchPendingPlaces()
    } catch (err: any) {
      toast({
        title: 'Verification failed',
        description: err?.response?.data?.message || err?.message || 'Please try again later.',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
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
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPriceLevel = (level: number | null) => {
    if (!level) return 'Not specified'
    const priceLevels = ['', 'Cheap', 'Fair', 'Moderate', 'Expensive', 'Luxury']
    return priceLevels[level] || 'Not specified'
  }

  const getTagList = (value?: string | null) => {
    if (!value) return []
    return value.split(',').map((tag) => tag.trim()).filter(Boolean)
  }

  const formatCoordinate = (value?: number) => {
    if (value === undefined || value === null || Number.isNaN(value)) return 'N/A'
    return value.toFixed(5)
  }

  const renderStars = (rating?: number) =>
    Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          rating && index < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ))

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-green-100 text-green-800 border border-green-200">Approved</Badge>
      case 'Rejected':
        return <Badge className="bg-red-100 text-red-800 border border-red-200">Rejected</Badge>
      default:
        return <Badge className="bg-yellow-50 text-yellow-800 border border-yellow-200">Pending</Badge>
    }
  }

  const getInitial = (name?: string) => {
    if (!name) return '?'
    return name.trim().charAt(0).toUpperCase()
  }

  const openImagePreview = (images: PlaceImage[], index: number) => {
    if (!images.length) return
    setPreviewImages(images)
    setPreviewIndex(index)
  }

  const closeImagePreview = () => {
    setPreviewImages([])
    setPreviewIndex(0)
  }

  const showImageNavigation = previewImages.length > 1

  const goPreview = (direction: 'prev' | 'next') => {
    if (!showImageNavigation) return
    setPreviewIndex((prev) => {
      const next = direction === 'next' ? prev + 1 : prev - 1
      if (next < 0) return previewImages.length - 1
      if (next >= previewImages.length) return 0
      return next
    })
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget
    // Avoid infinite retry loops on broken links
    if (target.dataset.fallbackApplied === 'true') return
    target.dataset.fallbackApplied = 'true'
    target.src = '/placeholder.jpg'
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-gray-600">Loading pending places...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-purple-50 p-6 shadow-xl"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-500 text-white shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Pending Places Review</h2>
              <p className="text-sm text-gray-500 mt-1">
                Curate employee submissions with the same immersive storytelling used on the public feed.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Showing {filteredPlaces.length} / {pendingPlaces.length} submission(s)
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by name, category, or city..."
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={fetchPendingPlaces}
              className="flex items-center gap-2 border-blue-200 text-blue-600"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
        <div className="grid gap-4 pt-6 sm:grid-cols-3">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500">{card.helper}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={fetchPendingPlaces}>
            Retry
          </Button>
        </motion.div>
      )}

      {filteredPlaces.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border border-dashed border-blue-200 bg-white/80">
            <CardContent className="py-16 flex flex-col items-center text-center space-y-4">
              <ShieldCheck className="w-12 h-12 text-blue-500" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">No places to verify</h3>
                <p className="text-gray-600 mt-1">
                  All submissions are processed. Grab a coffee and check back soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <AnimatePresence>
          {filteredPlaces.map((place, index) => {
            const mapsUrl = place.googlePlaceId
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.googlePlaceId}`
              : `https://www.google.com/maps/search/${encodeURIComponent(place.addressLine1 || place.name)}`
            return (
              <motion.div
                key={place.placeId}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Card className="relative overflow-hidden border-0 bg-white shadow-lg transition-all hover:shadow-blue-200">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-80" />
                  <CardContent className="relative p-6 space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white flex items-center justify-center font-semibold text-lg overflow-hidden border-2 border-white shadow">
                          {place.createdByAvatar ? (
                            <img
                              src={place.createdByAvatar}
                              alt={place.fullName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            getInitial(place.fullName)
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900">{place.name}</h3>
                            {place.categoryName && (
                              <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">
                                {place.categoryName}
                              </Badge>
                            )}
                            {getStatusBadge(place.verificationStatus)}
                          </div>
                          <p className="text-sm text-gray-500">Submitted by {place.fullName}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-start sm:items-end gap-2 text-sm text-gray-500">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span>Created {formatDate(place.createdAt)}</span>
                        </div>
                        <div className="text-xs text-gray-400 flex flex-col items-start sm:items-end gap-1">
                          <span>Updated {formatDate(place.updatedAt)}</span>
                          {place.verifiedAt && (
                            <span className="text-green-600">Verified {formatDate(place.verifiedAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      {place.googlePlaceId && (
                        <span className="break-all">
                          <span className="font-medium text-gray-700">Google ID:</span> {place.googlePlaceId}
                        </span>
                      )}
                      {place.categoryId && (
                        <span>
                          <span className="font-medium text-gray-700">Category ID:</span> {place.categoryId}
                        </span>
                      )}
                      <span>
                        <span className="font-medium text-gray-700">Coordinates:</span>{' '}
                        {formatCoordinate(place.latitude)}, {formatCoordinate(place.longitude)}
                      </span>
                    </div>

                    {(place.averageRating > 0 || (place.totalLikes ?? 0) > 0) && (
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        {place.averageRating > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">{renderStars(place.averageRating)}</div>
                            <span className="font-semibold text-gray-900">
                              {place.averageRating.toFixed(1)}
                            </span>
                            <span className="text-gray-400">
                              ({place.totalReviews || 0} reviews)
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-rose-500">
                          <Heart className={`w-4 h-4 ${place.totalLikes ? 'fill-current' : ''}`} />
                          <span>{place.totalLikes || 0} likes</span>
                        </div>
                      </div>
                    )}

                    {(place.bestTimeToVisit || place.busyTime) && (
                      <div className="flex flex-wrap gap-2">
                        {place.bestTimeToVisit && (
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                            Best time: {place.bestTimeToVisit}
                          </Badge>
                        )}
                        {place.busyTime && (
                          <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-100">
                            Busy: {place.busyTime}
                          </Badge>
                        )}
                      </div>
                    )}

                    <p className="text-gray-700">{place.description}</p>

                    {place.imageUrls && place.imageUrls.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {place.imageUrls.slice(0, 3).map((image, imageIndex) => (
                          <button
                            key={image.imageId}
                            type="button"
                            onClick={() => openImagePreview(place.imageUrls, imageIndex)}
                            className="group relative overflow-hidden rounded-2xl border border-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            <motion.img
                              src={image.imageUrl}
                              alt={image.altText || place.name}
                              loading="lazy"
                              decoding="async"
                              fetchPriority="low"
                              className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                              whileHover={{ scale: 1.02 }}
                              transition={{ duration: 0.3, delay: imageIndex * 0.05 }}
                              onError={handleImageError}
                            />
                            <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/40" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-800">
                                <ZoomIn className="h-3.5 w-3.5" />
                                View
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 text-gray-500 text-sm">
                        <ImageIcon className="w-5 h-5" />
                        No images provided
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">Address</p>
                          <p>{place.addressLine1}</p>
                          <p>
                            {place.city}, {place.stateProvince}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">Hours</p>
                          <p>
                            {formatTime(place.openTime)} - {formatTime(place.closeTime)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">Price & suitability</p>
                          <p>{getPriceLevel(place.priceLevel)}</p>
                          {getTagList(place.suitableFor).length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {getTagList(place.suitableFor).map((tag) => (
                                <Badge key={tag} variant="secondary" className="bg-white text-gray-700 border border-gray-200">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{place.phoneNumber || 'No phone number'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{place.email || 'No email'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        {place.websiteUrl ? (
                          <a href={place.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Website
                          </a>
                        ) : (
                          <span>No website</span>
                        )}
                      </div>
                    </div>

                    {(place.aiCategoryConfidence !== null && place.aiCategoryConfidence !== undefined) ||
                    (place.aiPriceEstimate !== null && place.aiPriceEstimate !== undefined) ||
                    getTagList(place.aiSuggestedTags).length > 0 ? (
                      <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-4 space-y-3 text-sm text-gray-700">
                        <p className="font-semibold text-gray-900">AI insights</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Categorization confidence</p>
                            <p className="text-lg font-semibold">
                              {place.aiCategoryConfidence !== null && place.aiCategoryConfidence !== undefined
                                ? `${(place.aiCategoryConfidence * 100).toFixed(1)}%`
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Price estimate</p>
                            <p className="text-lg font-semibold">
                              {place.aiPriceEstimate !== null && place.aiPriceEstimate !== undefined
                                ? `$${place.aiPriceEstimate.toFixed(2)}`
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">AI suggested tags</p>
                            {getTagList(place.aiSuggestedTags).length > 0 ? (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {getTagList(place.aiSuggestedTags).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="bg-white text-gray-700 border border-gray-200">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p>N/A</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-3 pt-4 border-t border-white">
                      <Button variant="outline" asChild className="border-blue-200 text-blue-600 hover:bg-blue-400">
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Preview on map
                        </a>
                      </Button>
                      <div className="flex flex-wrap gap-2">
                        <Button className="bg-green-600 hover:bg-green-700" onClick={() => openActionModal(place, 'Approved')}>
                          Approve
                        </Button>
                        <Button variant="destructive" onClick={() => openActionModal(place, 'Rejected')}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      )}

      {/* Action dialog */}
      <Dialog open={actionModal.open} onOpenChange={(open) => !open && closeActionModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionModal.status === 'Approved' ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  Approve place
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  Reject place
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionModal.place?.name} • Submitted by {actionModal.place?.fullName}
            </DialogDescription>
          </DialogHeader>
          {actionModal.isVerified ? (
            <AnimatePresence mode="wait">
              <motion.div
                key="success-screen"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ 
                  duration: 0.4,
                  ease: [0.16, 1, 0.3, 1]
                }}
                className="flex flex-col items-center justify-center gap-6 py-12 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    delay: 0.1,
                    type: "spring",
                    stiffness: 200,
                    damping: 15
                  }}
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
                    actionModal.status === 'Approved'
                      ? 'bg-gradient-to-br from-green-100 to-emerald-100'
                      : 'bg-gradient-to-br from-red-100 to-rose-100'
                  }`}
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ 
                      delay: 0.2,
                      type: "spring",
                      stiffness: 200,
                      damping: 15
                    }}
                  >
                    {actionModal.status === 'Approved' ? (
                      <CheckCircle className="w-12 h-12 text-green-500" />
                    ) : (
                      <XCircle className="w-12 h-12 text-red-500" />
                    )}
                  </motion.div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="space-y-2"
                >
                  <h3 className="text-2xl font-bold text-gray-900">
                    Place {actionModal.status === 'Approved' ? 'approved' : 'rejected'}
                  </h3>
                  <p className="text-base text-gray-600 max-w-md">
                    {actionModal.status === 'Approved'
                      ? `"${actionModal.place?.name}" has been approved and is now visible to all users. The verification process is complete.`
                      : `"${actionModal.place?.name}" has been rejected. The place will not be published and the submission has been declined.`}
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  <Button 
                    onClick={closeActionModal}
                    className={`mt-4 px-8 py-2 transition-all duration-200 hover:scale-105 ${
                      actionModal.status === 'Approved'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    Close
                  </Button>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Please provide a short note so the owner understands your decision.
                </p>
                <Textarea
                  value={actionModal.notes}
                  onChange={(e) => setActionModal((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  placeholder="Add moderator notes (optional but recommended)"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeActionModal} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitVerification}
                  disabled={submitting}
                  className={actionModal.status === 'Approved' ? 'bg-green-600 hover:bg-green-700' : undefined}
                  variant={actionModal.status === 'Approved' ? 'default' : 'destructive'}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {actionModal.status === 'Approved' ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve place
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject place
                        </>
                      )}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={(open) => !open && closeImagePreview()}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden rounded-2xl">
          <div className="flex flex-col h-full">
            <DialogHeader className="flex flex-row items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50 space-y-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900">Image Preview</DialogTitle>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {previewImages[previewIndex]?.altText || 'Place image'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeImagePreview}
                className="text-gray-400 hover:text-gray-600 transition-all duration-200 rounded-full p-2 hover:bg-white hover:scale-110"
                aria-label="Close preview"
              >
                <X className="w-6 h-6" />
              </button>
            </DialogHeader>

            <div className="flex-1 bg-gray-50 p-6 overflow-auto flex items-center justify-center relative">
              {showImageNavigation && (
                <>
                  <button
                    type="button"
                    onClick={() => goPreview('prev')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 text-gray-700 shadow-xl flex items-center justify-center hover:bg-white hover:text-gray-900 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goPreview('next')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 text-gray-700 shadow-xl flex items-center justify-center hover:bg-white hover:text-gray-900 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-4 right-5 bg-white/90 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 shadow-lg">
                    {previewIndex + 1}/{previewImages.length}
                  </div>
                </>
              )}

              {previewImages[previewIndex] ? (
                <img
                  src={previewImages[previewIndex].imageUrl}
                  alt={previewImages[previewIndex].altText || 'Preview image'}
                  className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'
                  }}
                />
              ) : null}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t bg-gray-50">
              <Button variant="outline" onClick={closeImagePreview} className="transition-all duration-200 hover:scale-105 px-6">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

