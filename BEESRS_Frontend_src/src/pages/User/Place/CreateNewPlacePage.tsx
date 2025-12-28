import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  MapPin, 
  Clock, 
  Image as ImageIcon, 
  Plus, 
  Search, 
  Edit3, 
  ArrowLeft, 
  Eye, 
  X, 
  Upload, 
  Trash2,
  MoreHorizontal,
  MessageCircle,
  Heart,
  Star,
  Phone,
  Globe,
  Mail,
  Users,
  Calendar,
  DollarSign,
  User as UserIcon,
  ChevronDown
} from 'lucide-react'
import { CreateNewPlace, GetAllTags, UploadFilesToCloudinary, ViewCategory } from '@/services/userService'
import { TrackMap } from '@/pages/User/Place/TrackMap'
import { buttonStyles } from '@/lib/colors'
import { useNavigate } from 'react-router-dom'
import PageTransition from '@/components/Transition/PageTransition'
import { formatErrorMessage } from '@/utils/axios'
import { convertLocalTimeToUtc, getTimezoneFromStorage } from '@/utils/timezone'
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

interface Category {
  categoryId: number;
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  places: any[];
}

interface TagOption {
  tagId: number;
  name: string;
  description: string;
  isActive: boolean;
}

interface PlaceImage {
  file: File;
  preview: string;
  altText: string;
}

export default function CreateNewPlacePage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<'manual' | 'map' | 'upload'>('manual')
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [selectedLocationData, setSelectedLocationData] = useState<{
    lat: number;
    lng: number;
    address?: string;
    city?: string;
    state?: string;
    googlePlaceId?: string;
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<PlaceImage[]>([])
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [isConfirmCreateOpen, setIsConfirmCreateOpen] = useState(false)
  const [availableTags, setAvailableTags] = useState<TagOption[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [tagSearch, setTagSearch] = useState('')
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: 0,
    googlePlaceId: '',
    latitude: 0,
    longitude: 0,
    addressLine1: '',
    openTime: '',
    closeTime: '',
    city: '',
    stateProvince: '',
    phoneNumber: '',
    websiteUrl: '',
    email: '',
    bestTimeToVisit: '',
    busyTime: '',
    suitableFor: '',
    tags: [] as number[]
  })

  // Tag options for suitableFor
  const suitableForOptions = [
    { label: 'Business lunch', value: 'business_lunch' },
    { label: 'Team dinner', value: 'team_dinner' },
    { label: 'Casual', value: 'casual' },
    { label: 'Date', value: 'date' }
  ]

  // Tag options for bestTimeToVisit
  const bestTimeOptions = [
    { label: 'Weekday mornings', value: 'weekday_mornings' },
    { label: 'Weekend evenings', value: 'weekend_evenings' },
    { label: 'Off-peak hours', value: 'off_peak_hours' }
  ]

  // Tag options for busyTime
  const busyTimeOptions = [
    { label: 'Friday evenings', value: 'friday_evenings' },
    { label: 'Lunch hours', value: 'lunch_hours' },
    { label: 'Weekend afternoons', value: 'weekend_afternoons' }
  ]

  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedBestTimeTags, setSelectedBestTimeTags] = useState<string[]>([])
  const [selectedBusyTimeTags, setSelectedBusyTimeTags] = useState<string[]>([])

  // Load categories on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await ViewCategory()
        
        // Handle different response structures
        let categoriesData = null
        if (response.success && response.data) {
          categoriesData = response.data
        } else if (Array.isArray(response)) {
          categoriesData = response
        } else if (response.data && Array.isArray(response.data)) {
          categoriesData = response.data
        }
        
        if (categoriesData) {
          // Filter only active categories
          const activeCategories = categoriesData.filter((cat: Category) => cat.isActive)
          setCategories(activeCategories)
        }
      } catch (error) {
        console.error('Error loading categories:', error)
        setError('Failed to load categories')
      }
    }
    
    loadCategories()
  }, [])

  // Load tags for selection
  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await GetAllTags()
        if (Array.isArray(response)) {
          const activeTags = response.filter((tag: TagOption) => tag.isActive)
          setAvailableTags(activeTags)
        }
      } catch (error) {
        console.error('Error loading tags:', error)
      }
    }

    loadTags()
  }, [])

  // Debug: Log when openTime or closeTime changes
  useEffect(() => {
    console.log('[formData] openTime changed:', formData.openTime)
    console.log('[formData] closeTime changed:', formData.closeTime)
  }, [formData.openTime, formData.closeTime])

  // Disable body scroll when map modal is open
  useEffect(() => {
    if (isMapModalOpen) {
      // Store the current scroll position
      const scrollY = window.scrollY
      
      // Disable body scroll
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      return () => {
        // Re-enable body scroll
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        
        // Restore scroll position
        window.scrollTo(0, scrollY)
      }
    }
  }, [isMapModalOpen])

  // Disable body scroll when confirm modal is open
  useEffect(() => {
    if (isConfirmModalOpen) {
      // Store the current scroll position
      const scrollY = window.scrollY
      
      // Disable body scroll
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      return () => {
        // Re-enable body scroll
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        
        // Restore scroll position
        window.scrollTo(0, scrollY)
      }
    }
  }, [isConfirmModalOpen])

  const addLabelToCommaSeparated = (text: string, label: string) => {
    const parts = text
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
    const labelLower = label.toLowerCase()
    if (parts.some(part => part.toLowerCase() === labelLower)) {
      return text.trim()
    }
    if (!text.trim()) {
      return label
    }
    return `${text.trim().replace(/,\s*$/, '')}, ${label}`
  }

  const removeLabelFromCommaSeparated = (text: string, label: string) => {
    const labelLower = label.toLowerCase()
    const parts = text
      .split(',')
      .map(part => part.trim())
      .filter(part => part.toLowerCase() !== labelLower)
    return parts.join(parts.length ? ', ' : '')
  }

  // Helper functions to convert between 24h and 12h format
  const convert24hTo12h = (time24h: string) => {
    if (!time24h) return { hour: '12', minute: '00', period: 'AM' }
    const [hours, minutes] = time24h.split(':')
    const hour24 = parseInt(hours || '0', 10)
    if (isNaN(hour24)) return { hour: '12', minute: '00', period: 'AM' }
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const period = hour24 >= 12 ? 'PM' : 'AM'
    const minuteValue = (minutes || '00').padStart(2, '0')
    return {
      hour: hour12.toString().padStart(2, '0'),
      minute: minuteValue,
      period
    }
  }

  const convert12hTo24h = (hour: string, minute: string, period: string) => {
    let hour24 = parseInt(hour || '12', 10)
    if (isNaN(hour24)) hour24 = 12
    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0
    }
    const minuteValue = (minute || '00').padStart(2, '0')
    return `${hour24.toString().padStart(2, '0')}:${minuteValue}:00`
  }

  // Specific handlers for openTime to avoid closure issues
  const handleOpenTimeHourChange = (hour: string) => {
    setFormData(prev => {
      const time12h = convert24hTo12h(prev.openTime)
      const time24h = convert12hTo24h(hour, time12h.minute, time12h.period)
      console.log('[handleOpenTimeHourChange]', { hour, time12h, time24h })
      return { ...prev, openTime: time24h }
    })
  }

  const handleOpenTimeMinuteChange = (minute: string) => {
    setFormData(prev => {
      const time12h = convert24hTo12h(prev.openTime)
      const time24h = convert12hTo24h(time12h.hour, minute, time12h.period)
      console.log('[handleOpenTimeMinuteChange]', { minute, time12h, time24h })
      return { ...prev, openTime: time24h }
    })
  }

  const handleOpenTimePeriodChange = (period: string) => {
    setFormData(prev => {
      const time12h = convert24hTo12h(prev.openTime)
      const time24h = convert12hTo24h(time12h.hour, time12h.minute, period)
      console.log('[handleOpenTimePeriodChange]', { period, time12h, time24h })
      return { ...prev, openTime: time24h }
    })
  }

  // Specific handlers for closeTime
  const handleCloseTimeHourChange = (hour: string) => {
    setFormData(prev => {
      const time12h = convert24hTo12h(prev.closeTime)
      const time24h = convert12hTo24h(hour, time12h.minute, time12h.period)
      return { ...prev, closeTime: time24h }
    })
  }

  const handleCloseTimeMinuteChange = (minute: string) => {
    setFormData(prev => {
      const time12h = convert24hTo12h(prev.closeTime)
      const time24h = convert12hTo24h(time12h.hour, minute, time12h.period)
      return { ...prev, closeTime: time24h }
    })
  }

  const handleCloseTimePeriodChange = (period: string) => {
    setFormData(prev => {
      const time12h = convert24hTo12h(prev.closeTime)
      const time24h = convert12hTo24h(time12h.hour, time12h.minute, period)
      return { ...prev, closeTime: time24h }
    })
  }

  // Helper function to validate phone number format
  const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
    if (!phone.trim()) {
      return { isValid: true } // Empty is allowed (optional field)
    }
    
    // Remove all non-digit characters except + to count digits
    const digitsOnly = phone.replace(/\D/g, '')
    const hasPlus84 = phone.trim().startsWith('+84')
    
    if (hasPlus84) {
      // If starts with +84, must have exactly 9 more digits
      if (digitsOnly.length !== 11 || digitsOnly.substring(0, 2) !== '84') {
        return { isValid: false, error: 'Phone number with +84 must have exactly 9 digits after +84 (e.g., +84 123 456 789)' }
      }
    } else {
      // If no +84, must have exactly 10 digits
      if (digitsOnly.length !== 10) {
        return { isValid: false, error: 'Phone number must have exactly 10 digits (e.g., 0123 456 789)' }
      }
    }
    
    return { isValid: true }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    // Special handling for phoneNumber field - only allow numbers, spaces, hyphens, plus signs, and parentheses
    if (name === 'phoneNumber') {
      // Filter out invalid characters in real-time
      let filteredValue = value.replace(/[^\d\s\-\+\(\)]/g, '')
      
      // Limit length: max 15 characters (for +84 123 456 789 format)
      if (filteredValue.length > 15) {
        filteredValue = filteredValue.substring(0, 15)
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: filteredValue
      }))
      return
    }
    
    // Special handling for suitableFor field
    if (name === 'suitableFor') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
      
      // Update selectedTags based on the text input
      const matchingTags: string[] = []
      suitableForOptions.forEach(option => {
        if (value.toLowerCase().includes(option.label.toLowerCase())) {
          matchingTags.push(option.value)
        }
      })
      setSelectedTags(matchingTags)
    } else if (name === 'bestTimeToVisit') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
      
      // Update selectedBestTimeTags based on the text input
      const matchingTags: string[] = []
      bestTimeOptions.forEach(option => {
        if (value.toLowerCase().includes(option.label.toLowerCase())) {
          matchingTags.push(option.value)
        }
      })
      setSelectedBestTimeTags(matchingTags)
    } else if (name === 'busyTime') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
      
      // Update selectedBusyTimeTags based on the text input
      const matchingTags: string[] = []
      busyTimeOptions.forEach(option => {
        if (value.toLowerCase().includes(option.label.toLowerCase())) {
          matchingTags.push(option.value)
        }
      })
      setSelectedBusyTimeTags(matchingTags)
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'categoryId' || name === 'latitude' || name === 'longitude' 
          ? Number(value) 
          : value
      }))
    }
  }

  // Handle tag selection for suitableFor
  const handleTagToggle = (tagValue: string) => {
    setSelectedTags(prev => {
      const option = suitableForOptions.find(opt => opt.value === tagValue)
      if (!option) return prev
      const isSelected = prev.includes(tagValue)
      const newTags = isSelected
        ? prev.filter(tag => tag !== tagValue)
        : [...prev, tagValue]

      setFormData(prevForm => ({
        ...prevForm,
        suitableFor: isSelected
          ? removeLabelFromCommaSeparated(prevForm.suitableFor || '', option.label)
          : addLabelToCommaSeparated(prevForm.suitableFor || '', option.label)
      }))

      return newTags
    })
  }

  // Handle tag selection for bestTimeToVisit
  const handleBestTimeTagToggle = (tagValue: string) => {
    setSelectedBestTimeTags(prev => {
      const option = bestTimeOptions.find(opt => opt.value === tagValue)
      if (!option) return prev
      const isSelected = prev.includes(tagValue)
      const newTags = isSelected
        ? prev.filter(tag => tag !== tagValue)
        : [...prev, tagValue]

      setFormData(prevForm => ({
        ...prevForm,
        bestTimeToVisit: isSelected
          ? removeLabelFromCommaSeparated(prevForm.bestTimeToVisit || '', option.label)
          : addLabelToCommaSeparated(prevForm.bestTimeToVisit || '', option.label)
      }))

      return newTags
    })
  }

  // Handle tag selection for busyTime
  const handleBusyTimeTagToggle = (tagValue: string) => {
    setSelectedBusyTimeTags(prev => {
      const option = busyTimeOptions.find(opt => opt.value === tagValue)
      if (!option) return prev
      const isSelected = prev.includes(tagValue)
      const newTags = isSelected
        ? prev.filter(tag => tag !== tagValue)
        : [...prev, tagValue]

      setFormData(prevForm => ({
        ...prevForm,
        busyTime: isSelected
          ? removeLabelFromCommaSeparated(prevForm.busyTime || '', option.label)
          : addLabelToCommaSeparated(prevForm.busyTime || '', option.label)
      }))

      return newTags
    })
  }

  const filteredTagOptions = availableTags
    .filter(tag => tag.isActive)
    .filter(tag => !selectedTagIds.includes(tag.tagId))
    .filter(tag => {
      if (!tagSearch.trim()) return true
      const keyword = tagSearch.toLowerCase()
      return (
        tag.name.toLowerCase().includes(keyword) ||
        (tag.description ?? '').toLowerCase().includes(keyword)
      )
    })

  const handleAddTag = (tagId: number) => {
    setSelectedTagIds(prev => {
      if (prev.includes(tagId)) return prev
      const updated = [...prev, tagId]
      setFormData(prevForm => ({ ...prevForm, tags: updated }))
      return updated
    })
    setIsTagDropdownOpen(false)
    setTagSearch('')
  }

  const handleRemoveTag = (tagId: number) => {
    setSelectedTagIds(prev => {
      const updated = prev.filter(id => id !== tagId)
      setFormData(prevForm => ({ ...prevForm, tags: updated }))
      return updated
    })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) return false
      if (file.size > 5 * 1024 * 1024) return false
      return true
    })
    
    if (validFiles.length !== files.length) {
      setError('Some files were skipped. Only image files under 5MB are allowed.')
    }
    
    validFiles.forEach(file => {
      const preview = URL.createObjectURL(file)
      setImages(prev => [...prev, {
        file,
        preview,
        altText: file.name.split('.')[0]
      }])
    })
  }

  const removeImage = (index: number) => {
    const imageToRemove = images[index]
    URL.revokeObjectURL(imageToRemove.preview)
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const performCreatePlace = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    // ✅ REQUIRED: Select location on map before creating place
    if (!formData.latitude || !formData.longitude) {
      setIsLoading(false);
      setError('Please pick a location on the map first.');
      return;
    }

    // Validate phone number format
    if (formData.phoneNumber.trim()) {
      const phoneValidation = validatePhoneNumber(formData.phoneNumber.trim())
      if (!phoneValidation.isValid) {
        setIsLoading(false);
        setError(phoneValidation.error || 'Invalid phone number format.');
        return;
      }
    }

    try {
      // Build imageUrlsList: upload local files to Cloudinary first, keep direct URLs
      const filesToUpload: File[] = []
      const altTexts: string[] = []
      const urlImages: { imageUrl: string; altText: string }[] = []

      images.forEach((img) => {
        if (img.preview.startsWith('blob:')) {
          filesToUpload.push(img.file)
          altTexts.push(img.altText)
        } else {
          urlImages.push({ imageUrl: img.preview, altText: img.altText })
        }
      })

      let uploadedImageList: { imageUrl: string; altText: string }[] = []
      if (filesToUpload.length > 0) {
        try {
          uploadedImageList = await UploadFilesToCloudinary(filesToUpload, altTexts)
        } catch (uploadErr: any) {
          console.error('Upload to Cloudinary failed:', uploadErr)
          throw new Error(uploadErr?.message || 'Failed to upload images. Please try again.')
        }
      }

      const imageUrlsList = [...uploadedImageList, ...urlImages]
      const normalizedEmail = formData.email.trim() || ''
      const normalizedWebsite = formData.websiteUrl.trim() || ''
      const normalizedPhone = formData.phoneNumber.trim() || ''
      const normalizedSuitableFor = formData.suitableFor.trim() || ''

      // Get timezone from localStorage
      const timezone = getTimezoneFromStorage()
      
      if (!timezone) {
        console.warn('[CreatePlace] No timezone found in localStorage. Using UTC+00:00 as default.')
        setError('Timezone not found. Please login again to set your timezone.')
        setIsLoading(false)
        return
      }
      
      console.log('[CreatePlace] Original times:', {
        openTime: formData.openTime,
        closeTime: formData.closeTime,
        timezone: timezone
      })
      
      // Convert local times to UTC before sending to backend
      // Backend stores times in UTC, so we need to subtract timezone offset
      const openTimeUtc = formData.openTime 
        ? convertLocalTimeToUtc(formData.openTime, timezone)
        : ''
      const closeTimeUtc = formData.closeTime
        ? convertLocalTimeToUtc(formData.closeTime, timezone)
        : ''
      
      console.log('[CreatePlace] Converted to UTC:', {
        openTimeUtc,
        closeTimeUtc,
        originalOpenTime: formData.openTime,
        originalCloseTime: formData.closeTime
      })

      // Create the place with integrated images
      await CreateNewPlace({
        ...formData,
        openTime: openTimeUtc,
        closeTime: closeTimeUtc,
        email: normalizedEmail,
        websiteUrl: normalizedWebsite,
        phoneNumber: normalizedPhone,
        suitableFor: normalizedSuitableFor,
        imageUrlsList,
        tags: selectedTagIds
      });


      setSuccess('Place created successfully! Redirecting...');

      // Navigate away after brief success message
      setTimeout(() => {
        navigate('/profile')
        setSuccess('')
        // Reset form state
        setFormData({
          name: '',
          description: '',
          categoryId: 0,
          googlePlaceId: '',
          latitude: 0,
          longitude: 0,
          addressLine1: '',
          openTime: '',
          closeTime: '',
          city: '',
          stateProvince: '',
          phoneNumber: '',
          websiteUrl: '',
          email: '',
          bestTimeToVisit: '',
          busyTime: '',
          suitableFor: '',
          tags: []
        })
        setSelectedTags([])
        setSelectedBestTimeTags([])
        setSelectedBusyTimeTags([])
        setSelectedTagIds([])
        setImages([])
        setCurrentStep('manual')
      }, 1500)
    } catch (error: any) {
      console.error('Create place error:', error);
      const backendData = error?.response?.data
      let message: string

      if (typeof backendData === 'string') {
        // BE returned a plain string, e.g. "GooglePlaceId 'xxx' already exists."
        message = backendData
      } else if (backendData?.message) {
        message = backendData.message
      } else if (backendData?.errors) {
        // Parse validation errors so FE can show detailed messages instead of only title
        const errors = backendData.errors

        if (typeof errors === 'string') {
          message = errors
        } else if (Array.isArray(errors)) {
          // In case BE returns a simple array of messages
          message = errors.join('\n')
        } else if (errors && typeof errors === 'object') {
          // Typical ASP.NET Core format: { "Email": ["The Email field is not a valid e-mail address."] }
          const collected: string[] = []
          Object.entries(errors as Record<string, string | string[]>).forEach(([field, value]) => {
            if (Array.isArray(value)) {
              value.forEach(v => {
                if (v) collected.push(`${field}: ${v}`)
              })
            } else if (typeof value === 'string' && value.trim()) {
              collected.push(`${field}: ${value}`)
            }
          })

          if (collected.length > 0) {
            if (backendData.title && typeof backendData.title === 'string') {
              message = `${backendData.title}\n${collected.join('\n')}`
            } else {
              message = collected.join('\n')
            }
          } else {
            message = 'Validation failed. Please check your input.'
          }
        } else {
          message = 'Validation failed. Please check your input.'
        }
      } else if (backendData?.title) {
        message = backendData.title
      } else {
        message = formatErrorMessage(error, 'Failed to create place')
      }

      setError(message)
    } finally {
      setIsLoading(false);
    }
  }

  // Integrated flow — no separate image upload step

  // Handle location selection from map
  const handleLocationPick = (lat: number, lng: number, address?: string, city?: string, state?: string, googlePlaceId?: string) => {
    setSelectedLocationData({
      lat,
      lng,
      address,
      city,
      state,
      googlePlaceId
    })
    setIsMapModalOpen(false)
    setIsConfirmModalOpen(true)
  }

  // Confirm location selection
  const handleConfirmLocation = () => {
    if (selectedLocationData) {
      setFormData(prev => ({
        ...prev,
        latitude: selectedLocationData.lat,
        longitude: selectedLocationData.lng,
        addressLine1: selectedLocationData.address ?? prev.addressLine1,
        city: selectedLocationData.city ?? prev.city,
        stateProvince: selectedLocationData.state ?? prev.stateProvince,
        googlePlaceId: selectedLocationData.googlePlaceId ?? prev.googlePlaceId
      }))
      setSuccess(`✓ Location confirmed: ${selectedLocationData.lat.toFixed(6)}, ${selectedLocationData.lng.toFixed(6)}${selectedLocationData.address ? ` — ${selectedLocationData.address}` : ''}${selectedLocationData.googlePlaceId ? ` (Google Place ID: ${selectedLocationData.googlePlaceId})` : ''}`)
    }
    setIsConfirmModalOpen(false)
    setSelectedLocationData(null)
  }

  // Cancel location selection
  const handleCancelLocation = () => {
    setIsConfirmModalOpen(false)
    setSelectedLocationData(null)
  }

  // Get category name for preview
  const getCategoryName = () => {
    const category = categories.find(cat => cat.categoryId === formData.categoryId)
    return category?.name || 'Category'
  }

  // Handle invalid input to show English validation messages
  const handleInvalid = (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.preventDefault()
    const target = e.currentTarget
    const fieldName = target.name || target.id
    
    // Set custom validation messages in English
    const messages: Record<string, string> = {
      name: 'Please enter a place name.',
      categoryId: 'Please select a category.',
      description: 'Please enter a description.',
      addressLine1: 'Please enter a street address.',
      city: 'Please enter a city name.',
      stateProvince: 'Please enter a state or province.',
      openTime: 'Please select an opening time.',
      closeTime: 'Please select a closing time.'
    }
    
    const message = messages[fieldName] || 'Please fill in this field.'
    target.setCustomValidity(message)
    
    // Show the custom message
    if (!target.reportValidity) {
      // Fallback for older browsers
      alert(message)
    } else {
      target.reportValidity()
    }
  }

  // Clear custom validity when user starts typing
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.setCustomValidity('')
  }

  return (
    <PageTransition delayMs={100} durationMs={600} variant="zoom">
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-transparent"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">Create New Place</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMapModalOpen(true)}
                className="flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Open Map
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          
          {/* Left Column - Form (Red Area) */}
          <div className="lg:col-span-6 space-y-6">
            <Card className="border-2 border-red-200 shadow-lg bg-gradient-to-br from-red-50/50 to-pink-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center">
                    <Edit3 className="w-5 h-5 text-red-600" />
                  </div>
                  New Place Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentStep === 'manual' && (
                  <form
                    lang="en"
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault()
                      const form = e.currentTarget
                      
                      // Set custom validation messages for all required fields
                      const requiredFields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[required]')
                      let isValid = true
                      
                      requiredFields.forEach(field => {
                        const fieldName = field.name || field.id
                        const messages: Record<string, string> = {
                          name: 'Please enter a place name.',
                          categoryId: 'Please select a category.',
                          description: 'Please enter a description.',
                          addressLine1: 'Please enter a street address.',
                          city: 'Please enter a city name.',
                          stateProvince: 'Please enter a state or province.',
                          openTime: 'Please select an opening time.',
                          closeTime: 'Please select a closing time.'
                        }
                        
                        const isEmpty = !field.value || (field instanceof HTMLSelectElement && field.value === '0')
                        
                        if (isEmpty) {
                          isValid = false
                          const message = messages[fieldName] || 'Please fill in this field.'
                          field.setCustomValidity(message)
                          field.reportValidity()
                        } else {
                          field.setCustomValidity('')
                        }
                      })
                      
                      if (isValid) {
                        setIsConfirmCreateOpen(true)
                      }
                    }}
                    className="space-y-6"
                  >
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        Basic Information
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Place Name *</Label>
                          <Input 
                            id="name" 
                            name="name" 
                            value={formData.name} 
                            onChange={handleInputChange}
                            onInvalid={handleInvalid}
                            onFocus={handleInputFocus}
                            required 
                            placeholder="Enter place name"
                            className="transition-all duration-200 border-2 hover:border-blue-300 focus:border-blue-500 focus:scale-[1.01]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="categoryId" className="text-sm font-semibold text-gray-700">Category *</Label>
                          <select
                            id="categoryId"
                            name="categoryId"
                            value={formData.categoryId}
                            onChange={handleInputChange}
                            onInvalid={handleInvalid}
                            onFocus={handleInputFocus}
                            required
                            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-300 focus:scale-[1.01]"
                          >
                            <option value={0}>Select Category</option>
                            {categories.length === 0 ? (
                              <option disabled>Loading categories...</option>
                            ) : (
                              categories.map((category) => (
                                <option key={category.categoryId} value={category.categoryId}>
                                  {category.name}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="description" className="text-sm font-semibold text-gray-700">Description *</Label>
                          <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            onInvalid={handleInvalid}
                            onFocus={handleInputFocus}
                            required
                            rows={4}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 hover:border-blue-300 focus:scale-[1.01]"
                            placeholder="Describe the place in detail..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">Tags (optional)</Label>
                          <div
                            className="relative"
                          >
                            <div
                              className="w-full min-h-[48px] border-2 border-gray-300 rounded-md px-3 py-2 flex items-center gap-2 flex-wrap cursor-text bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all duration-200 hover:border-blue-300"
                              onClick={() => {
                                setIsTagDropdownOpen(true)
                              }}
                            >
                              {availableTags.filter(tag => selectedTagIds.includes(tag.tagId)).map(tag => (
                                <span
                                  key={tag.tagId}
                                  className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 text-xs font-medium"
                                >
                                  {tag.name}
                                  <button
                                    type="button"
                                    className="text-blue-600 hover:text-blue-800"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRemoveTag(tag.tagId)
                                    }}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                              <input
                                type="text"
                                value={tagSearch}
                                onChange={(e) => setTagSearch(e.target.value)}
                                onFocus={() => setIsTagDropdownOpen(true)}
                                onBlur={() => {
                                  setTimeout(() => setIsTagDropdownOpen(false), 120)
                                }}
                                placeholder={selectedTagIds.length ? 'Search more tags...' : 'Search and select tags'}
                                className="flex-1 min-w-[140px] border-none focus:outline-none focus:ring-0 text-sm placeholder:text-gray-400"
                              />
                            </div>

                            {isTagDropdownOpen && (
                              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
                                {filteredTagOptions.length === 0 ? (
                                  <div className="px-3 py-2 text-sm text-gray-500">
                                    No tags found
                                  </div>
                                ) : (
                                  filteredTagOptions.map((tag) => (
                                    <button
                                      type="button"
                                      key={tag.tagId}
                                      onMouseDown={(e) => {
                                        e.preventDefault()
                                        handleAddTag(tag.tagId)
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors"
                                    >
                                      <div className="text-sm font-semibold text-gray-900">{tag.name}</div>
                                      {tag.description && (
                                        <div className="text-xs text-gray-600">{tag.description}</div>
                                      )}
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">Select multiple tags. Chosen tags appear above and can be removed.</p>
                        </div>
                      </div>
                    </div>

                    {/* Location Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-green-600" />
                        Location Information
                      </h3>
                      
                      <div className="flex gap-4">
                        <div className="w-[70%] bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Search className="w-5 h-5 text-amber-600" />
                            <p className="text-sm font-semibold text-gray-800">Pick location on map</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsMapModalOpen(true)}
                            className="w-full transition-all duration-200 hover:scale-[1.02] border-2 hover:border-amber-400 hover:bg-amber-50 hover:text-gray-600"
                          >
                            <MapPin className="w-4 h-4 mr-2 text-amber-600" />
                            Open Map Selector
                          </Button>
                          <p className="text-xs text-gray-600 mt-3">
                            Click to open interactive map. Tap any location to auto-fill coordinates and address.
                          </p>
                        </div>

                        <div className="w-[30%] space-y-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                              <span>Latitude *</span>
                              {formData.latitude !== 0 && <span className="text-xs text-green-600 font-normal">✓ Set</span>}
                            </Label>
                            <Input 
                              value={formData.latitude || ''} 
                              readOnly 
                              className="bg-gray-100 border-2 font-mono text-gray-700" 
                              placeholder="Click map to set"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                              <span>Longitude *</span>
                              {formData.longitude !== 0 && <span className="text-xs text-green-600 font-normal">✓ Set</span>}
                            </Label>
                            <Input 
                              value={formData.longitude || ''} 
                              readOnly 
                              className="bg-gray-100 border-2 font-mono text-gray-700" 
                              placeholder="Click map to set"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="addressLine1" className="text-sm font-semibold text-gray-700">Street Address *</Label>
                        <Input
                          id="addressLine1"
                          name="addressLine1"
                          value={formData.addressLine1}
                          onChange={handleInputChange}
                          onInvalid={handleInvalid}
                          onFocus={handleInputFocus}
                          required
                          placeholder="Auto-filled after picking location (editable)"
                          className="transition-all duration-200 border-2 hover:border-green-300 focus:border-green-500 focus:scale-[1.01]"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city" className="text-sm font-semibold text-gray-700">City *</Label>
                          <Input 
                            id="city" 
                            name="city" 
                            value={formData.city} 
                            onChange={handleInputChange}
                            onInvalid={handleInvalid}
                            onFocus={handleInputFocus}
                            required 
                            placeholder="Enter city name"
                            className="transition-all duration-200 border-2 hover:border-green-300 focus:border-green-500 focus:scale-[1.01]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="stateProvince" className="text-sm font-semibold text-gray-700">State/Province *</Label>
                          <Input 
                            id="stateProvince" 
                            name="stateProvince" 
                            value={formData.stateProvince} 
                            onChange={handleInputChange}
                            onInvalid={handleInvalid}
                            onFocus={handleInputFocus}
                            required 
                            placeholder="Enter state or province"
                            className="transition-all duration-200 border-2 hover:border-green-300 focus:border-green-500 focus:scale-[1.01]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contact & Hours */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-600" />
                        Contact & Hours
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="openTime" className="text-sm font-semibold text-gray-700">Opening Time *</Label>
                          <div className="inline-flex items-center gap-1 px-2 py-1 border-2 border-gray-300 rounded-md hover:border-orange-300 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500 transition-all duration-200 bg-white">
                            {(() => {
                              const time12h = convert24hTo12h(formData.openTime)
                              return (
                                <>
                                  <div className="relative">
                                    <select
                                      value={time12h.hour}
                                      onChange={(e) => handleOpenTimeHourChange(e.target.value)}
                                      onInvalid={handleInvalid}
                                      onFocus={handleInputFocus}
                                      className="w-12 px-1 py-0.5 border-0 bg-transparent text-center font-medium text-gray-900 text-sm focus:outline-none cursor-pointer appearance-none"
                                      required
                                    >
                                      {Array.from({ length: 12 }, (_, i) => {
                                        const hour = (i + 1).toString().padStart(2, '0')
                                        return <option key={hour} value={hour}>{hour}</option>
                                      })}
                                    </select>
                                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400 pointer-events-none" />
                                  </div>
                                  <span className="text-gray-400 text-xs">:</span>
                                  <div className="relative">
                                    <select
                                      value={time12h.minute}
                                      onChange={(e) => handleOpenTimeMinuteChange(e.target.value)}
                                      onInvalid={handleInvalid}
                                      onFocus={handleInputFocus}
                                      className="w-12 px-1 py-0.5 border-0 bg-transparent text-center font-medium text-gray-900 text-sm focus:outline-none cursor-pointer appearance-none"
                                      required
                                    >
                                      {Array.from({ length: 60 }, (_, i) => {
                                        const minute = i.toString().padStart(2, '0')
                                        return <option key={minute} value={minute}>{minute}</option>
                                      })}
                                    </select>
                                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400 pointer-events-none" />
                                  </div>
                                  <div className="relative ml-0.5">
                                    <select
                                      value={time12h.period}
                                      onChange={(e) => handleOpenTimePeriodChange(e.target.value)}
                                      onInvalid={handleInvalid}
                                      onFocus={handleInputFocus}
                                      className="w-12 px-1 py-0.5 border-0 bg-transparent text-center font-medium text-gray-900 text-sm focus:outline-none cursor-pointer appearance-none"
                                      required
                                    >
                                      <option value="AM">AM</option>
                                      <option value="PM">PM</option>
                                    </select>
                                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400 pointer-events-none" />
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="closeTime" className="text-sm font-semibold text-gray-700">Closing Time *</Label>
                          <div className="inline-flex items-center gap-1 px-2 py-1 border-2 border-gray-300 rounded-md hover:border-orange-300 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500 transition-all duration-200 bg-white">
                            {(() => {
                              const time12h = convert24hTo12h(formData.closeTime)
                              return (
                                <>
                                  <div className="relative">
                                    <select
                                      value={time12h.hour}
                                      onChange={(e) => handleCloseTimeHourChange(e.target.value)}
                                      onInvalid={handleInvalid}
                                      onFocus={handleInputFocus}
                                      className="w-12 px-1 py-0.5 border-0 bg-transparent text-center font-medium text-gray-900 text-sm focus:outline-none cursor-pointer appearance-none"
                                      required
                                    >
                                      {Array.from({ length: 12 }, (_, i) => {
                                        const hour = (i + 1).toString().padStart(2, '0')
                                        return <option key={hour} value={hour}>{hour}</option>
                                      })}
                                    </select>
                                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400 pointer-events-none" />
                                  </div>
                                  <span className="text-gray-400 text-xs">:</span>
                                  <div className="relative">
                                    <select
                                      value={time12h.minute}
                                      onChange={(e) => handleCloseTimeMinuteChange(e.target.value)}
                                      onInvalid={handleInvalid}
                                      onFocus={handleInputFocus}
                                      className="w-12 px-1 py-0.5 border-0 bg-transparent text-center font-medium text-gray-900 text-sm focus:outline-none cursor-pointer appearance-none"
                                      required
                                    >
                                      {Array.from({ length: 60 }, (_, i) => {
                                        const minute = i.toString().padStart(2, '0')
                                        return <option key={minute} value={minute}>{minute}</option>
                                      })}
                                    </select>
                                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400 pointer-events-none" />
                                  </div>
                                  <div className="relative ml-0.5">
                                    <select
                                      value={time12h.period}
                                      onChange={(e) => handleCloseTimePeriodChange(e.target.value)}
                                      onInvalid={handleInvalid}
                                      onFocus={handleInputFocus}
                                      className="w-12 px-1 py-0.5 border-0 bg-transparent text-center font-medium text-gray-900 text-sm focus:outline-none cursor-pointer appearance-none"
                                      required
                                    >
                                      <option value="AM">AM</option>
                                      <option value="PM">PM</option>
                                    </select>
                                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400 pointer-events-none" />
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phoneNumber" className="text-sm font-semibold text-gray-700">Phone Number</Label>
                          <Input 
                            id="phoneNumber" 
                            name="phoneNumber" 
                            value={formData.phoneNumber} 
                            onChange={handleInputChange} 
                            placeholder="+84 xxx xxx xxx"
                            className="transition-all duration-200 border-2 hover:border-orange-300 focus:border-orange-500 focus:scale-[1.01]"
                          />
                        </div>
                      </div>

                      {/* Best Time and Busy Time Section */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Best Time to Visit Section */}
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold text-gray-700">Best Time to Visit *</Label>
                          <p className="text-xs text-gray-600">Select predefined options or enter custom text</p>
                          
                          <div className="space-y-2">
                            <textarea
                              id="bestTimeToVisit"
                              name="bestTimeToVisit"
                              value={formData.bestTimeToVisit}
                              onChange={handleInputChange}
                              rows={2}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none transition-all duration-200 hover:border-orange-300 focus:scale-[1.01]"
                              placeholder="Enter contents or select tags below to auto-fill..."
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {bestTimeOptions.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => handleBestTimeTagToggle(option.value)}
                                  className={`transition-all duration-200 hover:scale-105 focus:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-full px-3 py-1.5 text-xs font-medium border-2 ${
                                    selectedBestTimeTags.includes(option.value)
                                      ? `${buttonStyles.primary} border-0 shadow-lg font-bold`
                                      : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                                  }`}
                                >
                                  {option.label}
                                  {selectedBestTimeTags.includes(option.value) && (
                                    <span className="ml-1 text-xs">✓</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Busy Time Section */}
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold text-gray-700">Busy Time *</Label>
                          <p className="text-xs text-gray-600">Select predefined options or enter custom text</p>
                          
                          <div className="space-y-2">
                            <textarea
                              id="busyTime"
                              name="busyTime"
                              value={formData.busyTime}
                              onChange={handleInputChange}
                              rows={2}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none transition-all duration-200 hover:border-orange-300 focus:scale-[1.01]"
                              placeholder="Enter contents or select tags below to auto-fill..."
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {busyTimeOptions.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => handleBusyTimeTagToggle(option.value)}
                                  className={`transition-all duration-200 hover:scale-105 focus:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-full px-3 py-1.5 text-xs font-medium border-2 ${
                                    selectedBusyTimeTags.includes(option.value)
                                      ? `${buttonStyles.primary} border-0 shadow-lg font-bold`
                                      : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                                  }`}
                                >
                                  {option.label}
                                  {selectedBusyTimeTags.includes(option.value) && (
                                    <span className="ml-1 text-xs">✓</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address</Label>
                          <Input 
                            id="email" 
                            name="email" 
                            type="email"
                            value={formData.email} 
                            onChange={handleInputChange} 
                            placeholder="contact@example.com"
                            className="transition-all duration-200 border-2 hover:border-orange-300 focus:border-orange-500 focus:scale-[1.01]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="websiteUrl" className="text-sm font-semibold text-gray-700">Website URL</Label>
                          <Input 
                            id="websiteUrl" 
                            name="websiteUrl" 
                            type="url"
                            value={formData.websiteUrl} 
                            onChange={handleInputChange} 
                            placeholder="https://example.com"
                            className="transition-all duration-200 border-2 hover:border-orange-300 focus:border-orange-500 focus:scale-[1.01]"
                          />
                        </div>
                      </div>

                      {/* Suitable For Tags Section */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-gray-700">Suitable For *</Label>
                        <p className="text-xs text-gray-600">Select predefined options or enter custom text</p>
                        
                        <div className="space-y-2">
                          <textarea
                            id="suitableFor"
                            name="suitableFor"
                            value={formData.suitableFor}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full px-4 py-1 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none transition-all duration-200 hover:border-orange-300 focus:scale-[1.01]"
                            placeholder="Enter contents or select tags below to auto-fill..."
                          />
                          <p className="text-xs text-gray-500">This field will be automatically filled when you select tags below, or you can type custom text directly.</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-3">
                            {suitableForOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => handleTagToggle(option.value)}
                                className={`transition-all duration-200 hover:scale-105 focus:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-full px-4 py-2 text-sm font-medium border-2 ${
                                  selectedTags.includes(option.value)
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-lg font-bold'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                                }`}
                              >
                                {option.label}
                                {selectedTags.includes(option.value) && (
                                  <span className="ml-2 text-xs">✓</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Images Section (Integrated) */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-purple-600" />
                        Images (optional)
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="image-upload-input" className="cursor-pointer">
                            <div className="flex flex-col items-center justify-center space-y-3 px-6 py-8 border-2 border-dashed border-purple-300 rounded-xl hover:bg-purple-50 hover:border-purple-400 transition-all duration-200 hover:scale-[1.02] bg-white">
                              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center">
                                <Upload className="w-8 h-8 text-purple-600" />
                              </div>
                              <div className="text-center">
                                <span className="font-semibold text-gray-900 block">Upload from Device</span>
                                <span className="text-xs text-gray-600 mt-1 block">Click to browse files</span>
                              </div>
                            </div>
                          </Label>
                          <input
                            id="image-upload-input"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <p className="text-xs text-gray-600 mt-3">JPG, PNG or GIF • Max 5MB each • Multiple files supported</p>
                        </div>

                        <div>
                          <Label htmlFor="image-url-input" className="text-sm font-semibold text-gray-700 mb-2 block">Add Image from URL</Label>
                          <div className="flex gap-2">
                            <Input
                              id="image-url-input"
                              type="url"
                              value={imageUrlInput}
                              placeholder="https://example.com/image.jpg"
                              className="border-2"
                              onChange={(e) => setImageUrlInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  if (imageUrlInput) {
                                    try {
                                      new URL(imageUrlInput)
                                      setImages(prev => [...prev, {
                                        file: new File([''], 'url-image', { type: 'image/jpeg' }),
                                        preview: imageUrlInput,
                                        altText: 'Image from URL'
                                      }])
                                      setImageUrlInput('')
                                      setError('')
                                    } catch {
                                      setError('Please enter a valid URL')
                                    }
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="border-2"
                              onClick={() => {
                                if (imageUrlInput) {
                                  try {
                                    new URL(imageUrlInput)
                                    setImages(prev => [...prev, {
                                      file: new File([''], 'url-image', { type: 'image/jpeg' }),
                                      preview: imageUrlInput,
                                      altText: 'Image from URL'
                                    }])
                                    setImageUrlInput('')
                                    setError('')
                                  } catch {
                                    setError('Please enter a valid URL')
                                  }
                                }
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add URL
                            </Button>
                          </div>
                          <p className="text-xs text-gray-600 mt-3">Paste direct image URL and press Enter or click Add</p>
                        </div>
                      </div>

                      {images.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Selected Images ({images.length})</h3>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                images.forEach(img => URL.revokeObjectURL(img.preview))
                                setImages([])
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Clear All
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {images.map((image, index) => (
                              <div key={index} className="space-y-2">
                                <div className="relative group">
                                  <div className="relative w-full h-40 overflow-hidden rounded-xl border-2 border-gray-200 shadow-sm">
                                    <img 
                                      src={image.preview} 
                                      alt={image.altText}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.display = 'none'
                                        const fallback = e.currentTarget.parentElement?.querySelector('.preview-fallback')
                                        if (fallback) {
                                          (fallback as HTMLElement).style.display = 'flex'
                                        }
                                      }}
                                    />
                                    <div className="preview-fallback absolute inset-0 bg-gray-100 rounded-xl flex items-center justify-center" style={{ display: 'none' }}>
                                      <ImageIcon className="w-12 h-12 text-gray-400" />
                                    </div>
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                                      <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-red-500 hover:bg-red-600 text-white border-2 border-white rounded-full p-2 hover:scale-110 shadow-lg"
                                      >
                                        <Trash2 className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <Input
                                  value={image.altText}
                                  onChange={(e) => {
                                    const newImages = [...images]
                                    newImages[index].altText = e.target.value
                                    setImages(newImages)
                                  }}
                                  placeholder="Image description"
                                  className="text-sm border-2 transition-all duration-200 focus:scale-[1.01]"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {error && (
                      <div className="bg-red-50 border-2 border-red-300 text-red-800 px-5 py-4 rounded-xl text-sm animate-in fade-in duration-200 flex items-start gap-3 shadow-sm">
                        <span className="text-xl">⚠</span>
                        <span>{error}</span>
                      </div>
                    )}
                    
                    {success && (
                      <div className="bg-green-50 border-2 border-green-300 text-green-800 px-5 py-4 rounded-xl text-sm flex items-center animate-in fade-in duration-200 shadow-sm">
                        <span className="mr-3 text-xl">✓</span>
                        <span className="font-medium">{success}</span>
                      </div>
                    )}

                    <div className="flex justify-end space-x-4 pt-6 border-t-2 border-gray-200">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => navigate('/profile')}
                        disabled={isLoading}
                        className="transition-all duration-200 hover:scale-105 text-gray-700 hover:text-gray-100"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:opacity-70 px-8 shadow-lg"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="w-5 h-5 mr-2" />
                            Create Place
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}


                {/* integrated flow removes the separate 'upload' step */}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview (Green Area) */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-2 border-green-200 shadow-lg bg-gradient-to-br from-green-50/50 to-emerald-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                    <Eye className="w-5 h-5 text-green-600" />
                  </div>
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Preview shows how your place will appear when published. This updates in real-time as you fill in the form.
                  </p>
                  
                  {/* Preview Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
                            <UserIcon className="w-6 h-6" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">Beesrs User</span>
                            {formData.categoryId > 0 && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium">
                                {getCategoryName()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{[formData.city, formData.stateProvince].filter(Boolean).join(', ') || 'Location coming soon'}</span>
                            <span>• Just now</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="More actions"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{formData.name || 'Place Name'}</h2>
                      <p className="text-gray-700 leading-relaxed mt-2">
                        {formData.description || 'Add a short description to let everyone know what makes this place special.'}
                      </p>
                    </div>

                    {/* Image Grid */}
                    {images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {images.slice(0, 3).map((image, index, arr) => (
                          <div key={`${image.preview}-${index}`} className="relative overflow-hidden rounded-lg border border-gray-100">
                            <img
                              src={image.preview}
                              alt={image.altText}
                              className="w-full h-40 object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none'
                                const fallback = e.currentTarget.parentElement?.querySelector('.preview-fallback')
                                if (fallback) {
                                  (fallback as HTMLElement).classList.remove('hidden')
                                }
                              }}
                            />
                            <div className="preview-fallback hidden absolute inset-0 bg-gray-100 items-center justify-center">
                              <ImageIcon className="w-10 h-10 text-gray-400" />
                            </div>
                            {index === arr.length - 1 && images.length > arr.length && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold text-sm">
                                +{images.length - arr.length} more
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">
                            {formData.addressLine1 || 'Address will appear once you pick a location.'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700">
                            {formData.openTime && formData.closeTime
                              ? `${formData.openTime.slice(0,5)} - ${formData.closeTime.slice(0,5)}`
                              : 'Operating hours not set'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className="w-4 h-4 text-gray-300" />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600">Not rated yet</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {formData.bestTimeToVisit && (
                          <div className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">
                              Best time: {formData.bestTimeToVisit}
                            </span>
                          </div>
                        )}
                        {formData.busyTime && (
                          <div className="flex items-start gap-2">
                            <Clock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">
                              Busy time: {formData.busyTime}
                            </span>
                          </div>
                        )}
                        {formData.suitableFor && (
                          <div className="flex items-start gap-2">
                            <Users className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">
                              Suitable for: {formData.suitableFor}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contact */}
                    {(formData.phoneNumber || formData.websiteUrl || formData.email) && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {formData.phoneNumber && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700">{formData.phoneNumber}</span>
                            </div>
                          )}
                          {formData.websiteUrl && (
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-gray-500" />
                              <span className="text-blue-600">{formData.websiteUrl}</span>
                            </div>
                          )}
                          {formData.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700">{formData.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Price placeholder */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span>Price level not specified</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-6 text-gray-500 text-sm">
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>0 reviews</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        <span>0 likes</span>
                      </div>
                      <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>Open Map</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Map Modal */}
      {isMapModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-300" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 999999 }}>
          <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                  <Search className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Select Location on Map</h2>
                  <p className="text-sm text-gray-600 mt-0.5">TrackAsia Interactive Map</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMapModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 transition-all duration-200 hover:bg-white rounded-full p-2 hover:scale-110"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2 text-lg">How to use:</h3>
                    <ul className="text-sm text-gray-700 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold mt-0.5">•</span>
                        <span>Click anywhere on the map to select a location</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold mt-0.5">•</span>
                        <span><b>Latitude & Longitude</b> will be automatically captured</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold mt-0.5">•</span>
                        <span><b>Address</b> will be reverse-geocoded if available</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold mt-0.5">•</span>
                        <span><b>Google Place ID</b> will be auto-filled when searching for specific places</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-2 border-gray-300 rounded-2xl overflow-hidden shadow-lg" style={{ height: '500px', color:'#0b1f3a' }}>
                <TrackMap
                  visible={isMapModalOpen}
                  onPick={handleLocationPick}
                />
              </div>

              {success && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 text-green-800 px-5 py-4 rounded-xl text-sm flex items-center animate-in fade-in duration-200 shadow-sm">
                  <span className="mr-3 text-xl">✓</span>
                  <span className="font-medium">{success}</span>
                </div>
              )}

              {formData.latitude !== 0 && formData.longitude !== 0 && (
                <Card className="border-2 border-green-200 shadow-md bg-gradient-to-br from-green-50/50 to-emerald-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-gray-900">Selected Coordinates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <Label className="text-xs text-gray-600 font-medium">Latitude</Label>
                        <p className="text-lg font-bold text-gray-900 mt-1">{formData.latitude.toFixed(6)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <Label className="text-xs text-gray-600 font-medium">Longitude</Label>
                        <p className="text-lg font-bold text-gray-900 mt-1">{formData.longitude.toFixed(6)}</p>
                      </div>
                    </div>
                    {formData.addressLine1 && (
                      <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                        <Label className="text-xs text-gray-600 font-medium">Address</Label>
                        <p className="text-sm text-gray-900 mt-1">{formData.addressLine1}</p>
                        {formData.city && formData.stateProvince && (
                          <p className="text-sm text-gray-600 mt-1">{formData.city}, {formData.stateProvince}</p>
                        )}
                        {formData.googlePlaceId && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <Label className="text-xs text-gray-600 font-medium">Google Place ID</Label>
                            <p className="text-xs text-gray-500 mt-1 font-mono bg-gray-50 px-2 py-1 rounded">
                              {formData.googlePlaceId}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <Button 
                variant="outline" 
                onClick={() => setIsMapModalOpen(false)}
                className="transition-all duration-200 hover:scale-105 text-gray-700 hover:text-gray-100"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Location Confirmation Modal */}
      {isConfirmModalOpen && selectedLocationData && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-300" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 999999 }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Confirm Location</h2>
                  <p className="text-sm text-gray-600 mt-0.5">Is this the correct location?</p>
                </div>
              </div>
              <button 
                onClick={handleCancelLocation} 
                className="text-gray-400 hover:text-gray-600 transition-all duration-200 hover:bg-white rounded-full p-2 hover:scale-110"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">Selected Location</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Coordinates:</span>
                        <span className="text-gray-600 font-mono">
                          {selectedLocationData.lat.toFixed(6)}, {selectedLocationData.lng.toFixed(6)}
                        </span>
                      </div>
                      {selectedLocationData.address && (
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-gray-700">Address:</span>
                          <span className="text-gray-600">{selectedLocationData.address}</span>
                        </div>
                      )}
                      {(selectedLocationData.city || selectedLocationData.state) && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">City/State:</span>
                          <span className="text-gray-600">
                            {selectedLocationData.city && selectedLocationData.state 
                              ? `${selectedLocationData.city}, ${selectedLocationData.state}`
                              : selectedLocationData.city || selectedLocationData.state
                            }
                          </span>
                        </div>
                      )}
                      {selectedLocationData.googlePlaceId && (
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-gray-700">Google Place ID:</span>
                          <span className="text-gray-500 text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                            {selectedLocationData.googlePlaceId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This location will be used for your place. You can edit the address details in the form if needed.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <Button 
                variant="outline" 
                onClick={handleCancelLocation}
                className="transition-all duration-200 hover:scale-105 text-gray-700 hover:text-gray-100"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmLocation}
                className="transition-all duration-200 hover:scale-105 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Confirm Location
              </Button>
            </div>
          </div>
        </div>
      , document.body)}

      <AlertDialog
        open={isConfirmCreateOpen}
        onOpenChange={(open) => {
          if (!open) setIsConfirmCreateOpen(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create this place?</AlertDialogTitle>
            <AlertDialogDescription>
              Please confirm you want to create this place with the details provided.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isLoading}
              onClick={() => setIsConfirmCreateOpen(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-600"
              onClick={() => {
                setIsConfirmCreateOpen(false)
                void performCreatePlace()
              }}
            >
              {isLoading ? 'Creating...' : 'Create place'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </PageTransition>
  )
}
