import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { convertUtcToLocalTime } from '@/utils/timezone'
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
  Flag,
  MapPin,
  Clock,
  Users,
  MessageCircle,
  Loader2,
  Search,
  RefreshCw,
  ShieldCheck,
  Star,
  DollarSign,
  Phone,
  Globe,
  Mail,
  AlertTriangle,
  FileText,
  FileCheck2,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  XCircle
} from 'lucide-react'
import {
  GetAllReportedPlaces,
  GetAllReportedOfOnePlace,
  SolveReportedPlace
} from '@/services/moderatorService'

interface PlaceImage {
  imageId: string
  imageUrl: string
  altText: string
}

interface ReportedPlace {
  placeId: string
  name: string
  description: string
  categoryName: string
  addressLine1: string
  city: string
  stateProvince: string
  openTime?: string
  closeTime?: string
  phoneNumber?: string
  websiteUrl?: string
  email?: string
  bestTimeToVisit?: string
  busyTime?: string
  suitableFor?: string
  priceLevel?: number | null
  averageRating?: number
  totalReviews?: number
  totalLikes?: number
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  imageUrls: PlaceImage[]
}

interface PlaceReport {
  reportId: string
  placeId: string
  reason: string
  reportedAt: string
  reporterName: string
  reporterAvatar?: string
  reporterUserId?: string
}

interface ReportSummary {
  count: number
  previewReasons: string[]
  latestReportAt?: string
}

interface ReportsModalState {
  open: boolean
  place: ReportedPlace | null
  reports: PlaceReport[]
  loading: boolean
}

interface ResolveModalState {
  open: boolean
  place: ReportedPlace | null
  note: string
  submitting: boolean
  loading: boolean
  reportId: string | null
  error: string | null
  reportDetails: PlaceReport | null
  pendingAction: 'approve' | 'reject' | null
  isResolved: boolean
}

const fallbackId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

const normalizePlace = (entry: any): ReportedPlace => ({
  placeId: entry.placeId || entry.id || fallbackId(),
  name: entry.name || 'Unnamed place',
  description: entry.description || 'No description provided.',
  categoryName: entry.categoryName || 'Uncategorized',
  addressLine1: entry.addressLine1 || 'No address provided',
  city: entry.city || '',
  stateProvince: entry.stateProvince || '',
  openTime: entry.openTime,
  closeTime: entry.closeTime,
  phoneNumber: entry.phoneNumber,
  websiteUrl: entry.websiteUrl,
  email: entry.email,
  bestTimeToVisit: entry.bestTimeToVisit,
  busyTime: entry.busyTime,
  suitableFor: entry.suitableFor,
  priceLevel: entry.priceLevel,
  averageRating: entry.averageRating,
  totalReviews: entry.totalReviews,
  totalLikes: entry.totalLikes,
  createdBy: entry.createdBy,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
  imageUrls: entry.imageUrls || []
})

export default function ViewReportPlaces() {
  const [places, setPlaces] = useState<ReportedPlace[]>([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [reportsModal, setReportsModal] = useState<ReportsModalState>({
    open: false,
    place: null,
    reports: [],
    loading: false
  })
  const initialResolveModalState: ResolveModalState = {
    open: false,
    place: null,
    note: '',
    submitting: false,
    loading: false,
    reportId: null,
    error: null,
    reportDetails: null,
    pendingAction: null,
    isResolved: false
  }
  const [resolveModal, setResolveModal] = useState<ResolveModalState>(initialResolveModalState)
  const [previewImages, setPreviewImages] = useState<PlaceImage[]>([])
  const [previewIndex, setPreviewIndex] = useState(0)
  const [reportSummaries, setReportSummaries] = useState<Record<string, ReportSummary>>({})
  const { toast } = useToast()
  const [confirmResolveAction, setConfirmResolveAction] = useState<'approve' | 'reject' | null>(null)
  const resolveActionsDisabled =
    resolveModal.submitting ||
    resolveModal.loading ||
    !!resolveModal.error ||
    !resolveModal.reportId ||
    !resolveModal.note.trim()

  const fetchReportedPlaces = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await GetAllReportedPlaces()
      let items: any[] = []
      if (Array.isArray(response)) {
        items = response
        setPagination((prev) => ({ ...prev, total: response.length }))
      } else if (response?.items) {
        items = response.items
        setPagination({
          page: response.page ?? 1,
          pageSize: response.pageSize ?? items.length ?? 20,
          total: response.totalItems ?? items.length ?? 0
        })
      }
      const normalized = items.map(normalizePlace)
      setPlaces(normalized)
    } catch (err: any) {
      console.error('Error fetching reported places:', err)
      setError(err?.response?.data?.message || err?.message || 'Failed to load reported places')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportedPlaces()
  }, [])

  const filteredPlaces = useMemo(() => {
    if (!search.trim()) return places
    const normalized = search.toLowerCase()
    return places.filter((place) =>
      [place.name, place.categoryName, place.addressLine1, place.city, place.stateProvince]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(normalized))
    )
  }, [places, search])

  const openReportsModal = async (place: ReportedPlace) => {
    setReportsModal({
      open: true,
      place,
      reports: [],
      loading: true
    })
    try {
      const response = await GetAllReportedOfOnePlace(place.placeId)
      const items: any[] = Array.isArray(response) ? response : response?.items || []
      const reports: PlaceReport[] = items.map((report: any) => ({
        reportId: report.reportId || report.id || fallbackId(),
        placeId: report.placeId || place.placeId,
        reason: report.reason || 'No reason provided.',
        reportedAt: report.reportedAt || report.createdAt || new Date().toISOString(),
        reporterName: report.fullName || report.reportedBy || 'Anonymous employee',
        reporterAvatar: report.profilePictureUrl || null,
        reporterUserId: report.reportedByUserId
      }))
      setReportsModal({
        open: true,
        place,
        reports,
        loading: false
      })
      setReportSummaries((prev) => ({
        ...prev,
        [place.placeId]: {
          count: reports.length,
          previewReasons: reports.slice(0, 3).map((r) => r.reason),
          latestReportAt: reports[0]?.reportedAt
        }
      }))
    } catch (err: any) {
      console.error('Failed to load reports:', err)
      toast({
        title: 'Unable to load reports',
        description: err?.response?.data?.message || err?.message || 'Please try again later.',
        variant: 'destructive'
      })
      setReportsModal((prev) => ({ ...prev, loading: false }))
    }
  }

  const openResolveModal = async (place: ReportedPlace) => {
    setResolveModal({
      open: true,
      place,
      note: '',
      submitting: false,
      loading: true,
      reportId: null,
      error: null,
      reportDetails: null,
      pendingAction: null,
      isResolved: false
    })

    try {
      const response = await GetAllReportedOfOnePlace(place.placeId)
      const items: any[] = Array.isArray(response) ? response : response?.items || []
      if (!items.length) {
        setResolveModal((prev) => ({
          ...prev,
          loading: false,
          error: 'No reports available to resolve for this place.',
          reportId: null,
          reportDetails: null,
          pendingAction: null
        }))
        return
      }

      const target = items[0]
      const normalizedReport: PlaceReport = {
        reportId: target.reportId || target.id || fallbackId(),
        placeId: target.placeId || place.placeId,
        reason: target.reason || 'No reason provided.',
        reportedAt: target.reportedAt || target.createdAt || new Date().toISOString(),
        reporterName: target.fullName || target.reportedBy || 'Anonymous employee',
        reporterAvatar: target.profilePictureUrl || null,
        reporterUserId: target.reportedByUserId
      }

      setResolveModal((prev) => ({
        ...prev,
        loading: false,
        reportId: normalizedReport.reportId,
        reportDetails: normalizedReport,
        error: null,
        pendingAction: null
      }))
    } catch (err: any) {
      setResolveModal((prev) => ({
        ...prev,
        loading: false,
        error: err?.response?.data?.message || err?.message || 'Failed to load report details.',
        reportId: null,
        reportDetails: null,
        pendingAction: null
      }))
    }
  }

  const closeResolveModal = () => setResolveModal(initialResolveModalState)

  const handleReportResolution = async (isValid: boolean) => {
    if (!resolveModal.place || !resolveModal.reportId) {
      toast({
        title: 'Unable to resolve report',
        description: 'Missing report details. Please reload and try again.',
        variant: 'destructive'
      })
      return
    }

    if (!resolveModal.note.trim()) {
      toast({
        title: 'Add a resolution note',
        description: 'Please describe the outcome before resolving this report.',
        variant: 'destructive'
      })
      return
    }

    try {
      const pendingAction: 'approve' | 'reject' = isValid ? 'approve' : 'reject'
      setResolveModal((prev) => ({ ...prev, submitting: true, pendingAction }))
      await SolveReportedPlace({
        reportId: resolveModal.reportId,
        resolvedNote: resolveModal.note.trim(),
        isValid
      })

      toast({
        title: isValid ? 'Report approved' : 'Report rejected',
        description: `${resolveModal.place.name} has been ${isValid ? 'approved' : 'rejected'} based on your review.`,
        variant: 'default'
      })

      // Show success screen instead of closing immediately
      setResolveModal((prev) => ({ ...prev, isResolved: true, submitting: false }))
      
      // Refresh data after showing success
      setReportSummaries((prev) => {
        const next = { ...prev }
        delete next[resolveModal.place!.placeId]
        return next
      })
      fetchReportedPlaces()
    } catch (err: any) {
      toast({
        title: isValid ? 'Failed to approve report' : 'Failed to reject report',
        description: err?.response?.data?.message || err?.message || 'Please try again later.',
        variant: 'destructive'
      })
      setResolveModal((prev) => ({ ...prev, submitting: false, pendingAction: null }))
    }
  }

  const formatTime = (time?: string) => {
    if (!time) return 'N/A'
    // Convert UTC time from backend to local timezone for display
    const timezone = localStorage.getItem('timezone')
    return convertUtcToLocalTime(time, timezone)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPriceLevel = (level?: number | null) => {
    if (!level) return 'Not specified'
    const priceLevels = ['', 'Cheap', 'Fair', 'Moderate', 'Expensive', 'Luxury']
    return priceLevels[level] || 'Not specified'
  }

  const getTagList = (value?: string) => {
    if (!value) return []
    return value.split(',').map((tag) => tag.trim()).filter(Boolean)
  }

  const renderStars = (rating?: number) =>
    Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${rating && index < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ))

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
        <p className="text-gray-600">Loading reported places...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Flag className="w-6 h-6 text-rose-500" />
            Reported Places
          </h2>
          <p className="text-gray-600">
            Review community flags, inspect the original submission, and resolve the incident when appropriate.
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Showing {filteredPlaces.length} of {pagination.total} place(s)
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by place, category, or address..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2" onClick={fetchReportedPlaces}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={fetchReportedPlaces}>
            Retry
          </Button>
        </div>
      )}

      {filteredPlaces.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center text-center space-y-4">
            <ShieldCheck className="w-12 h-12 text-green-500" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">No open reports</h3>
              <p className="text-gray-600 mt-1">
                There are currently no places requiring moderator attention. Enjoy the breather!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredPlaces.map((place) => {
            const summary = reportSummaries[place.placeId]
            return (
              <Card key={place.placeId} className="border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 space-y-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center justify-center font-semibold text-lg">
                        {getInitial(place.createdBy)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900">{place.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {place.categoryName}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          Submitted by {place.createdBy || 'Unknown contributor'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MessageCircle className="w-4 h-4 text-rose-500" />
                      {summary ? (
                        <>
                          <span>{summary.count} report(s)</span>
                          <span className="text-gray-400">•</span>
                          <span>Last: {formatDate(summary.latestReportAt)}</span>
                        </>
                      ) : (
                        <span>Load reports to see details</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      {renderStars(place.averageRating)}
                      <span className="font-medium text-gray-900">
                        {place.averageRating?.toFixed(1) || '—'}
                      </span>
                      <span className="text-gray-400">
                        ({place.totalReviews || 0} reviews · {place.totalLikes || 0} likes)
                      </span>
                    </div>
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

                  <p className="text-gray-700">{place.description}</p>

                  {summary?.previewReasons && summary.previewReasons.length > 0 && (
                    <div className="space-y-2">
                      {summary.previewReasons.map((reason, index) => (
                        <div
                          key={`${place.placeId}-reason-${index}`}
                          className="flex items-start gap-2 text-sm text-gray-600 bg-rose-50/70 border border-rose-100 rounded-lg p-3"
                        >
                          <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {place.imageUrls && place.imageUrls.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {place.imageUrls.slice(0, 3).map((image) => (
                        <button
                          key={image.imageId}
                          type="button"
                          onClick={() => openImagePreview(place.imageUrls, place.imageUrls.indexOf(image))}
                          className="relative group overflow-hidden rounded-xl border border-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <img
                            src={image.imageUrl}
                            alt={image.altText || place.name}
                            loading="lazy"
                            decoding="async"
                            fetchPriority="low"
                            className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/placeholder.jpg'
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/40">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-800 opacity-0 group-hover:opacity-100">
                              <ZoomIn className="h-3.5 w-3.5" />
                              View
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">Address</p>
                          <p>{place.addressLine1}</p>
                          <p>{place.city}, {place.stateProvince}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">Hours</p>
                          <p>{formatTime(place.openTime)} - {formatTime(place.closeTime)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">Price level</p>
                          <p>{getPriceLevel(place.priceLevel)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{place.phoneNumber || 'No phone number'}</span>
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
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{place.email || 'No email'}</span>
                      </div>
                      {getTagList(place.suitableFor).length > 0 && (
                        <div className="flex items-start gap-2">
                          <Users className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">Suitable for</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {getTagList(place.suitableFor).map((tag) => (
                                <Badge key={tag} variant="secondary">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100 mt-2">
                    <Button variant="outline" onClick={() => openReportsModal(place)}>
                      View reports
                    </Button>
                    <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => openResolveModal(place)}>
                      Resolve reports
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={reportsModal.open} onOpenChange={(open) => !open && setReportsModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reports for {reportsModal.place?.name}</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {reportsModal.reports.length} report(s) submitted by employees
            </DialogDescription>
          </DialogHeader>
          {reportsModal.loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading reports...</span>
            </div>
          ) : reportsModal.reports.length === 0 ? (
            <p className="text-sm text-gray-600">No detailed reports available for this place.</p>
          ) : (
            <div className="space-y-4">
              {reportsModal.reports.map((report) => (
                <div key={report.reportId} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {report.reporterAvatar ? (
                      <img
                        src={report.reporterAvatar}
                        alt={report.reporterName}
                        className="w-12 h-12 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-semibold">
                        {report.reporterName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-rose-500" />
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{report.reporterName}</span>
                            {report.reporterUserId && (
                              <span className="text-xs text-gray-400">
                                User ID: <code className="font-mono">{report.reporterUserId}</code>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <span className="block text-gray-600">{formatDate(report.reportedAt)}</span>
                          <span className="text-gray-400">Report ID: <code className="font-mono">{report.reportId.slice(0, 8)}</code></span>
                        </div>
                      </div>
                      <div className="rounded-lg bg-rose-50/70 border border-rose-100 p-3 text-sm text-gray-800">
                        {report.reason}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportsModal((prev) => ({ ...prev, open: false }))}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resolveModal.open} onOpenChange={(open) => {
        if (!open && !resolveModal.isResolved) closeResolveModal()
        if (!open && resolveModal.isResolved) closeResolveModal()
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-rose-600" />
              Resolve reports
            </DialogTitle>
            <DialogDescription>
              Add a short note describing the outcome for {resolveModal.place?.name}. This will be stored in the audit log.
            </DialogDescription>
          </DialogHeader>
          {resolveModal.loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading report details...</span>
            </div>
          ) : resolveModal.isResolved ? (
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
                    resolveModal.pendingAction === 'approve'
                      ? 'bg-gradient-to-br from-emerald-100 to-green-100'
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
                    {resolveModal.pendingAction === 'approve' ? (
                      <CheckCircle className="w-12 h-12 text-emerald-500" />
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
                    {resolveModal.pendingAction === 'approve' ? 'Report approved' : 'Report rejected'}
                  </h3>
                  <p className="text-base text-gray-600 max-w-md">
                    {resolveModal.pendingAction === 'approve'
                      ? `The report for "${resolveModal.place?.name}" has been approved. The place will remain visible and the report has been resolved.`
                      : `The report for "${resolveModal.place?.name}" has been rejected. The place will remain in its current state.`}
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  <Button 
                    onClick={closeResolveModal}
                    className={`mt-4 px-8 py-2 transition-all duration-200 hover:scale-105 ${
                      resolveModal.pendingAction === 'approve'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
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
              <div className="space-y-4">
                {resolveModal.reportDetails && (
                  <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-4 text-sm text-gray-700 space-y-2">
                    <div className="flex items-center gap-2 text-gray-600 text-xs uppercase tracking-wide">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Latest report context
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm">
                      <div>
                        <p className="font-semibold text-gray-900">{resolveModal.reportDetails.reporterName}</p>
                        {resolveModal.reportDetails.reporterUserId && (
                          <p className="text-xs text-gray-500">User ID: {resolveModal.reportDetails.reporterUserId}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(resolveModal.reportDetails.reportedAt)}</span>
                    </div>
                    <p className="text-gray-800">{resolveModal.reportDetails.reason}</p>
                  </div>
                )}

                {resolveModal.error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {resolveModal.error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Resolution note *</label>
                  <Textarea
                    value={resolveModal.note}
                    onChange={(e) => setResolveModal((prev) => ({ ...prev, note: e.target.value }))}
                    rows={5}
                    placeholder="Explain how you resolved this case..."
                    disabled={resolveModal.submitting || !!resolveModal.error}
                  />
                </div>
              </div>
              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button variant="outline" onClick={closeResolveModal} disabled={resolveModal.submitting}>
                  Cancel
                </Button>
                <div className="flex w-full gap-2 sm:w-auto">
                  <Button
                    onClick={() => setConfirmResolveAction('approve')}
                    disabled={resolveActionsDisabled}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {resolveModal.submitting && resolveModal.pendingAction === 'approve' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setConfirmResolveAction('reject')}
                    disabled={resolveActionsDisabled}
                    className="flex-1"
                  >
                    {resolveModal.submitting && resolveModal.pendingAction === 'reject' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Reject
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={previewImages.length > 0} onOpenChange={(open) => {
        if (!open) closeImagePreview()
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden rounded-2xl">
          <div className="flex flex-col h-full">
            <DialogHeader className="flex flex-row items-center justify-between p-6 border-b bg-gradient-to-r from-rose-50 to-pink-50 space-y-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-rose-200 rounded-xl flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900">Image preview</DialogTitle>
                  <DialogDescription>
                    {previewImages[previewIndex]?.altText || 'Reported place image'}
                  </DialogDescription>
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
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 text-gray-700 shadow-xl flex items-center justify-center hover:bg-white hover:text-gray-900 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-500"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goPreview('next')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 text-gray-700 shadow-xl flex items-center justify-center hover:bg-white hover:text-gray-900 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-500"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-4 right-5 bg-white/90 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 shadow-lg">
                    {previewIndex + 1}/{previewImages.length}
                  </div>
                </>
              )}

              {previewImages[previewIndex] && (
                <img
                  src={previewImages[previewIndex].imageUrl}
                  alt={previewImages[previewIndex].altText || 'Preview image'}
                  className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-lg"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'
                  }}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmResolveAction} onOpenChange={(open) => {
        if (!open) setConfirmResolveAction(null)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmResolveAction === 'approve' ? 'Approve reported place?' : 'Reject reported place?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmResolveAction === 'approve'
                ? 'This will mark the latest report as valid and keep the place visible to other employees.'
                : 'This will reject the latest report and keep the place in its current state.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resolveModal.submitting} onClick={() => setConfirmResolveAction(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={resolveModal.submitting}
              onClick={() => {
                const action = confirmResolveAction
                setConfirmResolveAction(null)
                if (action) {
                  handleReportResolution(action === 'approve')
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

