import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { 
  Star, 
  X, 
  Camera,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { CreateReviewPlace } from '@/services/userService'
import { uploadMultipleToCloudinary } from '@/services/cloudinaryService'

interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
  placeId: string
  placeName: string
  onReviewSubmitted?: () => void
}

interface ReviewFormData {
  overallRating: number
  foodQualityRating: number
  serviceRating: number
  atmosphereRating: number
  priceLevelRating: number
  reviewText: string
  visitDate: string
  visitType: string
  reviewImagesList: string[]
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


export default function ReviewModal({ isOpen, onClose, placeId, placeName, onReviewSubmitted }: ReviewModalProps) {
  // Disable body scroll when modal is open
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

  const [formData, setFormData] = useState<ReviewFormData>({
    overallRating: 0,
    foodQualityRating: 0,
    serviceRating: 0,
    atmosphereRating: 0,
    priceLevelRating: 0,
    reviewText: '',
    visitDate: new Date().toISOString().split('T')[0],
    visitType: '',
    reviewImagesList: []
  })

  const [images, setImages] = useState<ReviewImage[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { toast } = useToast()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleRatingChange = (ratingType: keyof ReviewFormData, rating: number) => {
    setFormData(prev => ({
      ...prev,
      [ratingType]: rating
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Image size must be less than 5MB",
            variant: "destructive"
          })
          return
        }
        
        const preview = URL.createObjectURL(file)
        const newImage: ReviewImage = {
          file,
          preview,
          altText: `Review image ${images.length + 1}`
        }
        
        setImages(prev => [...prev, newImage])
      }
    })
  }

  const handleRemoveImage = (index: number) => {
    const imageToRemove = images[index]
    URL.revokeObjectURL(imageToRemove.preview)
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (formData.overallRating === 0) {
      setError('Please provide an overall rating')
      return
    }
    
    
    if (!formData.reviewText.trim()) {
      setError('Please provide a review text')
      return
    }
    
    if (formData.reviewText.trim().length < 20) {
      setError('Review text must be at least 20 characters long')
      return
    }
    
    if (!formData.visitType) {
      setError('Please select a visit type')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      // Upload images to cloudinary and get URLs
      let imageUrls: string[] = []
      
      if (images.length > 0) {
        setSuccess('Uploading images...')
        const files = images.map(img => img.file)
        const uploadResults = await uploadMultipleToCloudinary(files, {
          folder: 'reviews'
        })
        imageUrls = uploadResults.map(result => result.secure_url)
        setSuccess('Images uploaded successfully! Submitting review...')
      }

      const reviewData = {
        ...formData,
        placeId,
        reviewImagesList: imageUrls
      }

      const response = await CreateReviewPlace(reviewData)
      
      if (response) {
        setSuccess('Review submitted successfully!')
        toast({
          title: "Review Submitted!",
          description: "Your review has been submitted successfully.",
          variant: "default"
        })
        
        // Reset form
        setFormData({
          overallRating: 0,
          foodQualityRating: 0,
          serviceRating: 0,
          atmosphereRating: 0,
          priceLevelRating: 0,
          reviewText: '',
          visitDate: new Date().toISOString().split('T')[0],
          visitType: '',
          reviewImagesList: []
        })
        setImages([])
        
        // Notify parent component
        if (onReviewSubmitted) {
          onReviewSubmitted()
        }
        
        setTimeout(() => {
          onClose()
          setSuccess('')
        }, 1500)
      }
    } catch (error: any) {
      console.error('Error submitting review:', error)
      setError(error.response?.data?.message || error.message || 'Failed to submit review')
      toast({
        title: "Submission Failed",
        description: error.response?.data?.message || error.message || 'Failed to submit review',
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      // Clean up image URLs
      images.forEach(image => URL.revokeObjectURL(image.preview))
      setImages([])
      setError('')
      setSuccess('')
      onClose()
    }
  }

  const StarRating = ({ rating, onRatingChange, label }: { 
    rating: number
    onRatingChange: (rating: number) => void
    label: string
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                star <= rating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300 hover:text-yellow-200'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">{rating}/5</span>
      </div>
    </div>
  )

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Write a Review
          </DialogTitle>
          <p className="text-gray-600">Share your experience at <span className="font-semibold">{placeName}</span></p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Overall Rating */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Overall Rating *</CardTitle>
            </CardHeader>
            <CardContent>
              <StarRating
                rating={formData.overallRating}
                onRatingChange={(rating) => handleRatingChange('overallRating', rating)}
                label="How would you rate this place overall?"
              />
            </CardContent>
          </Card>

          {/* Detailed Ratings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detailed Ratings</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StarRating
                rating={formData.foodQualityRating}
                onRatingChange={(rating) => handleRatingChange('foodQualityRating', rating)}
                label="Food Quality"
              />
              <StarRating
                rating={formData.serviceRating}
                onRatingChange={(rating) => handleRatingChange('serviceRating', rating)}
                label="Service"
              />
              <StarRating
                rating={formData.atmosphereRating}
                onRatingChange={(rating) => handleRatingChange('atmosphereRating', rating)}
                label="Atmosphere"
              />
              <StarRating
                rating={formData.priceLevelRating}
                onRatingChange={(rating) => handleRatingChange('priceLevelRating', rating)}
                label="Value for Money"
              />
            </CardContent>
          </Card>

          {/* Review Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              <div>
                <Label htmlFor="reviewText">Review Text *</Label>
                <textarea
                  id="reviewText"
                  name="reviewText"
                  value={formData.reviewText}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Tell us about your experience..."
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mt-1 ${
                    formData.reviewText.trim().length > 0 && formData.reviewText.trim().length < 20
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300'
                  }`}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className={`text-xs ${
                    formData.reviewText.trim().length > 0 && formData.reviewText.trim().length < 20
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}>
                    {formData.reviewText.trim().length > 0 && formData.reviewText.trim().length < 20
                      ? `Please enter at least ${20 - formData.reviewText.trim().length} more character${20 - formData.reviewText.trim().length > 1 ? 's' : ''}`
                      : 'Minimum 20 characters required'
                    }
                  </p>
                  <p className="text-xs text-gray-500">
                    {formData.reviewText.length}/20+ characters
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="visitDate">Visit Date *</Label>
                  <Input
                    id="visitDate"
                    name="visitDate"
                    type="date"
                    value={formData.visitDate}
                    onChange={handleInputChange}
                    max={new Date().toISOString().split('T')[0]}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="visitType">Visit Type *</Label>
                  <select
                    id="visitType"
                    name="visitType"
                    value={formData.visitType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1"
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Photos (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="images" className="cursor-pointer">
                    <div className="flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
                      <Camera className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">Add photos to your review</span>
                    </div>
                  </Label>
                  <input
                    id="images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
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
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error and Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center">
              <AlertCircle className="mr-2 h-4 w-4" />
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center">
              <CheckCircle className="mr-2 h-4 w-4" />
              {success}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || formData.reviewText.trim().length < 20}
              className="transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:opacity-70 px-8 shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
