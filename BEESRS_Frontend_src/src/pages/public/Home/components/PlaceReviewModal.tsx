import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { colors } from '@/lib/colors'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Star, 
  X, 
  Calendar, 
  User, 
  Edit, 
  Trash2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  MessageSquare, 
  MoreVertical, 
  Flag,
  Camera,
  Plus,
  CheckCircle
} from 'lucide-react'
import { 
  ViewAllReviewByPlaceId, 
  CreateReviewPlace, 
  UpdateReviewPlace, 
  DeleteReviewPlace, 
  ReportReviewPlace 
} from '@/services/userService'
import { uploadMultipleToCloudinary } from '@/services/cloudinaryService'

interface Review {
  reviewId: string
  placeId: string
  name: string
  userId: string
  fullName: string
  profilePictureUrl: string
  reviewText: string
  overallRating: number
  foodQualityRating: number
  serviceRating: number
  atmosphereRating: number
  priceLevelRating: number
  helpfulVotes: number
  notHelpfulVotes: number
  visitDate: string
  visitType: string
  isFlagged: boolean
  moderationStatus: string
  moderationReason: string | null
  createdAt: string
  updatedAt: string
  reviewImageUrls: string[]
  isMyReview?: boolean
}

interface PlaceReviewModalProps {
  isOpen: boolean
  onClose: () => void
  placeId: string
  placeName: string
  currentUserId?: string
  onReviewCreated?: () => void
  onReviewUpdated?: () => void
  onReviewDeleted?: () => void
}

interface ReviewImage {
  file: File
  preview: string
  altText: string
}

const visitTypes = [
  'Meeting',
  'Business Lunch',
  'Team Dinner', 
  'Casual',
  'Date',
  'Friend',
  'Partner',
  'Family',
  'Solo',
  'Group',
  'Other'
]

export default function PlaceReviewModal({ 
  isOpen, 
  onClose, 
  placeId, 
  placeName, 
  currentUserId, 
  onReviewCreated,
  onReviewUpdated,
  onReviewDeleted 
}: PlaceReviewModalProps) {
  const navigate = useNavigate()
  // Get current user from Redux store as fallback
  const authState = useSelector((state: any) => state.auth)
  const reduxCurrentUserId = authState.decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]
  
  // Try multiple sources for currentUserId
  const actualCurrentUserId = currentUserId || 
                             reduxCurrentUserId || 
                             (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}')?.userId : null)

  // Helper function to handle profile navigation (similar to PlaceCard)
  const handleReviewerProfileClick = (reviewUserId: string) => {
    if (!reviewUserId) return
    
    const reviewUserIdNormalized = String(reviewUserId).trim().toLowerCase()
    const currentUserIdNormalized = actualCurrentUserId ? String(actualCurrentUserId).trim().toLowerCase() : null
    
    // If it's the current user, go to their profile, otherwise go to other profile
    if (currentUserIdNormalized && reviewUserIdNormalized === currentUserIdNormalized) {
      navigate('/profile')
    } else {
      navigate(`/view-other-profile/${reviewUserId}`)
    }
  }
  
  // Modal step state
  const [currentStep, setCurrentStep] = useState<'list' | 'create' | 'edit' | 'report'>('list')
  
  // Disable scroll on body, html, and root when modal is open
  useEffect(() => {
    if (!isOpen) return

    const scrollY = window.scrollY
    const { body, documentElement } = document
    const root = document.getElementById('root') || document.getElementById('app')

    const originalStyles = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      htmlOverflow: documentElement.style.overflow,
      rootOverflow: root?.style.overflow,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    documentElement.style.overflow = 'hidden'
    if (root) {
      root.style.overflow = 'hidden'
    }

    return () => {
      body.style.position = originalStyles.bodyPosition
      body.style.top = originalStyles.bodyTop
      body.style.width = originalStyles.bodyWidth
      body.style.overflow = originalStyles.bodyOverflow
      documentElement.style.overflow = originalStyles.htmlOverflow
      if (root) {
        root.style.overflow = originalStyles.rootOverflow || ''
      }
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const pageSize = 10

  // Check if user has already reviewed this place
  const [hasUserReviewed, setHasUserReviewed] = useState(false)
  const [userReview, setUserReview] = useState<Review | null>(null)

  // Create review state
  const [createFormData, setCreateFormData] = useState({
    overallRating: 0,
    foodQualityRating: 0,
    serviceRating: 0,
    atmosphereRating: 0,
    priceLevelRating: 0,
    reviewText: '',
    visitDate: '',
    visitType: ''
  })
  const [createImages, setCreateImages] = useState<ReviewImage[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [isUploadingImages, setIsUploadingImages] = useState(false)

  // Edit review state
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [editFormData, setEditFormData] = useState({
    overallRating: 0,
    foodQualityRating: 0,
    serviceRating: 0,
    atmosphereRating: 0,
    priceLevelRating: 0,
    reviewText: '',
    visitDate: '',
    visitType: ''
  })
  const [editImages, setEditImages] = useState<ReviewImage[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  // Report modal state
  const [selectedReviewForReport, setSelectedReviewForReport] = useState<Review | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [isReporting, setIsReporting] = useState(false)
  const [isReportSubmitted, setIsReportSubmitted] = useState(false)

  // Confirmation dialog states
  const [isConfirmCreateOpen, setIsConfirmCreateOpen] = useState(false)
  const [isConfirmEditOpen, setIsConfirmEditOpen] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [reviewIdToDelete, setReviewIdToDelete] = useState<string | null>(null)
  const [isConfirmReportOpen, setIsConfirmReportOpen] = useState(false)
  const [isConfirmCancelCreateOpen, setIsConfirmCancelCreateOpen] = useState(false)
  const [isConfirmCancelEditOpen, setIsConfirmCancelEditOpen] = useState(false)
  const [isConfirmCancelReportOpen, setIsConfirmCancelReportOpen] = useState(false)
  
  // Track if action was completed successfully
  const [actionCompleted, setActionCompleted] = useState(false)

  const { toast } = useToast()

  // Fetch reviews when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchReviews(1)
    }
  }, [isOpen, placeId])

  const fetchReviews = async (page: number = 1) => {
    try {
      setIsLoading(true)
      setError('')
      
      const response = await ViewAllReviewByPlaceId({
        placeId,
        page,
        pageSize
      })

      if (response) {
        const reviewsWithUserInfo = response.items?.map((review: Review) => {
          // More robust comparison - handle string/number types and null/undefined
          const isMyReview = actualCurrentUserId && 
                            review.userId && 
                            String(review.userId) === String(actualCurrentUserId)
          
          return {
            ...review,
            isMyReview
          }
        }) || []
        
        // Filter to only show approved reviews
        const approvedReviews = reviewsWithUserInfo.filter((review: Review) => 
          review.moderationStatus === 'Approved'
        )
        
        setReviews(approvedReviews)
        setTotalPages(Math.ceil((approvedReviews.length || 0) / pageSize))
        setTotalReviews(approvedReviews.length || 0)
        setCurrentPage(response.page || 1)

        // Check if current user has reviewed this place
        const userReview = approvedReviews.find((review: Review) => review.isMyReview)
        setHasUserReviewed(!!userReview)
        setUserReview(userReview || null)
      }
    } catch (error: any) {
      console.error('Error fetching reviews:', error)
      
      // Handle 404 - no reviews found
      if (error.response?.status === 404) {
        setReviews([])
        setTotalPages(0)
        setTotalReviews(0)
        setCurrentPage(1)
        setHasUserReviewed(false)
        setUserReview(null)
        setError('') // Clear error to show empty state UI
      } else {
        setError(error.response?.data?.message || error.message || 'Failed to load reviews')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      fetchReviews(newPage)
    }
  }

  const handleCreateReview = () => {
    setCurrentStep('create')
    setCreateFormData({
      overallRating: 0,
      foodQualityRating: 0,
      serviceRating: 0,
      atmosphereRating: 0,
      priceLevelRating: 0,
      reviewText: '',
      visitDate: '',
      visitType: ''
    })
    setCreateImages([])
    setSubmitError('')
    setSubmitSuccess('')
  }

  const handleEditReview = (review: Review) => {
    setEditingReview(review)
    setEditFormData({
      overallRating: review.overallRating,
      foodQualityRating: review.foodQualityRating,
      serviceRating: review.serviceRating,
      atmosphereRating: review.atmosphereRating,
      priceLevelRating: review.priceLevelRating,
      reviewText: review.reviewText,
      visitDate: review.visitDate.split('T')[0],
      visitType: review.visitType
    })
    setEditImages([])
    setCurrentStep('edit')
    setSubmitError('')
    setSubmitSuccess('')
  }

  const handleCancelCreate = () => {
    // Don't show discard modal if currently creating or action was completed
    if (isCreating || isUploadingImages || actionCompleted) {
      return
    }

    // Check if there are unsaved changes
    const hasChanges = createFormData.overallRating !== 0 ||
                      createFormData.foodQualityRating !== 0 ||
                      createFormData.serviceRating !== 0 ||
                      createFormData.atmosphereRating !== 0 ||
                      createFormData.priceLevelRating !== 0 ||
                      createFormData.reviewText !== '' ||
                      createFormData.visitDate !== '' ||
                      createFormData.visitType !== '' ||
                      createImages.length > 0

    if (hasChanges) {
      setIsConfirmCancelCreateOpen(true)
      return
    }

    // No changes, proceed with cancel
    performCancelCreate()
  }

  const performCancelCreate = () => {
    setCurrentStep('list')
    setCreateFormData({
      overallRating: 0,
      foodQualityRating: 0,
      serviceRating: 0,
      atmosphereRating: 0,
      priceLevelRating: 0,
      reviewText: '',
      visitDate: '',
      visitType: ''
    })
    setCreateImages([])
    setSubmitError('')
    setSubmitSuccess('')
    setActionCompleted(false)
  }

  const handleCancelEdit = () => {
    // Don't show discard modal if currently submitting or action was completed
    if (isSubmitting || isUploadingImages || actionCompleted) {
      return
    }

    // Check if there are unsaved changes by comparing with original data
    if (!editingReview) {
      performCancelEdit()
      return
    }

    const hasChanges = editFormData.overallRating !== editingReview.overallRating ||
                      editFormData.foodQualityRating !== editingReview.foodQualityRating ||
                      editFormData.serviceRating !== editingReview.serviceRating ||
                      editFormData.atmosphereRating !== editingReview.atmosphereRating ||
                      editFormData.priceLevelRating !== editingReview.priceLevelRating ||
                      editFormData.reviewText !== editingReview.reviewText ||
                      editFormData.visitDate !== editingReview.visitDate.split('T')[0] ||
                      editFormData.visitType !== editingReview.visitType ||
                      editImages.length > 0

    if (hasChanges) {
      setIsConfirmCancelEditOpen(true)
      return
    }

    // No changes, proceed with cancel
    performCancelEdit()
  }

  const performCancelEdit = () => {
    setEditingReview(null)
    setCurrentStep('list')
    setEditFormData({
      overallRating: 0,
      foodQualityRating: 0,
      serviceRating: 0,
      atmosphereRating: 0,
      priceLevelRating: 0,
      reviewText: '',
      visitDate: '',
      visitType: ''
    })
    setEditImages([])
    setSubmitError('')
    setSubmitSuccess('')
    setActionCompleted(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (currentStep === 'create') {
      setCreateFormData(prev => ({
        ...prev,
        [name]: value
      }))
    } else if (currentStep === 'edit') {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleRatingChange = (ratingType: string, rating: number) => {
    if (currentStep === 'create') {
      setCreateFormData(prev => ({
        ...prev,
        [ratingType]: rating
      }))
    } else if (currentStep === 'edit') {
      setEditFormData(prev => ({
        ...prev,
        [ratingType]: rating
      }))
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image size must be less than 5MB",
          variant: "destructive"
        })
        return
      }
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const newImage: ReviewImage = {
          file,
          preview: e.target?.result as string,
          altText: `Review image ${(currentStep === 'create' ? createImages : editImages).length + 1}`
        }
        if (currentStep === 'create') {
          setCreateImages(prev => [...prev, newImage])
        } else if (currentStep === 'edit') {
          setEditImages(prev => [...prev, newImage])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveImage = (index: number) => {
    if (currentStep === 'create') {
      setCreateImages(prev => prev.filter((_, i) => i !== index))
    } else if (currentStep === 'edit') {
      setEditImages(prev => prev.filter((_, i) => i !== index))
    }
  }

  const handleCreateReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (createFormData.overallRating === 0) {
      setSubmitError('Please provide an overall rating')
      return
    }
    
    if (!createFormData.reviewText.trim()) {
      setSubmitError('Please provide a review text')
      return
    }
    
    if (createFormData.reviewText.trim().length < 20) {
      setSubmitError('Review text must be at least 20 characters long')
      return
    }
    
    if (!createFormData.visitType) {
      setSubmitError('Please select a visit type')
      return
    }

    // Open confirmation dialog
    setIsConfirmCreateOpen(true)
  }

  const confirmCreateReview = async () => {
    setIsCreating(true)
    setSubmitError('')
    setSubmitSuccess('')

    try {
      let imageUrls: string[] = []
      
      // Upload images if any are selected
      if (createImages.length > 0) {
        setIsUploadingImages(true)
        const files = createImages.map(img => img.file)
        const uploadResults = await uploadMultipleToCloudinary(files)
        imageUrls = uploadResults.map(result => result.secure_url)
        setIsUploadingImages(false)
      }

      const reviewData = {
        placeId,
        overallRating: createFormData.overallRating,
        foodQualityRating: createFormData.foodQualityRating,
        serviceRating: createFormData.serviceRating,
        atmosphereRating: createFormData.atmosphereRating,
        priceLevelRating: createFormData.priceLevelRating,
        reviewText: createFormData.reviewText,
        visitDate: new Date(createFormData.visitDate).toISOString(),
        visitType: createFormData.visitType,
        reviewImagesList: imageUrls
      }

      const response = await CreateReviewPlace(reviewData)
      
      if (response) {
        setSubmitSuccess('Review created successfully!')
        toast({
          title: "Review Created!",
          description: "Your review has been created successfully.",
          variant: "default"
        })
        
        // Mark action as completed to prevent discard modal
        setActionCompleted(true)
        
        // Refresh reviews first
        await fetchReviews(currentPage)
        
        // Then reset form state and go back to list
        setTimeout(() => {
          performCancelCreate()
          setActionCompleted(false) // Reset for next time
          if (onReviewCreated) {
            onReviewCreated()
          }
        }, 1500)
      }
    } catch (error: any) {
      console.error('Error creating review:', error)
      setSubmitError(error.response?.data?.message || error.message || 'Failed to create review')
      toast({
        title: "Create Failed",
        description: error.response?.data?.message || error.message || 'Failed to create review',
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
      setIsConfirmCreateOpen(false)
    }
  }

  const handleUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingReview) return

    // Validation
    if (editFormData.overallRating === 0) {
      setSubmitError('Please provide an overall rating')
      return
    }
    
    if (!editFormData.reviewText.trim()) {
      setSubmitError('Please provide a review text')
      return
    }
    
    if (editFormData.reviewText.trim().length < 20) {
      setSubmitError('Review text must be at least 20 characters long')
      return
    }
    
    if (!editFormData.visitType) {
      setSubmitError('Please select a visit type')
      return
    }

    // Open confirmation dialog
    setIsConfirmEditOpen(true)
  }

  const confirmUpdateReview = async () => {
    if (!editingReview) return

    setIsSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')

    try {
      let imageUrls: string[] = []
      let hasImageChanges = false
      
      // Only upload new images if any are selected
      if (editImages.length > 0) {
        setIsUploadingImages(true)
        const files = editImages.map(img => img.file)
        const uploadResults = await uploadMultipleToCloudinary(files)
        const uploadedUrls = uploadResults.map(result => result.secure_url)
        // Combine existing images with new ones and remove duplicates
        const existingImages = [...new Set(editingReview.reviewImageUrls)]
        imageUrls = [...existingImages, ...uploadedUrls]
        hasImageChanges = true
        setIsUploadingImages(false)
      } else {
        // If no new images, keep the existing ones unchanged but remove duplicates
        imageUrls = [...new Set(editingReview.reviewImageUrls)]
        hasImageChanges = false
      }

      // Create update data object
      const updateData: any = {
        placeId: editingReview.placeId,
        overallRating: editFormData.overallRating,
        foodQualityRating: editFormData.foodQualityRating,
        serviceRating: editFormData.serviceRating,
        atmosphereRating: editFormData.atmosphereRating,
        priceLevelRating: editFormData.priceLevelRating,
        reviewText: editFormData.reviewText,
        visitDate: new Date(editFormData.visitDate).toISOString(),
        visitType: editFormData.visitType,
        reviewId: editingReview.reviewId
      }

      // Only include reviewImagesList if there are image changes
      if (hasImageChanges) {
        updateData.reviewImagesList = imageUrls
      }

      const response = await UpdateReviewPlace(updateData)
      
      if (response) {
        setSubmitSuccess('Review updated successfully!')
        toast({
          title: "Review Updated!",
          description: "Your review has been updated successfully.",
          variant: "default"
        })
        
        // Mark action as completed to prevent discard modal
        setActionCompleted(true)
        
        // Refresh reviews first
        await fetchReviews(currentPage)
        
        // Then reset form state and go back to list
        setTimeout(() => {
          performCancelEdit()
          setActionCompleted(false) // Reset for next time
          if (onReviewUpdated) {
            onReviewUpdated()
          }
        }, 1500)
      }
    } catch (error: any) {
      console.error('Error updating review:', error)
      setSubmitError(error.response?.data?.message || error.message || 'Failed to update review')
      toast({
        title: "Update Failed",
        description: error.response?.data?.message || error.message || 'Failed to update review',
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
      setIsConfirmEditOpen(false)
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    setReviewIdToDelete(reviewId)
    setIsConfirmDeleteOpen(true)
  }

  const confirmDeleteReview = async () => {
    if (!reviewIdToDelete) return

    try {
      await DeleteReviewPlace(reviewIdToDelete)
      
      toast({
        title: "Review Deleted!",
        description: "Your review has been deleted successfully.",
        variant: "default"
      })
      
      // Mark action as completed to prevent discard modal
      setActionCompleted(true)
      
      // Reset any form state to prevent discard modal
      performCancelEdit()
      
      // Refresh reviews
      await fetchReviews(currentPage)
      
      // Notify parent component
      if (onReviewDeleted) {
        onReviewDeleted()
      }
      
      // Reset action completed flag
      setActionCompleted(false)
    } catch (error: any) {
      console.error('Error deleting review:', error)
      toast({
        title: "Delete Failed",
        description: error.response?.data?.message || error.message || 'Failed to delete review',
        variant: "destructive"
      })
    } finally {
      setIsConfirmDeleteOpen(false)
      setReviewIdToDelete(null)
    }
  }

  const handleClose = () => {
    if (!isCreating && !isSubmitting) {
      setReviews([])
      setCurrentPage(1)
      setTotalPages(0)
      setTotalReviews(0)
      setError('')
      setCurrentStep('list')
      setActionCompleted(false)
      performCancelCreate()
      performCancelEdit()
      onClose()
    }
  }

  const handleReportReview = (review: Review) => {
    setSelectedReviewForReport(review)
    setReportReason('')
    setIsReportSubmitted(false)
    setCurrentStep('report')
  }

  const handleCloseReportModal = () => {
    // If report was submitted successfully, allow closing without confirmation
    if (isReportSubmitted) {
      performCloseReportModal()
      return
    }

    // Don't show discard modal if currently reporting
    if (isReporting) {
      return
    }

    // Don't show discard modal if action was completed (but not submitted)
    if (actionCompleted) {
      return
    }

    // Check if there are unsaved changes
    if (reportReason.trim() !== '') {
      setIsConfirmCancelReportOpen(true)
      return
    }

    // No changes, proceed with close
    performCloseReportModal()
  }

  const performCloseReportModal = () => {
    setCurrentStep('list')
    setSelectedReviewForReport(null)
    setReportReason('')
    setActionCompleted(false)
    setIsReportSubmitted(false)
  }

  const handleSubmitReport = async () => {
    if (!selectedReviewForReport || !reportReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for reporting this review.",
        variant: "destructive"
      })
      return
    }

    // Open confirmation dialog
    setIsConfirmReportOpen(true)
  }

  const confirmSubmitReport = async () => {
    if (!selectedReviewForReport || !reportReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for reporting this review.",
        variant: "destructive"
      })
      return
    }

    setIsReporting(true)

    try {
      await ReportReviewPlace({
        reviewId: selectedReviewForReport.reviewId,
        reason: reportReason.trim()
      })

      toast({
        title: "Review Reported",
        description: "Thank you for reporting this review. We will review it shortly.",
        variant: "default"
      })

      // Update the review to show flagged status immediately
      const reportedReviewId = selectedReviewForReport.reviewId
      
      // Update reviews array
      setReviews(prevReviews => 
        prevReviews.map(review => 
          review.reviewId === reportedReviewId 
            ? { ...review, isFlagged: true }
            : review
        )
      )
      
      // Update userReview if it's the reported review
      setUserReview(prevUserReview => 
        prevUserReview && prevUserReview.reviewId === reportedReviewId
          ? { ...prevUserReview, isFlagged: true }
          : prevUserReview
      )
      
      // Mark action as completed to prevent discard modal
      setActionCompleted(true)

      // Show success screen instead of closing immediately
      setIsReportSubmitted(true)
    } catch (error: any) {
      console.error('Error reporting review:', error)
      toast({
        title: "Report Failed",
        description: error.response?.data?.message || error.message || 'Failed to report review',
        variant: "destructive"
      })
    } finally {
      setIsReporting(false)
      setIsConfirmReportOpen(false)
    }
  }

  const StarRating = ({ rating, onRatingChange, label, readonly = false }: { 
    rating: number
    onRatingChange?: (rating: number) => void
    label: string
    readonly?: boolean
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          readonly ? (
            <Star
              key={star}
              className={`h-5 w-5 ${
                star <= rating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          ) : (
            <button
              key={star}
              type="button"
              onClick={() => onRatingChange?.(star)}
              className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              <Star
                className={`h-5 w-5 transition-colors ${
                  star <= rating
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300 hover:text-yellow-200'
                }`}
              />
            </button>
          )
        ))}
        <span className="ml-2 text-sm text-gray-600">{rating}/5</span>
      </div>
    </div>
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!isOpen) return null

  // Render AlertDialogs function
  const renderAlertDialogs = () => (
    <>
      {/* Create Review Confirmation Dialog */}
      <AlertDialog open={isConfirmCreateOpen} onOpenChange={setIsConfirmCreateOpen}>
        <AlertDialogContent className="z-[10000]" style={{ zIndex: 10000 }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to create this review? This will be visible to other users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCreateReview} className='transition-all bg-foreground hover:bg-foreground/80 duration-200 hover:scale-105 disabled:hover:scale-100 disabled:opacity-70 px-8 shadow-lg'>
              Create Review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Review Confirmation Dialog */}
      <AlertDialog open={isConfirmEditOpen} onOpenChange={setIsConfirmEditOpen}>
        <AlertDialogContent className="z-[10000]" style={{ zIndex: 10000 }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update this review? This action will modify your existing review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUpdateReview} className='transition-all bg-foreground hover:bg-foreground/80 duration-200 hover:scale-105 disabled:hover:scale-100 disabled:opacity-70 px-8 shadow-lg'>
              Update Review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Review Confirmation Dialog */}
      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent className="z-[10000]" style={{ zIndex: 10000 }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">⚠️ Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone and will permanently remove your review from this place.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteReview}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Review Confirmation Dialog */}
      <AlertDialog open={isConfirmReportOpen} onOpenChange={setIsConfirmReportOpen}>
        <AlertDialogContent className="z-[10000]" style={{ zIndex: 10000 }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Report Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to report this review? Your report will be reviewed by our moderation team. Please ensure your reason is valid and constructive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSubmitReport}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Submit Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Create Confirmation Dialog */}
      <AlertDialog open={isConfirmCancelCreateOpen} onOpenChange={setIsConfirmCancelCreateOpen}>
        <AlertDialogContent className="z-[10000]" style={{ zIndex: 10000 }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to cancel creating this review? All your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Creating</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                performCancelCreate()
                setIsConfirmCancelCreateOpen(false)
              }}
              className="bg-gray-600 hover:bg-gray-700"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Edit Confirmation Dialog */}
      <AlertDialog open={isConfirmCancelEditOpen} onOpenChange={setIsConfirmCancelEditOpen}>
        <AlertDialogContent className="z-[10000]" style={{ zIndex: 10000 }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to cancel editing? All your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                performCancelEdit()
                setIsConfirmCancelEditOpen(false)
              }}
              className="bg-gray-600 hover:bg-gray-700"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Report Confirmation Dialog */}
      <AlertDialog open={isConfirmCancelReportOpen} onOpenChange={setIsConfirmCancelReportOpen}>
        <AlertDialogContent className="z-[10000]" style={{ zIndex: 10000 }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Report</AlertDialogTitle>
            <AlertDialogDescription>
              You have entered a report reason. Are you sure you want to cancel? Your report reason will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Reporting</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                performCloseReportModal()
                setIsConfirmCancelReportOpen(false)
              }}
              className="bg-gray-600 hover:bg-gray-700"
            >
              Discard Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  // Reviews List Step
  if (currentStep === 'list') {
    return createPortal(
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-300" 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          zIndex: 9999,
          overscrollBehavior: 'contain'
        }}
      >
        <div 
          className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto scrollbar-hide scrollbar-hide shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-300" 
          style={{ 
            maxHeight: '90vh', 
            margin: 'auto',
            position: 'relative'
          }}
        >
          <div 
            className="flex items-center justify-between p-8 border-b sticky top-0 z-10"
            style={{ background: `linear-gradient(to right, ${colors.neutral.background.secondary}, ${colors.neutral.background.tertiary})` }}
          >
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Reviews for {placeName}</h2>
              <p className="text-sm text-gray-600 mt-1">
                {totalReviews > 0 ? `${totalReviews} review${totalReviews > 1 ? 's' : ''}` : 'No reviews yet'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Create Review Button - only show if user hasn't reviewed yet */}
              {!hasUserReviewed && (
                <Button 
                  onClick={handleCreateReview}
                  className="transition-all duration-200 hover:scale-105 px-6 shadow-lg"
                  style={{ 
                    background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                    color: 'white',
                    border: 'none'
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Write Review
                </Button>
              )}
              <button 
                onClick={handleClose} 
                className="text-gray-400 hover:text-gray-600 transition-all duration-200 hover:bg-white rounded-full p-2 hover:scale-110"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center">
                <AlertCircle className="mr-2 h-4 w-4" />
                {error}
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No reviews for this place yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  This place hasn't received any reviews yet. Be the first to share your experience and help others discover this location!
                </p>
                {!hasUserReviewed && (
                  <Button 
                    onClick={handleCreateReview}
                    className="transition-all duration-200 hover:scale-105 px-6 shadow-lg"
                    style={{ 
                      background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                      color: 'white',
                      border: 'none'
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Write First Review
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* User's Review (if exists) - Show at top */}
                {userReview && (
                  <Card className={`border-2 shadow-lg ${
                    userReview.isFlagged 
                      ? 'border-orange-400 bg-gradient-to-br from-orange-50/30 to-red-50/30' 
                      : 'border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50'
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                            {userReview.profilePictureUrl ? (
                              <img 
                                src={userReview.profilePictureUrl} 
                                alt={userReview.fullName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center ${userReview.profilePictureUrl ? 'hidden' : ''}`}>
                              <User className="h-5 w-5 text-gray-500" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              {userReview.fullName}
                              <Badge variant="secondary" className="text-xs">
                                Your Review
                              </Badge>
                              {userReview.isFlagged && (
                                <Badge 
                                  variant="destructive" 
                                  className="text-xs flex items-center gap-1 bg-orange-500 hover:bg-orange-600 animate-pulse"
                                >
                                  <Flag className="h-3 w-3" />
                                  Reported
                                </Badge>
                              )}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(userReview.visitDate)}</span>
                              <Badge variant="outline" className="text-xs">
                                {userReview.visitType}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-300"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-[10000]" sideOffset={5}>
                            <DropdownMenuItem
                              onClick={() => handleEditReview(userReview)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Review
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteReview(userReview.reviewId)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Review
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Flagged Notice */}
                        {userReview.isFlagged && (
                          <div className="bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-300 rounded-lg p-3 flex items-start gap-3 animate-in fade-in duration-200">
                            <div className="flex-shrink-0 mt-0.5">
                              <Flag className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-orange-900 mb-1">
                                ⚠️ This review has been reported
                              </p>
                              <p className="text-xs text-orange-700">
                                This review is pending admin review. Please refrain from inappropriate actions.
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Overall Rating */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-5 w-5 ${
                                  star <= userReview.overallRating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600">
                            {userReview.overallRating}/5
                          </span>
                        </div>

                        {/* Review Text */}
                        <p className="text-gray-700 leading-relaxed">{userReview.reviewText}</p>

                        {/* Detailed Ratings */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                          <StarRating
                            rating={userReview.foodQualityRating}
                            label="Food Quality"
                            readonly
                          />
                          <StarRating
                            rating={userReview.serviceRating}
                            label="Service"
                            readonly
                          />
                          <StarRating
                            rating={userReview.atmosphereRating}
                            label="Atmosphere"
                            readonly
                          />
                          <StarRating
                            rating={userReview.priceLevelRating}
                            label="Value"
                            readonly
                          />
                        </div>

                        {/* Review Images */}
                        {userReview.reviewImageUrls && userReview.reviewImageUrls.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3 border-t">
                            {userReview.reviewImageUrls.map((imageUrl, index) => (
                              <img
                                key={index}
                                src={imageUrl}
                                alt={`Review image ${index + 1}`}
                                className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(imageUrl, '_blank')}
                              />
                            ))}
                          </div>
                        )}

                        {/* Helpful Votes */}
                        {(userReview.helpfulVotes > 0 || userReview.notHelpfulVotes > 0) && (
                          <div className="flex items-center gap-4 pt-3 border-t text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <span className="text-green-600">👍</span>
                              <span>{userReview.helpfulVotes} helpful</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-red-600">👎</span>
                              <span>{userReview.notHelpfulVotes} not helpful</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Other Reviews */}
                {reviews.filter(review => !review.isMyReview).map((review) => {
                  return (
                  <Card 
                    key={review.reviewId} 
                    className={`hover:shadow-md transition-shadow ${
                      review.isFlagged 
                        ? 'border-2 border-orange-400 bg-gradient-to-br from-orange-50/30 to-red-50/30 shadow-lg' 
                        : ''
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 cursor-pointer group transition-all duration-200 hover:ring-2 hover:ring-blue-400"
                            onClick={() => handleReviewerProfileClick(review.userId)}
                          >
                            {review.profilePictureUrl ? (
                              <img 
                                src={review.profilePictureUrl} 
                                alt={review.fullName}
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
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 
                                className="font-semibold text-gray-900 cursor-pointer transition-all duration-200 hover:underline decoration-2 underline-offset-2 decoration-blue-500"
                                onClick={() => handleReviewerProfileClick(review.userId)}
                              >
                                {review.fullName}
                              </h4>
                              {review.isFlagged && (
                                <Badge 
                                  variant="destructive" 
                                  className="text-xs flex items-center gap-1 bg-orange-500 hover:bg-orange-600 animate-pulse"
                                >
                                  <Flag className="h-3 w-3" />
                                  Reported
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(review.visitDate)}</span>
                              <Badge variant="outline" className="text-xs">
                                {review.visitType}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-300"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-[10000]" sideOffset={5}>
                            <DropdownMenuItem
                              onClick={() => handleReportReview(review)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <Flag className="h-4 w-4 mr-2" />
                              Report Review
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Flagged Notice */}
                        {review.isFlagged && (
                          <div className="bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-300 rounded-lg p-3 flex items-start gap-3 animate-in fade-in duration-200">
                            <div className="flex-shrink-0 mt-0.5">
                              <Flag className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-orange-900 mb-1">
                                ⚠️ This review has been reported
                              </p>
                              <p className="text-xs text-orange-700">
                                This review is pending admin review. Please refrain from inappropriate actions.
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Overall Rating */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-5 w-5 ${
                                  star <= review.overallRating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600">
                            {review.overallRating}/5
                          </span>
                        </div>

                        {/* Review Text */}
                        <p className="text-gray-700 leading-relaxed">{review.reviewText}</p>

                        {/* Detailed Ratings */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                          <StarRating
                            rating={review.foodQualityRating}
                            label="Food Quality"
                            readonly
                          />
                          <StarRating
                            rating={review.serviceRating}
                            label="Service"
                            readonly
                          />
                          <StarRating
                            rating={review.atmosphereRating}
                            label="Atmosphere"
                            readonly
                          />
                          <StarRating
                            rating={review.priceLevelRating}
                            label="Value"
                            readonly
                          />
                        </div>

                        {/* Review Images */}
                        {review.reviewImageUrls && review.reviewImageUrls.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3 border-t">
                            {review.reviewImageUrls.map((imageUrl, index) => (
                              <img
                                key={index}
                                src={imageUrl}
                                alt={`Review image ${index + 1}`}
                                className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(imageUrl, '_blank')}
                              />
                            ))}
                          </div>
                        )}

                        {/* Helpful Votes */}
                        {(review.helpfulVotes > 0 || review.notHelpfulVotes > 0) && (
                          <div className="flex items-center gap-4 pt-3 border-t text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <span className="text-green-600">👍</span>
                              <span>{review.helpfulVotes} helpful</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-red-600">👎</span>
                              <span>{review.notHelpfulVotes} not helpful</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  )
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
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
                            className="w-8 h-8"
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
                      disabled={currentPage >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {renderAlertDialogs()}
      </div>,
      document.body
    )
  }

  // Create Review Step
  if (currentStep === 'create') {
    return createPortal(
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-300" 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          zIndex: 9999,
          overscrollBehavior: 'contain'
        }}
      >
        <div 
          className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-300" 
          style={{ 
            maxHeight: '90vh', 
            margin: 'auto',
            position: 'relative'
          }}
        >
          <div 
            className="flex items-center justify-between p-8 border-b sticky top-0 z-10"
            style={{ background: `linear-gradient(to right, ${colors.neutral.background.secondary}, ${colors.neutral.background.tertiary})` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                <Plus className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Write Review</h2>
                <p className="text-sm text-gray-600 mt-0.5">Share your experience at {placeName}</p>
              </div>
            </div>
            <button 
              onClick={handleCancelCreate} 
              disabled={isCreating || isUploadingImages || actionCompleted}
              className="text-gray-400 hover:text-gray-600 transition-all duration-200 hover:bg-white rounded-full p-2 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleCreateReviewSubmit} className="p-8 space-y-8">
            {/* Overall Rating */}
            <Card className="border-2 border-blue-200 shadow-lg bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                    <Star className="w-5 h-5 text-blue-600" />
                  </div>
                  Overall Rating *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StarRating
                  rating={createFormData.overallRating}
                  onRatingChange={(rating) => handleRatingChange('overallRating', rating)}
                  label="How would you rate this place overall?"
                />
              </CardContent>
            </Card>

            {/* Detailed Ratings */}
            <Card className="border-2 border-green-200 shadow-lg bg-gradient-to-br from-green-50/50 to-emerald-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                    <Star className="w-5 h-5 text-green-600" />
                  </div>
                  Detailed Ratings
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StarRating
                  rating={createFormData.foodQualityRating}
                  onRatingChange={(rating) => handleRatingChange('foodQualityRating', rating)}
                  label="Food Quality"
                />
                <StarRating
                  rating={createFormData.serviceRating}
                  onRatingChange={(rating) => handleRatingChange('serviceRating', rating)}
                  label="Service"
                />
                <StarRating
                  rating={createFormData.atmosphereRating}
                  onRatingChange={(rating) => handleRatingChange('atmosphereRating', rating)}
                  label="Atmosphere"
                />
                <StarRating
                  rating={createFormData.priceLevelRating}
                  onRatingChange={(rating) => handleRatingChange('priceLevelRating', rating)}
                  label="Value for Money"
                />
              </CardContent>
            </Card>

            {/* Review Details */}
            <Card className="border-2 border-orange-200 shadow-lg bg-gradient-to-br from-orange-50/50 to-amber-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-orange-600" />
                  </div>
                  Review Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="create-reviewText" className="text-sm font-semibold text-gray-700">Review Text *</Label>
                  <textarea
                    id="create-reviewText"
                    name="reviewText"
                    value={createFormData.reviewText}
                    onChange={handleInputChange}
                    rows={4}
                    className={`w-full px-4 py-3 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none mt-2 transition-all duration-200 hover:border-orange-300 focus:scale-[1.01] ${
                      createFormData.reviewText.trim().length > 0 && createFormData.reviewText.trim().length < 20
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300'
                    }`}
                    placeholder="Share your experience..."
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className={`text-xs ${
                      createFormData.reviewText.trim().length > 0 && createFormData.reviewText.trim().length < 20
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}>
                      {createFormData.reviewText.trim().length > 0 && createFormData.reviewText.trim().length < 20
                        ? `Please enter at least ${20 - createFormData.reviewText.trim().length} more character${20 - createFormData.reviewText.trim().length > 1 ? 's' : ''}`
                        : 'Minimum 20 characters required'
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      {createFormData.reviewText.length}/20+ characters
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="create-visitDate" className="text-sm font-semibold text-gray-700">Visit Date *</Label>
                    <Input
                      id="create-visitDate"
                      name="visitDate"
                      type="date"
                      value={createFormData.visitDate}
                      onChange={handleInputChange}
                      max={new Date().toISOString().split('T')[0]}
                      className="mt-2 transition-all duration-200 border-2 hover:border-orange-300 focus:border-orange-500 focus:scale-[1.01]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="create-visitType" className="text-sm font-semibold text-gray-700">Visit Type *</Label>
                    <select
                      id="create-visitType"
                      name="visitType"
                      value={createFormData.visitType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mt-2 transition-all duration-200 hover:border-orange-300 focus:scale-[1.01]"
                    >
                      <option value="">Select visit type</option>
                      {visitTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card className="border-2 border-purple-200 shadow-lg bg-gradient-to-br from-purple-50/50 to-pink-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                    <Camera className="w-5 h-5 text-purple-600" />
                  </div>
                  Photos (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Upload Images */}
                  <div>
                    <Label htmlFor="create-images" className="cursor-pointer">
                      <div className="flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-500 transition-colors">
                        <Camera className="w-5 h-5 text-purple-400" />
                        <span className="text-gray-600">Add photos to your review</span>
                      </div>
                    </Label>
                    <input
                      id="create-images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Image Previews */}
                  {createImages.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">Selected Images</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {createImages.map((image, index) => (
                          <div key={`create-${index}`} className="relative group">
                            <img
                              src={image.preview}
                              alt={image.altText}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Progress */}
                  {isUploadingImages && (
                    <div className="flex items-center gap-2 text-purple-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      <span className="text-sm">Uploading images...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Error and Success Messages */}
            {submitError && (
              <div className="bg-red-50 border-2 border-red-300 text-red-800 px-5 py-4 rounded-xl text-sm animate-in fade-in duration-200 flex items-start gap-3 shadow-sm">
                <span className="text-xl">⚠</span>
                <span>{submitError}</span>
              </div>
            )}
            
            {submitSuccess && (
              <div className="bg-green-50 border-2 border-green-300 text-green-800 px-5 py-4 rounded-xl text-sm flex items-center animate-in fade-in duration-200 shadow-sm">
                <span className="mr-3 text-xl">✓</span>
                <span className="font-medium">{submitSuccess}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t-2 border-gray-200">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancelCreate}
                disabled={isCreating || actionCompleted}
                className="transition-all duration-200 hover:scale-105 text-gray-700 hover:text-gray-100"
              >
                Go Back
              </Button>
              <Button 
                type="submit" 
                disabled={isCreating || isUploadingImages || createFormData.reviewText.trim().length < 20}
                className="transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:opacity-70 px-8 shadow-lg"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {isUploadingImages ? 'Uploading images...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Create Review
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
        {renderAlertDialogs()}
      </div>,
      document.body
    )
  }

  // Edit Review Step
  if (currentStep === 'edit' && editingReview) {
    return createPortal(
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-300" 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          zIndex: 9999,
          overscrollBehavior: 'contain'
        }}
      >
        <div 
          className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-300" 
          style={{ 
            maxHeight: '90vh', 
            margin: 'auto',
            position: 'relative'
          }}
        >
          <div 
            className="flex items-center justify-between p-8 border-b sticky top-0 z-10"
            style={{ background: `linear-gradient(to right, ${colors.neutral.background.secondary}, ${colors.neutral.background.tertiary})` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                <Edit className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Edit Review</h2>
                <p className="text-sm text-gray-600 mt-0.5">Update your review for {placeName}</p>
              </div>
            </div>
            <button 
              onClick={handleCancelEdit} 
              disabled={isSubmitting || isUploadingImages || actionCompleted}
              className="text-gray-400 hover:text-gray-600 transition-all duration-200 hover:bg-white rounded-full p-2 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleUpdateReview} className="p-8 space-y-8">
            {/* Overall Rating */}
            <Card className="border-2 border-blue-200 shadow-lg bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                    <Star className="w-5 h-5 text-blue-600" />
                  </div>
                  Overall Rating *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StarRating
                  rating={editFormData.overallRating}
                  onRatingChange={(rating) => handleRatingChange('overallRating', rating)}
                  label="How would you rate this place overall?"
                />
              </CardContent>
            </Card>

            {/* Detailed Ratings */}
            <Card className="border-2 border-green-200 shadow-lg bg-gradient-to-br from-green-50/50 to-emerald-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                    <Star className="w-5 h-5 text-green-600" />
                  </div>
                  Detailed Ratings
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StarRating
                  rating={editFormData.foodQualityRating}
                  onRatingChange={(rating) => handleRatingChange('foodQualityRating', rating)}
                  label="Food Quality"
                />
                <StarRating
                  rating={editFormData.serviceRating}
                  onRatingChange={(rating) => handleRatingChange('serviceRating', rating)}
                  label="Service"
                />
                <StarRating
                  rating={editFormData.atmosphereRating}
                  onRatingChange={(rating) => handleRatingChange('atmosphereRating', rating)}
                  label="Atmosphere"
                />
                <StarRating
                  rating={editFormData.priceLevelRating}
                  onRatingChange={(rating) => handleRatingChange('priceLevelRating', rating)}
                  label="Value for Money"
                />
              </CardContent>
            </Card>

            {/* Review Details */}
            <Card className="border-2 border-orange-200 shadow-lg bg-gradient-to-br from-orange-50/50 to-amber-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-orange-600" />
                  </div>
                  Review Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="edit-reviewText" className="text-sm font-semibold text-gray-700">Review Text *</Label>
                  <textarea
                    id="edit-reviewText"
                    name="reviewText"
                    value={editFormData.reviewText}
                    onChange={handleInputChange}
                    rows={4}
                    className={`w-full px-4 py-3 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none mt-2 transition-all duration-200 hover:border-orange-300 focus:scale-[1.01] ${
                      editFormData.reviewText.trim().length > 0 && editFormData.reviewText.trim().length < 20
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300'
                    }`}
                    placeholder="Share your experience..."
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className={`text-xs ${
                      editFormData.reviewText.trim().length > 0 && editFormData.reviewText.trim().length < 20
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}>
                      {editFormData.reviewText.trim().length > 0 && editFormData.reviewText.trim().length < 20
                        ? `Please enter at least ${20 - editFormData.reviewText.trim().length} more character${20 - editFormData.reviewText.trim().length > 1 ? 's' : ''}`
                        : 'Minimum 20 characters required'
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      {editFormData.reviewText.length}/20+ characters
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="edit-visitDate" className="text-sm font-semibold text-gray-700">Visit Date *</Label>
                    <Input
                      id="edit-visitDate"
                      name="visitDate"
                      type="date"
                      value={editFormData.visitDate}
                      onChange={handleInputChange}
                      max={new Date().toISOString().split('T')[0]}
                      className="mt-2 transition-all duration-200 border-2 hover:border-orange-300 focus:border-orange-500 focus:scale-[1.01]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-visitType" className="text-sm font-semibold text-gray-700">Visit Type *</Label>
                    <select
                      id="edit-visitType"
                      name="visitType"
                      value={editFormData.visitType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mt-2 transition-all duration-200 hover:border-orange-300 focus:scale-[1.01]"
                    >
                      <option value="">Select visit type</option>
                      {visitTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card className="border-2 border-purple-200 shadow-lg bg-gradient-to-br from-purple-50/50 to-pink-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                    <Camera className="w-5 h-5 text-purple-600" />
                  </div>
                  Photos (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Current Images */}
                  {editingReview.reviewImageUrls && editingReview.reviewImageUrls.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">Current Images</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {editingReview.reviewImageUrls.map((imageUrl, index) => (
                          <div key={`current-${index}`} className="relative group">
                            <img
                              src={imageUrl}
                              alt={`Review image ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload New Images */}
                  <div>
                    <Label htmlFor="edit-images" className="cursor-pointer">
                      <div className="flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-500 transition-colors">
                        <Camera className="w-5 h-5 text-purple-400" />
                        <span className="text-gray-600">Add more photos to your review</span>
                      </div>
                    </Label>
                    <input
                      id="edit-images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  {/* New Image Previews */}
                  {editImages.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">New Images</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {editImages.map((image, index) => (
                          <div key={`new-${index}`} className="relative group">
                            <img
                              src={image.preview}
                              alt={image.altText}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Progress */}
                  {isUploadingImages && (
                    <div className="flex items-center gap-2 text-purple-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      <span className="text-sm">Uploading images...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Error and Success Messages */}
            {submitError && (
              <div className="bg-red-50 border-2 border-red-300 text-red-800 px-5 py-4 rounded-xl text-sm animate-in fade-in duration-200 flex items-start gap-3 shadow-sm">
                <span className="text-xl">⚠</span>
                <span>{submitError}</span>
              </div>
            )}
            
            {submitSuccess && (
              <div className="bg-green-50 border-2 border-green-300 text-green-800 px-5 py-4 rounded-xl text-sm flex items-center animate-in fade-in duration-200 shadow-sm">
                <span className="mr-3 text-xl">✓</span>
                <span className="font-medium">{submitSuccess}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t-2 border-gray-200">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancelEdit}
                disabled={isSubmitting || actionCompleted}
                className="transition-all duration-200 hover:scale-105 text-gray-700 hover:text-gray-100"
              >
                Go Back
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || isUploadingImages || editFormData.reviewText.trim().length < 20}
                className="transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:opacity-70 px-8 shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {isUploadingImages ? 'Uploading images...' : 'Updating...'}
                  </>
                ) : (
                  <>
                    <Edit className="w-5 h-5 mr-2" />
                    Update Review
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
        {renderAlertDialogs()}
      </div>,
      document.body
    )
  }

  // Report Review Step
  if (currentStep === 'report' && selectedReviewForReport) {
    return createPortal(
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-300" 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          zIndex: 9999,
          overscrollBehavior: 'contain'
        }}
      >
        <div 
          className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-300" 
          style={{ 
            maxHeight: '90vh', 
            margin: 'auto',
            position: 'relative'
          }}
        >
          <div className="flex items-center justify-between p-8 border-b sticky top-0 bg-gradient-to-r from-orange-50 to-red-50 z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center">
                <Flag className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Report Review</h2>
                <p className="text-sm text-gray-600 mt-0.5">Help us maintain quality content</p>
              </div>
            </div>
            {!isReportSubmitted && (
            <button 
              onClick={handleCloseReportModal} 
              disabled={isReporting || actionCompleted}
              className="text-gray-400 hover:text-gray-600 transition-all duration-200 hover:bg-white rounded-full p-2 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <X className="w-6 h-6" />
            </button>
            )}
          </div>

          <div className="p-8 space-y-6">
            {!isReportSubmitted ? (
              <>
            {/* Review Preview */}
            <Card className="border-2 border-gray-200 shadow-md bg-gradient-to-br from-gray-50/50 to-slate-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-600" />
                  Review by {selectedReviewForReport.fullName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-gray-700 leading-relaxed line-clamp-3">
                    {selectedReviewForReport.reviewText}
                  </p>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= selectedReviewForReport.overallRating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {selectedReviewForReport.overallRating}/5
                    </span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {selectedReviewForReport.visitType}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Report Form */}
            <Card className="border-2 border-orange-200 shadow-lg bg-gradient-to-br from-orange-50/50 to-amber-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  Report Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="report-reason" className="text-sm font-semibold text-gray-700">Reason for reporting *</Label>
                  <textarea
                    id="report-reason"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Please explain why you are reporting this review..."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none mt-2 transition-all duration-200 hover:border-orange-300 focus:scale-[1.01]"
                  />
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Why report reviews?</h4>
                      <p className="text-sm text-gray-700">
                        We review all reports to maintain a safe and helpful community. 
                        Common reasons include inappropriate content, spam, or misleading information.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t-2 border-gray-200">
              <Button 
                variant="outline" 
                onClick={handleCloseReportModal}
                disabled={isReporting || actionCompleted}
                className="transition-all duration-200 hover:scale-105 text-gray-700 hover:text-gray-100"
              >
                Go Back
              </Button>
              <Button 
                onClick={handleSubmitReport}
                disabled={isReporting || !reportReason.trim()}
                className="transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:opacity-70 px-8 shadow-lg bg-orange-600 hover:bg-orange-700"
              >
                {isReporting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Reporting...
                  </>
                ) : (
                  <>
                    <Flag className="h-5 w-5 mr-2" />
                    Submit Report
                  </>
                )}
              </Button>
            </div>
              </>
            ) : (
              /* Success Screen */
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
                    className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center shadow-lg"
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
                      <CheckCircle className="w-12 h-12 text-green-500" />
                    </motion.div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                    className="space-y-2"
                  >
                    <h3 className="text-2xl font-bold text-gray-900">Report submitted</h3>
                    <p className="text-base text-gray-600 max-w-md">
                      Thank you for reporting this review. We will review it shortly and take any necessary action.
                    </p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                  >
                    <Button 
                      onClick={handleCloseReportModal}
                      className="mt-4 px-8 py-2 bg-green-600 hover:bg-green-700 transition-all duration-200 hover:scale-105"
                    >
                      Close
                    </Button>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
        {renderAlertDialogs()}
      </div>,
      document.body
    )
  }

  return null
}
