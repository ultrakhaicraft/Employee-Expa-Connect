import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Label } from '@/components/ui/label'
import { 
  Star, 
  Calendar,
  User,
  Flag,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react'
import { ViewAllReportedReview, SolveReportedReview } from '@/services/moderatorService'
import PageTransition from '@/components/Transition/PageTransition'

interface ReviewReport {
  reportId: string
  reviewId: string
  reportedByUserId: string
  reportedByUserFullName: string
  reportedByUserProfilePictureUrl: string | null
  reason: string
  reportedAt: string
}

interface ReportedReview {
  reviewReports: ReviewReport[]
  reviewId: string
  placeId: string
  name: string | null
  userId: string
  fullName: string | null
  profilePictureUrl: string | null
  title: string
  reviewText: string
  reviewType: string
  overallRating: number
  foodQualityRating: number
  serviceRating: number
  atmosphereRating: number
  priceLevelRating: number
  helpfulVotes: number
  notHelpfulVotes: number
  visitDate: string
  visitType: string
  isPublished: boolean
  isFlagged: boolean
  moderationStatus: string
  moderationReason: string | null
  createdAt: string
  updatedAt: string
  reviewImageUrls: string[]
}

interface ReportedReviewsResponse {
  page: number
  pageSize: number
  totalItems: number
  items: ReportedReview[]
}

export default function ViewReportedReview() {
  const [reviews, setReviews] = useState<ReportedReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 10

  // Moderation modal state
  const [isModerationModalOpen, setIsModerationModalOpen] = useState(false)
  const [selectedReviewForModeration, setSelectedReviewForModeration] = useState<ReportedReview | null>(null)
  const [moderationAction, setModerationAction] = useState<'approve' | 'reject' | null>(null)
  const [moderationReason, setModerationReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isModerated, setIsModerated] = useState(false)

  const { toast } = useToast()

  const fetchReportedReviews = async (page: number = 1) => {
    try {
      setIsLoading(true)
      setError('')
      
      const response: ReportedReviewsResponse = await ViewAllReportedReview({
        page,
        pageSize
      })

      if (response) {
        setReviews(response.items || [])
        setTotalPages(Math.ceil((response.totalItems || 0) / pageSize))
        setTotalCount(response.totalItems || 0)
        setCurrentPage(response.page || 1)
      } else {
        // Handle case where response is null/undefined
        setReviews([])
        setTotalPages(0)
        setTotalCount(0)
        setCurrentPage(1)
      }
    } catch (error: any) {
      console.error('Error fetching reported reviews:', error)
      setError(error.response?.data?.message || error.message || 'Failed to load reported reviews')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReportedReviews(1)
  }, [])

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isModerationModalOpen) {
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
  }, [isModerationModalOpen])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      fetchReportedReviews(newPage)
    }
  }

  const handleModerateReview = (review: ReportedReview, action: 'approve' | 'reject') => {
    setSelectedReviewForModeration(review)
    setModerationAction(action)
    setModerationReason('')
    setIsModerationModalOpen(true)
  }

  const handleCloseModerationModal = () => {
    setIsModerationModalOpen(false)
    setSelectedReviewForModeration(null)
    setModerationAction(null)
    setModerationReason('')
    setIsModerated(false)
  }

  const handleSubmitModeration = async () => {
    if (!selectedReviewForModeration || !moderationAction || !moderationReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a moderation reason.",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      await SolveReportedReview({
        reviewId: selectedReviewForModeration.reviewId,
        isValidReport: moderationAction === 'approve', // true for approve (remove review), false for reject (keep review)
        moderationReason: moderationReason.trim()
      })

      toast({
        title: "Moderation Complete",
        description: `Review ${moderationAction === 'approve' ? 'approved and removed' : 'rejected - report dismissed'} successfully.`,
        variant: "default"
      })

      // Show success screen instead of closing immediately
      setIsModerated(true)
      setIsSubmitting(false)

      // Refresh the reviews list
      await fetchReportedReviews(currentPage)
    } catch (error: any) {
      console.error('Error moderating review:', error)
      toast({
        title: "Moderation Failed",
        description: error.response?.data?.message || error.message || 'Failed to moderate review',
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const StarRating = ({ rating }: { 
    rating: number
  }) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? 'text-yellow-400 fill-current'
              : 'text-gray-300'
          }`}
        />
      ))}
      <span className="ml-1 text-sm text-gray-600">{rating}/5</span>
    </div>
  )

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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center">
            <AlertTriangle className="mr-2 h-4 w-4" />
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <PageTransition delayMs={100} durationMs={600} variant="zoom">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Reported Reviews</h1>
            <p className="text-gray-600 mt-1">Review and moderate reported content</p>
          </div>

          {/* Results Summary */}
          <div className="mb-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-600">
                Showing {reviews.length} of {totalCount} reported reviews
                {totalPages > 1 && (
                  <span className="ml-2 text-blue-500">
                    (Page {currentPage} of {totalPages})
                  </span>
                )}
              </p>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="p-4 bg-green-50 rounded-full mb-6">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  No reported reviews
                </h3>
                <p className="text-gray-600 text-center max-w-md mb-6">
                  Great! There are currently no reviews that need moderation. The community is maintaining high standards of content quality.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => fetchReportedReviews(1)}
                    className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Refresh List
                  </Button>
                </div>
                <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
                  <Flag className="h-4 w-4" />
                  <span>Last checked: {new Date().toLocaleTimeString()}</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <Card key={review.reviewId} className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                          {review.profilePictureUrl ? (
                            <img 
                              src={review.profilePictureUrl} 
                              alt={review.fullName || 'User'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full flex items-center justify-center ${review.profilePictureUrl ? 'hidden' : ''}`}>
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {review.fullName || 'Anonymous User'}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(review.visitDate)}</span>
                            <Badge variant="outline" className="text-xs">
                              {review.visitType}
                            </Badge>
                            <Badge variant="destructive" className="text-xs text-white">
                              <Flag className="h-3 w-3 mr-1" />
                              Reported
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Overall Rating */}
                      <div className="flex items-center gap-2">
                        <StarRating rating={review.overallRating} />
                      </div>

                      {/* Review Title */}
                      <h5 className="font-medium text-gray-900">{review.title}</h5>

                      {/* Review Text */}
                      <p className="text-gray-700 leading-relaxed">{review.reviewText}</p>

                      {/* Detailed Ratings */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-600">Food Quality</p>
                          <StarRating rating={review.foodQualityRating} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-600">Service</p>
                          <StarRating rating={review.serviceRating} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-600">Atmosphere</p>
                          <StarRating rating={review.atmosphereRating} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-600">Value</p>
                          <StarRating rating={review.priceLevelRating} />
                        </div>
                      </div>

                      {/* Review Images */}
                      {review.reviewImageUrls && review.reviewImageUrls.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3 border-t">
                          {review.reviewImageUrls.map((imageUrl, index) => (
                            <img
                              key={index}
                              src={imageUrl}
                              alt={`Review image ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(imageUrl, '_blank')}
                            />
                          ))}
                        </div>
                      )}

                      {/* Report Details */}
                      <div className="pt-4 border-t bg-red-50 p-4 rounded-lg">
                        <h6 className="font-medium text-red-800 mb-3 flex items-center">
                          <Flag className="h-4 w-4 mr-2" />
                          Report Details ({review.reviewReports.length} report{review.reviewReports.length > 1 ? 's' : ''})
                        </h6>
                        <div className="space-y-3">
                          {review.reviewReports.map((report) => (
                            <div key={report.reportId} className="bg-white p-3 rounded border">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100">
                                    {report.reportedByUserProfilePictureUrl ? (
                                      <img 
                                        src={report.reportedByUserProfilePictureUrl} 
                                        alt={report.reportedByUserFullName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <User className="h-3 w-3 text-gray-500 m-1.5" />
                                    )}
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {report.reportedByUserFullName}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {formatDate(report.reportedAt)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                <strong>Reason:</strong> {report.reason}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Moderation Actions */}
                      <div className="flex gap-3 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleModerateReview(review, 'approve')}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Review
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleModerateReview(review, 'reject')}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Review
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                    if (pageNum > totalPages) return null
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-10 h-10"
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
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Moderation Modal */}
          {isModerationModalOpen && selectedReviewForModeration && moderationAction && createPortal(
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-300" 
              style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0,
                zIndex: 9999
              }}
              onClick={(e) => {
                // Close modal when clicking on backdrop (only if not moderated)
                if (e.target === e.currentTarget && !isSubmitting && !isModerated) {
                  handleCloseModerationModal()
                }
              }}
            >
              <div 
                className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-300" 
                style={{ 
                  maxHeight: '90vh', 
                  margin: 'auto',
                  position: 'relative'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {moderationAction === 'approve' ? 'Approve Review' : 'Reject Review'}
                  </h2>
                  {!isModerated && (
                  <button 
                    onClick={handleCloseModerationModal}
                    disabled={isSubmitting}
                    className="text-gray-400 hover:text-gray-600 transition-all duration-200 hover:bg-gray-100 rounded-full p-2 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  )}
                </div>

                <div className="p-6 space-y-4">
                  {isModerated ? (
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
                            moderationAction === 'approve'
                              ? 'bg-gradient-to-br from-green-100 to-emerald-100'
                              : 'bg-gradient-to-br from-blue-100 to-indigo-100'
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
                            {moderationAction === 'approve' ? (
                              <CheckCircle className="w-12 h-12 text-green-500" />
                            ) : (
                              <XCircle className="w-12 h-12 text-blue-500" />
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
                            {moderationAction === 'approve' ? 'Review removed' : 'Report dismissed'}
                          </h3>
                          <p className="text-base text-gray-600 max-w-md">
                            {moderationAction === 'approve'
                              ? `The review by ${selectedReviewForModeration?.fullName || 'Anonymous User'} has been removed from the platform. The report has been resolved successfully.`
                              : `The report has been dismissed. The review by ${selectedReviewForModeration?.fullName || 'Anonymous User'} will remain on the platform.`}
                          </p>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4, duration: 0.3 }}
                        >
                          <Button 
                            onClick={handleCloseModerationModal}
                            className={`mt-4 px-8 py-2 transition-all duration-200 hover:scale-105 ${
                              moderationAction === 'approve'
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            Close
                          </Button>
                        </motion.div>
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    <>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      You are {moderationAction === 'approve' ? 'approving' : 'rejecting'} a review by <strong>{selectedReviewForModeration.fullName || 'Anonymous User'}</strong>
                    </p>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{selectedReviewForModeration.title}</p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                        {selectedReviewForModeration.reviewText}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="moderation-reason" className="text-sm font-semibold text-gray-700">Moderation Reason *</Label>
                    <textarea
                      id="moderation-reason"
                      value={moderationReason}
                      onChange={(e) => setModerationReason(e.target.value)}
                      placeholder={`Please explain why you are ${moderationAction === 'approve' ? 'approving this report and removing the review' : 'rejecting this report and keeping the review'}...`}
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none mt-2 transition-all duration-200 hover:border-gray-400"
                    />
                  </div>

                  <div className={`p-4 rounded-lg border-2 ${
                    moderationAction === 'approve' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <p className={`text-sm ${
                      moderationAction === 'approve' 
                        ? 'text-green-800' 
                        : 'text-blue-800'
                    }`}>
                      <strong>Action:</strong> {moderationAction === 'approve' 
                        ? 'This will remove the review from the platform as the report is valid.' 
                        : 'This will dismiss the report and keep the review on the platform.'}
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <Button 
                      variant="outline" 
                      onClick={handleCloseModerationModal}
                      disabled={isSubmitting}
                      className="transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmitModeration}
                      disabled={isSubmitting || !moderationReason.trim()}
                      className={`transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:opacity-70 px-6 shadow-lg ${
                        moderationAction === 'approve' 
                          ? "bg-green-600 hover:bg-green-700" 
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          {moderationAction === 'approve' ? (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          {moderationAction === 'approve' ? 'Approve & Remove' : 'Reject Report'}
                        </>
                      )}
                    </Button>
                  </div>
                    </>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      </PageTransition>
    </div>
  )
}