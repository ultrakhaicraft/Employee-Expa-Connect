import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { ViewCategory, ViewDetailPlace, UpdatePlace, UploadFilesToCloudinary, GetAllTags, GetTagsOfPlace } from '@/services/userService'
import { convertLocalTimeToUtc, convertUtcToLocalTime, getTimezoneFromStorage } from '@/utils/timezone'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { TrackMap } from '@/pages/User/Place/TrackMap'
import { buttonStyles } from '@/lib/colors'
import {
  Image as ImageIcon,
  Upload,
  Plus,
  X,
  Edit3,
  Building,
  MapPin,
  Clock,
  Phone,
  Globe,
  Mail,
  Calendar,
  Users,
  Camera,
  Save,
  XCircle,
  AlertCircle,
  Search,
  ChevronDown
} from 'lucide-react'

interface Category {
  categoryId: number
  name: string
}

interface PlaceImageData {
  imageId: string
  imageUrl: string
  altText: string
}

interface EditableImage {
  imageId?: string
  imageUrl?: string
  preview: string
  altText: string
  file?: File
}

export interface EditablePlaceDetail {
  placeId: string
  name: string
  description: string
  categoryId?: number
  categoryName?: string
  tags?: number[]
  addressLine1: string
  openTime: string
  closeTime: string
  city: string
  stateProvince: string
  phoneNumber: string
  websiteUrl: string
  email: string
  bestTimeToVisit?: string
  busyTime?: string
  suitableFor?: string
  latitude?: number
  longitude?: number
  googlePlaceId?: string
  imageUrls?: PlaceImageData[]
}

interface EditPlaceModalProps {
  placeId: string | null
  open: boolean
  onClose: () => void
  initialData?: EditablePlaceDetail
  onUpdated?: (updated: EditablePlaceDetail) => void
}

interface EditFormState {
  name: string
  description: string
  categoryId: number
  tags: number[]
  addressLine1: string
  city: string
  stateProvince: string
  openTime: string
  closeTime: string
  phoneNumber: string
  websiteUrl: string
  email: string
  bestTimeToVisit: string
  busyTime: string
  suitableFor: string
  latitude: number
  longitude: number
  googlePlaceId: string
}

const defaultFormState: EditFormState = {
  name: '',
  description: '',
  categoryId: 0,
  tags: [],
  addressLine1: '',
  city: '',
  stateProvince: '',
  openTime: '',
  closeTime: '',
  phoneNumber: '',
  websiteUrl: '',
  email: '',
  bestTimeToVisit: '',
  busyTime: '',
  suitableFor: '',
  latitude: 0,
  longitude: 0,
  googlePlaceId: ''
}

const buildFormState = (detail?: EditablePlaceDetail | null, timezone?: string | null): EditFormState => {
  // Convert UTC times to local time when loading
  const openTimeUtc = detail?.openTime || ''
  const closeTimeUtc = detail?.closeTime || ''
  
  let openTimeLocal = ''
  let closeTimeLocal = ''
  
  if (timezone && openTimeUtc) {
    const convertedOpenTime = convertUtcToLocalTime(openTimeUtc, timezone)
    // convertUtcToLocalTime returns "HH:mm" format or "N/A"
    if (convertedOpenTime && convertedOpenTime !== 'N/A' && convertedOpenTime.includes(':')) {
      openTimeLocal = convertedOpenTime.slice(0, 5)
    } else if (openTimeUtc) {
      // Fallback to UTC time if conversion fails
      openTimeLocal = openTimeUtc.slice(0, 5)
    }
  } else if (openTimeUtc) {
    openTimeLocal = openTimeUtc.slice(0, 5)
  }
  
  if (timezone && closeTimeUtc) {
    const convertedCloseTime = convertUtcToLocalTime(closeTimeUtc, timezone)
    // convertUtcToLocalTime returns "HH:mm" format or "N/A"
    if (convertedCloseTime && convertedCloseTime !== 'N/A' && convertedCloseTime.includes(':')) {
      closeTimeLocal = convertedCloseTime.slice(0, 5)
    } else if (closeTimeUtc) {
      // Fallback to UTC time if conversion fails
      closeTimeLocal = closeTimeUtc.slice(0, 5)
    }
  } else if (closeTimeUtc) {
    closeTimeLocal = closeTimeUtc.slice(0, 5)
  }
  
  return {
    name: detail?.name || '',
    description: detail?.description || '',
    categoryId: detail?.categoryId ?? 0,
    tags: detail?.tags ?? [],
    addressLine1: detail?.addressLine1 || '',
    city: detail?.city || '',
    stateProvince: detail?.stateProvince || '',
    openTime: openTimeLocal,
    closeTime: closeTimeLocal,
    phoneNumber: detail?.phoneNumber || '',
    websiteUrl: detail?.websiteUrl || '',
    email: detail?.email || '',
    bestTimeToVisit: detail?.bestTimeToVisit || '',
    busyTime: detail?.busyTime || '',
    suitableFor: detail?.suitableFor || '',
    latitude: detail?.latitude ?? 0,
    longitude: detail?.longitude ?? 0,
    googlePlaceId: detail?.googlePlaceId || ''
  }
}

export function EditPlaceModal({
  placeId,
  open,
  onClose,
  initialData,
  onUpdated
}: EditPlaceModalProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<EditFormState>(defaultFormState)
  const [categories, setCategories] = useState<Category[]>([])
  const [availableTags, setAvailableTags] = useState<{ tagId: number; name: string; description: string; isActive: boolean }[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [tagSearch, setTagSearch] = useState('')
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false)
  const [isFetchingDetail, setIsFetchingDetail] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [detailSnapshot, setDetailSnapshot] = useState<EditablePlaceDetail | null>(initialData || null)
  const [editImages, setEditImages] = useState<EditableImage[]>([])
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ type: 'save' | 'cancel' | 'delete'; payload?: any } | null>(null)
  const [isProcessingConfirm, setIsProcessingConfirm] = useState(false)
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [selectedLocationData, setSelectedLocationData] = useState<{
    lat: number
    lng: number
    address?: string
    city?: string
    state?: string
    googlePlaceId?: string
  } | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

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
    return `${hour24.toString().padStart(2, '0')}:${minuteValue}`
  }

  // Specific handlers for openTime to avoid closure issues
  const handleOpenTimeHourChange = (hour: string) => {
    setFormData(prev => {
      const time12h = convert24hTo12h(prev.openTime)
      const time24h = convert12hTo24h(hour, time12h.minute, time12h.period)
      return { ...prev, openTime: time24h }
    })
  }

  const handleOpenTimeMinuteChange = (minute: string) => {
    setFormData(prev => {
      const time12h = convert24hTo12h(prev.openTime)
      const time24h = convert12hTo24h(time12h.hour, minute, time12h.period)
      return { ...prev, openTime: time24h }
    })
  }

  const handleOpenTimePeriodChange = (period: string) => {
    setFormData(prev => {
      const time12h = convert24hTo12h(prev.openTime)
      const time24h = convert12hTo24h(time12h.hour, time12h.minute, period)
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

  useEffect(() => {
    setFormData(prev => ({ ...prev, tags: selectedTagIds }))
  }, [selectedTagIds])

  const imagesChanged = useMemo(() => {
    const original = detailSnapshot?.imageUrls || []
    if (original.length !== editImages.length) return true
    return editImages.some((img, index) => {
      const originalImg = original[index]
      if (!originalImg) return true
      const finalUrl = img.imageUrl || img.preview
      if (img.file) return true
      return (
        originalImg.imageUrl !== finalUrl ||
        (img.altText || '') !== (originalImg.altText || '')
      )
    })
  }, [editImages, detailSnapshot])

  const hasUnsavedChanges = useMemo(() => {
    if (!detailSnapshot) return true
    const originalTags = detailSnapshot.tags || []
    const currentTags = formData.tags || selectedTagIds
    const tagsChanged =
      originalTags.length !== currentTags.length ||
      originalTags.some(id => !currentTags.includes(id))
    return (
      formData.name !== detailSnapshot.name ||
      formData.description !== detailSnapshot.description ||
      formData.categoryId !== (detailSnapshot.categoryId ?? 0) ||
      tagsChanged ||
      formData.addressLine1 !== detailSnapshot.addressLine1 ||
      formData.city !== detailSnapshot.city ||
      formData.stateProvince !== detailSnapshot.stateProvince ||
      formData.openTime !== (detailSnapshot.openTime || '').slice(0, 5) ||
      formData.closeTime !== (detailSnapshot.closeTime || '').slice(0, 5) ||
      formData.phoneNumber !== (detailSnapshot.phoneNumber || '') ||
      formData.websiteUrl !== (detailSnapshot.websiteUrl || '') ||
      formData.email !== (detailSnapshot.email || '') ||
      formData.bestTimeToVisit !== (detailSnapshot.bestTimeToVisit || '') ||
      formData.busyTime !== (detailSnapshot.busyTime || '') ||
      formData.suitableFor !== (detailSnapshot.suitableFor || '') ||
      imagesChanged
    )
  }, [formData, detailSnapshot, imagesChanged])

  // Helper function to extract tags from text
  const extractTagsFromText = (text: string, options: { label: string; value: string }[]): string[] => {
    const matchingTags: string[] = []
    options.forEach(option => {
      if (text.toLowerCase().includes(option.label.toLowerCase())) {
        matchingTags.push(option.value)
      }
    })
    return matchingTags
  }

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

  useEffect(() => {
    if (open && !isSaving) {
      setFetchError('')
      setValidationErrors({})
      const timezone = getTimezoneFromStorage()
      const formState = buildFormState(initialData, timezone)
      setFormData(formState)
      setSelectedTagIds(initialData?.tags || [])
      setDetailSnapshot(initialData ? { ...initialData, tags: initialData.tags || [] } : null)
      setEditImages(
        initialData?.imageUrls?.map((img: PlaceImageData) => ({
          imageId: img.imageId,
          imageUrl: img.imageUrl,
          preview: img.imageUrl,
          altText: img.altText || initialData.name || 'Place image'
        })) || []
      )
      setImageUrlInput('')
      
      // Initialize tags from existing data
      if (initialData) {
        setSelectedTags(extractTagsFromText(initialData.suitableFor || '', suitableForOptions))
        setSelectedBestTimeTags(extractTagsFromText(initialData.bestTimeToVisit || '', bestTimeOptions))
        setSelectedBusyTimeTags(extractTagsFromText(initialData.busyTime || '', busyTimeOptions))
      } else {
        setSelectedTags([])
        setSelectedBestTimeTags([])
        setSelectedBusyTimeTags([])
        setSelectedTagIds([])
      }
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const loadCategories = async () => {
      try {
        const response = await ViewCategory()
        if (Array.isArray(response)) {
          setCategories(response as Category[])
        } else if (response?.data && Array.isArray(response.data)) {
          setCategories(response.data)
        }
      } catch (error) {
        console.warn('Failed to load categories for edit modal:', error)
      }
    }

    loadCategories()
  }, [open])

  useEffect(() => {
    if (!open) return
    const loadTags = async () => {
      try {
        const response = await GetAllTags()
        if (Array.isArray(response)) {
          const activeTags = response.filter((tag: any) => tag.isActive)
          setAvailableTags(activeTags)
        }
      } catch (error) {
        console.warn('Failed to load tags for edit modal:', error)
      }
    }
    loadTags()
  }, [open])

  useEffect(() => {
    const fetchDetail = async () => {
      if (!placeId || !open) return
      setIsFetchingDetail(true)
      setFetchError('')
      try {
        const detail = await ViewDetailPlace({ placeId })
        setDetailSnapshot(detail)
        const timezone = getTimezoneFromStorage()
        const formState = buildFormState(detail, timezone)
        setFormData(formState)
        setEditImages(
          detail?.imageUrls?.map((img: PlaceImageData) => ({
            imageId: img.imageId,
            imageUrl: img.imageUrl,
            preview: img.imageUrl,
            altText: img.altText || detail.name || 'Place image'
          })) || []
        )
        
        // Initialize tags from fetched data
        setSelectedTags(extractTagsFromText(detail?.suitableFor || '', suitableForOptions))
        setSelectedBestTimeTags(extractTagsFromText(detail?.bestTimeToVisit || '', bestTimeOptions))
        setSelectedBusyTimeTags(extractTagsFromText(detail?.busyTime || '', busyTimeOptions))

        // Load assigned tags for this place
        try {
          const placeTags = await GetTagsOfPlace(placeId)
          if (Array.isArray(placeTags)) {
            const tagIds = placeTags
              .filter((t: any) => typeof t.tagId === 'number')
              .map((t: any) => t.tagId)
            setSelectedTagIds(tagIds)
            setFormData(prev => ({ ...prev, tags: tagIds }))
            setDetailSnapshot(prev => (prev ? { ...prev, tags: tagIds } : prev))
          }
        } catch (tagError) {
          console.warn('Failed to load place tags:', tagError)
        }
      } catch (error: any) {
        console.error('Failed to fetch place detail for editing:', error)
        setFetchError(error.response?.data?.message || error.message || 'Failed to load place detail')
      } finally {
        setIsFetchingDetail(false)
      }
    }

    fetchDetail()
  }, [placeId, open])

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
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
    
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
      const matchingTags = extractTagsFromText(value, suitableForOptions)
      setSelectedTags(matchingTags)
    } else if (name === 'bestTimeToVisit') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
      
      // Update selectedBestTimeTags based on the text input
      const matchingTags = extractTagsFromText(value, bestTimeOptions)
      setSelectedBestTimeTags(matchingTags)
    } else if (name === 'busyTime') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
      
      // Update selectedBusyTimeTags based on the text input
      const matchingTags = extractTagsFromText(value, busyTimeOptions)
      setSelectedBusyTimeTags(matchingTags)
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'categoryId' ? Number(value) : value
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
        (tag.description || '').toLowerCase().includes(keyword)
      )
    })

  const handleAddTag = (tagId: number) => {
    setSelectedTagIds(prev => (prev.includes(tagId) ? prev : [...prev, tagId]))
    setIsTagDropdownOpen(false)
    setTagSearch('')
  }

  const handleRemoveTag = (tagId: number) => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId))
  }

  const resetState = () => {
    setFormData(defaultFormState)
    setDetailSnapshot(null)
    setFetchError('')
    editImages.forEach(img => {
      if (img.file && img.preview.startsWith('blob:')) {
        URL.revokeObjectURL(img.preview)
      }
    })
    setEditImages([])
    setImageUrlInput('')
  }

  const performCancel = () => {
    resetState()
    onClose()
  }

  const handleClose = () => {
    if (isSaving) return
    // Don't close if map modal or confirm modal is open
    if (isMapModalOpen || isConfirmModalOpen) return
    if (hasUnsavedChanges) {
      setConfirmAction({ type: 'cancel' })
    } else {
      performCancel()
    }
  }

  const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Please enter a place name before saving.'
    }
    if (!formData.description.trim()) {
      errors.description = 'Please add a short description.'
    }
    if (!formData.categoryId) {
      errors.categoryId = 'Please select a category.'
    }
    if (!formData.addressLine1.trim()) {
      errors.addressLine1 = 'Street address is required.'
    }
    if (!formData.city.trim()) {
      errors.city = 'City is required.'
    }
    if (!formData.stateProvince.trim()) {
      errors.stateProvince = 'State/Province is required.'
    }
    if (!formData.latitude || !formData.longitude) {
      errors.location = 'Latitude and longitude are missing. Please update the location before saving.'
    }
    // Validate phone number format
    if (formData.phoneNumber.trim()) {
      const phoneValidation = validatePhoneNumber(formData.phoneNumber.trim())
      if (!phoneValidation.isValid) {
        errors.phoneNumber = phoneValidation.error || 'Invalid phone number format.'
      }
    }
    // Validate email: if filled, must be valid email format
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.'
    }
    // Validate website: if filled, must be valid URL format
    if (formData.websiteUrl.trim()) {
      try {
        new URL(formData.websiteUrl.trim())
      } catch {
        errors.websiteUrl = 'Please enter a valid website URL (e.g., https://example.com).'
      }
    }
    
    setValidationErrors(errors)
    return { isValid: Object.keys(errors).length === 0, errors }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const newImages: EditableImage[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      altText: file.name.split('.')[0] || 'New image'
    }))

    setEditImages(prev => [...prev, ...newImages])
  }

  const performRemoveImage = (index: number) => {
    setEditImages(prev => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (removed?.file && removed.preview.startsWith('blob:')) {
        URL.revokeObjectURL(removed.preview)
      }
      return next
    })
  }

  const handleRemoveImage = (index: number) => {
    setConfirmAction({ type: 'delete', payload: index })
  }

  const handleAltChange = (index: number, value: string) => {
    setEditImages(prev => {
      const next = [...prev]
      next[index] = { ...next[index], altText: value }
      return next
    })
  }

  const handleAddUrlImage = () => {
    if (!imageUrlInput.trim()) return
    try {
      new URL(imageUrlInput.trim())
      setEditImages(prev => [
        ...prev,
        {
          preview: imageUrlInput.trim(),
          imageUrl: imageUrlInput.trim(),
          altText: `Image ${prev.length + 1}`
        }
      ])
      setImageUrlInput('')
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid image URL before adding.',
        variant: 'destructive'
      })
    }
  }

  useEffect(() => {
    return () => {
      editImages.forEach(img => {
        if (img.file && img.preview.startsWith('blob:')) {
          URL.revokeObjectURL(img.preview)
        }
      })
    }
  }, [editImages])

  // Disable body scroll when map modal is open
  useEffect(() => {
    if (isMapModalOpen) {
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
  }, [isMapModalOpen])

  // Disable body scroll when confirm modal is open
  useEffect(() => {
    if (isConfirmModalOpen) {
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
  }, [isConfirmModalOpen])

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
      toast({
        title: 'Location updated',
        description: `Location confirmed: ${selectedLocationData.lat.toFixed(6)}, ${selectedLocationData.lng.toFixed(6)}${selectedLocationData.address ? ` — ${selectedLocationData.address}` : ''}`
      })
    }
    setIsConfirmModalOpen(false)
    setSelectedLocationData(null)
  }

  // Cancel location selection
  const handleCancelLocation = () => {
    setIsConfirmModalOpen(false)
    setSelectedLocationData(null)
  }

  const performSave = async () => {
    if (!placeId) return
    
    setIsSaving(true)
    setFetchError('')
    setValidationErrors({})

    try {
      const filesToUpload = editImages.filter(img => img.file && img.file instanceof File)
      const uploadFiles = filesToUpload.map(img => img.file!) as File[]
      const altTexts = filesToUpload.map(img => img.altText || formData.name || 'Place image')

      let uploadedImageList: { imageUrl: string; altText: string }[] = []
      if (uploadFiles.length > 0) {
        uploadedImageList = await UploadFilesToCloudinary(uploadFiles, altTexts)
      }
      let uploadCursor = 0

      const finalImages = editImages.map(img => {
        if (img.file) {
          const uploaded = uploadedImageList[uploadCursor++]
          return {
            imageUrl: uploaded?.imageUrl || '',
            altText: img.altText || uploaded?.altText || formData.name || 'Place image'
          }
        }
        return {
          imageUrl: img.imageUrl || img.preview,
          altText: img.altText || formData.name || 'Place image'
        }
      }).filter(img => img.imageUrl)

      // Get timezone from localStorage
      const timezone = getTimezoneFromStorage()
      
      if (!timezone) {
        toast({
          title: 'Timezone not found',
          description: 'Please login again to set your timezone.',
          variant: 'destructive'
        })
        setIsSaving(false)
        return
      }
      
      console.log('[EditPlace] Original times:', {
        openTime: formData.openTime,
        closeTime: formData.closeTime,
        timezone: timezone
      })
      
      // Convert local times to UTC before sending to backend
      const openTimeUtc = formData.openTime 
        ? convertLocalTimeToUtc(`${formData.openTime}:00`, timezone)
        : ''
      const closeTimeUtc = formData.closeTime
        ? convertLocalTimeToUtc(`${formData.closeTime}:00`, timezone)
        : ''
      
      console.log('[EditPlace] Converted to UTC:', {
        openTimeUtc,
        closeTimeUtc,
        originalOpenTime: formData.openTime,
        originalCloseTime: formData.closeTime
      })

      // Normalize optional fields to empty strings if empty
      const normalizedPhone = formData.phoneNumber.trim() || ''
      const normalizedEmail = formData.email.trim() || ''
      const normalizedWebsite = formData.websiteUrl.trim() || ''
      const normalizedSuitableFor = formData.suitableFor.trim() || ''

      await UpdatePlace({
        placeId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId,
        googlePlaceId: formData.googlePlaceId || '',
        latitude: formData.latitude,
        longitude: formData.longitude,
        addressLine1: formData.addressLine1.trim(),
        openTime: openTimeUtc,
        closeTime: closeTimeUtc,
        city: formData.city.trim(),
        stateProvince: formData.stateProvince.trim(),
        phoneNumber: normalizedPhone,
        websiteUrl: normalizedWebsite,
        email: normalizedEmail,
        bestTimeToVisit: formData.bestTimeToVisit.trim(),
        busyTime: formData.busyTime.trim(),
        suitableFor: normalizedSuitableFor,
        imageUrlsList: finalImages,
        tags: selectedTagIds
      })

      const updatedDetail: EditablePlaceDetail = {
        ...(detailSnapshot || { placeId }),
        ...formData,
        openTime: openTimeUtc,
        closeTime: closeTimeUtc,
        categoryName: categories.find(cat => cat.categoryId === formData.categoryId)?.name || detailSnapshot?.categoryName,
        tags: selectedTagIds,
        imageUrls: finalImages.map((img, index) => ({
          imageId: editImages[index]?.imageId || '',
          imageUrl: img.imageUrl,
          altText: img.altText
        })),
        placeId
      }

      toast({
        title: 'Place updated',
        description: 'Your place information has been saved successfully.'
      })

      setEditImages(finalImages.map((img, index) => ({
        imageId: editImages[index]?.imageId,
        preview: img.imageUrl,
        imageUrl: img.imageUrl,
        altText: img.altText
      })))

      onUpdated?.(updatedDetail)
      setConfirmAction(null)
      performCancel()
    } catch (error: any) {
      console.error('Failed to update place:', error)
      toast({
        title: 'Update failed',
        description: error.response?.data?.message || error.message || 'Unable to update this place right now.',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = () => {
    if (!placeId) return
    // Clear previous validation errors
    setValidationErrors({})
    setConfirmAction({ type: 'save' })
  }

  const confirmCopy = {
    save: {
      title: 'Confirm Update',
      description: 'Save the latest changes to this place?'
    },
    cancel: {
      title: 'Discard Changes?',
      description: 'All unsaved edits will be lost. Do you still want to cancel editing?'
    },
    delete: {
      title: 'Delete Image?',
      description: 'This image will be removed from the place and cannot be undone.'
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmAction) return
    
    if (confirmAction.type === 'save') {
      // Validate before showing confirm dialog
      const validation = validateForm()
      if (!validation.isValid) {
        // Scroll to first error field
        const firstErrorField = Object.keys(validation.errors)[0]
        const element = document.querySelector(`[name="${firstErrorField}"]`) || document.querySelector(`#edit-${firstErrorField}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          ;(element as HTMLElement).focus()
        }
        // Don't proceed with save, but keep dialog open
        return
      }
      
      // If validation passes, proceed with save
      setIsProcessingConfirm(true)
      try {
        await performSave()
        // performSave will handle closing the dialog on success
      } finally {
        setIsProcessingConfirm(false)
      }
    } else if (confirmAction.type === 'cancel') {
      performCancel()
      setConfirmAction(null)
    } else if (confirmAction.type === 'delete') {
      performRemoveImage(confirmAction.payload)
      setConfirmAction(null)
    }
  }

  return (
    <>
    <Dialog 
      open={open} 
      modal={!(isMapModalOpen || isConfirmModalOpen)}
      onOpenChange={(val) => {
        // Don't close if map modal or confirm modal is open
        if (!val && !isMapModalOpen && !isConfirmModalOpen) {
          handleClose()
        }
      }}
    >
      <DialogContent 
        className="max-w-7xl max-h-[95vh] p-0 rounded-2xl overflow-hidden"
        style={{ 
          pointerEvents: isMapModalOpen || isConfirmModalOpen ? 'none' : 'auto',
          zIndex: isMapModalOpen || isConfirmModalOpen ? 1 : undefined
        }}
      >
        <div className="flex flex-col max-h-[95vh]">
          {/* Header */}
          <DialogHeader className="p-6 border-b bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl shadow-sm">
                  <Edit3 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-gray-900">
                    Edit Place
                  </DialogTitle>
                  <p className="text-gray-600 text-sm mt-1">
                    Update place information and manage your media gallery
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(95vh - 140px)' }}>
            {fetchError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 mb-6 flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {fetchError}
              </div>
            )}

            {isFetchingDetail ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3 text-sm text-gray-500">
                  <div className="h-12 w-12 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
                  <p className="font-medium">Loading place details...</p>
                </div>
              </div>
            ) : (
              <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Basic Information Card */}
                <Card className="border-2 border-blue-200 shadow-lg bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                        <Building className="h-5 w-5 text-blue-600" />
                      </div>
                      Basic Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <Label htmlFor="edit-name" className="text-sm font-semibold flex items-center gap-2 mb-2">
                          <Building className="h-4 w-4 text-blue-600" />
                          Place Name *
                        </Label>
                        <Input
                          id="edit-name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Enter place name"
                          className={`border-2 transition-all ${validationErrors.name ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'}`}
                        />
                        {validationErrors.name && (
                          <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="edit-category" className="text-sm font-semibold flex items-center gap-2 mb-2">
                          <Building className="h-4 w-4 text-blue-600" />
                          Category *
                        </Label>
                        <select
                          id="edit-category"
                          name="categoryId"
                          value={formData.categoryId || ''}
                          onChange={handleInputChange}
                          className={`w-full rounded-md border-2 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all ${validationErrors.categoryId ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                        >
                          <option value="">Select category</option>
                          {categories.map(category => (
                            <option key={category.categoryId} value={category.categoryId}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        {validationErrors.categoryId && (
                          <p className="text-sm text-red-600 mt-1">{validationErrors.categoryId}</p>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          Tags
                        </Label>
                        <div className="relative">
                          <div
                            className="w-full min-h-[46px] border-2 border-gray-300 rounded-md px-3 py-2 flex items-center gap-2 flex-wrap cursor-text bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all duration-200 hover:border-blue-300"
                            onClick={() => setIsTagDropdownOpen(true)}
                          >
                            {availableTags.filter(tag => selectedTagIds.includes(tag.tagId)).map(tag => (
                              <span
                                key={tag.tagId}
                                className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1 text-xs font-medium"
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
                              onBlur={() => setTimeout(() => setIsTagDropdownOpen(false), 120)}
                              placeholder={selectedTagIds.length ? 'Search more tags...' : 'Search and select tags'}
                              className="flex-1 min-w-[140px] border-none focus:outline-none focus:ring-0 text-sm placeholder:text-gray-400"
                            />
                          </div>

                          {isTagDropdownOpen && (
                            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
                              {filteredTagOptions.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-gray-500">No tags found</div>
                              ) : (
                                filteredTagOptions.map(tag => (
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
                        <p className="text-xs text-gray-500 mt-1">Select multiple tags. Chosen tags appear above and can be removed.</p>
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="edit-description" className="text-sm font-semibold mb-2 block">
                          Description *
                        </Label>
                        <Textarea
                          id="edit-description"
                          name="description"
                          rows={4}
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="Describe this place..."
                          className={`border-2 transition-all resize-none ${validationErrors.description ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'}`}
                        />
                        {validationErrors.description && (
                          <p className="text-sm text-red-600 mt-1">{validationErrors.description}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          Location Selection
                        </Label>
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
                            <div>
                              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
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
                            <div>
                              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
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
                        {validationErrors.location && (
                          <p className="text-sm text-red-600 mt-2">{validationErrors.location}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="edit-addressLine1" className="text-sm font-semibold flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          Street Address *
                        </Label>
                        <Input
                          id="edit-addressLine1"
                          name="addressLine1"
                          value={formData.addressLine1}
                          onChange={handleInputChange}
                          placeholder="Auto-filled after picking location (editable)"
                          className={`border-2 transition-all ${validationErrors.addressLine1 ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'}`}
                        />
                        {validationErrors.addressLine1 && (
                          <p className="text-sm text-red-600 mt-1">{validationErrors.addressLine1}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="edit-city" className="text-sm font-semibold mb-2 block">
                          City *
                        </Label>
                        <Input
                          id="edit-city"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="Enter city"
                          className={`border-2 transition-all ${validationErrors.city ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'}`}
                        />
                        {validationErrors.city && (
                          <p className="text-sm text-red-600 mt-1">{validationErrors.city}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="edit-stateProvince" className="text-sm font-semibold mb-2 block">
                          State / Province *
                        </Label>
                        <Input
                          id="edit-stateProvince"
                          name="stateProvince"
                          value={formData.stateProvince}
                          onChange={handleInputChange}
                          placeholder="Enter state/province"
                          className={`border-2 transition-all ${validationErrors.stateProvince ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'}`}
                        />
                        {validationErrors.stateProvince && (
                          <p className="text-sm text-red-600 mt-1">{validationErrors.stateProvince}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="edit-openTime" className="text-sm font-semibold flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          Opening Time
                        </Label>
                        <div className="inline-flex items-center gap-1 px-2 py-1 border-2 border-gray-300 rounded-md hover:border-orange-300 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500 transition-all duration-200 bg-white">
                          {(() => {
                            const time12h = convert24hTo12h(formData.openTime)
                            return (
                              <>
                                <div className="relative">
                                  <select
                                    value={time12h.hour}
                                    onChange={(e) => handleOpenTimeHourChange(e.target.value)}
                                    className="w-12 px-1 py-0.5 border-0 bg-transparent text-center font-medium text-gray-900 text-sm focus:outline-none cursor-pointer appearance-none"
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
                                    className="w-12 px-1 py-0.5 border-0 bg-transparent text-center font-medium text-gray-900 text-sm focus:outline-none cursor-pointer appearance-none"
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
                                    className="w-12 px-1 py-0.5 border-0 bg-transparent text-center font-medium text-gray-900 text-sm focus:outline-none cursor-pointer appearance-none"
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

                      <div>
                        <Label htmlFor="edit-closeTime" className="text-sm font-semibold flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          Closing Time
                        </Label>
                        <div className="inline-flex items-center gap-1 px-2 py-1 border-2 border-gray-300 rounded-md hover:border-orange-300 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500 transition-all duration-200 bg-white">
                          {(() => {
                            const time12h = convert24hTo12h(formData.closeTime)
                            return (
                              <>
                                <div className="relative">
                                  <select
                                    value={time12h.hour}
                                    onChange={(e) => handleCloseTimeHourChange(e.target.value)}
                                    className="w-12 px-1 py-0.5 border-0 bg-transparent text-center font-medium text-gray-900 text-sm focus:outline-none cursor-pointer appearance-none"
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
                                    className="w-12 px-1 py-0.5 border-0 bg-transparent text-center font-medium text-gray-900 text-sm focus:outline-none cursor-pointer appearance-none"
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
                                    className="w-12 px-1 py-0.5 border-0 bg-transparent text-center font-medium text-gray-900 text-sm focus:outline-none cursor-pointer appearance-none"
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
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information Card */}
                <Card className="border-2 border-green-200 shadow-lg bg-gradient-to-br from-green-50/50 to-emerald-50/50">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                        <Phone className="h-5 w-5 text-green-600" />
                      </div>
                      Contact Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="edit-phoneNumber" className="text-sm font-semibold flex items-center gap-2 mb-2">
                          <Phone className="h-4 w-4 text-green-600" />
                          Phone Number
                        </Label>
                        <Input
                          id="edit-phoneNumber"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                          placeholder="Enter phone number"
                          className={`border-2 transition-all ${validationErrors.phoneNumber ? 'border-red-500 focus:border-red-500' : 'focus:border-green-500'}`}
                        />
                        {validationErrors.phoneNumber && (
                          <p className="text-sm text-red-600 mt-1">{validationErrors.phoneNumber}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="edit-email" className="text-sm font-semibold flex items-center gap-2 mb-2">
                          <Mail className="h-4 w-4 text-green-600" />
                          Email
                        </Label>
                        <Input
                          id="edit-email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Enter email address"
                          className={`border-2 transition-all ${validationErrors.email ? 'border-red-500 focus:border-red-500' : 'focus:border-green-500'}`}
                        />
                        {validationErrors.email && (
                          <p className="text-sm text-red-600 mt-1">{validationErrors.email}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="edit-websiteUrl" className="text-sm font-semibold flex items-center gap-2 mb-2">
                          <Globe className="h-4 w-4 text-green-600" />
                          Website
                        </Label>
                        <Input
                          id="edit-websiteUrl"
                          name="websiteUrl"
                          type="url"
                          value={formData.websiteUrl}
                          onChange={handleInputChange}
                          placeholder="https://example.com"
                          className={`border-2 transition-all ${validationErrors.websiteUrl ? 'border-red-500 focus:border-red-500' : 'focus:border-green-500'}`}
                        />
                        {validationErrors.websiteUrl && (
                          <p className="text-sm text-red-600 mt-1">{validationErrors.websiteUrl}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Additional Information Card */}
                  <Card className="border-2 border-purple-200 shadow-lg bg-gradient-to-br from-purple-50/50 to-pink-50/50">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-purple-600" />
                        </div>
                        Additional Information
                      </h3>

                      <div className="space-y-4">
                        {/* Best Time and Busy Time Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Best Time to Visit Section */}
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-purple-600" />
                              Best Time to Visit
                            </Label>
                            <p className="text-xs text-gray-600">Select predefined options or enter custom text</p>
                            
                            <div className="space-y-2">
                              <Textarea
                                id="edit-bestTimeToVisit"
                                name="bestTimeToVisit"
                                value={formData.bestTimeToVisit}
                                onChange={handleInputChange}
                                rows={2}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none transition-all duration-200 hover:border-purple-300 focus:scale-[1.01]"
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
                                    className={`transition-all duration-200 hover:scale-105 focus:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-full px-3 py-1.5 text-xs font-medium border-2 ${
                                      selectedBestTimeTags.includes(option.value)
                                        ? `${buttonStyles.primary} border-0 shadow-lg font-bold`
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:bg-purple-50'
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
                            <Label className="text-sm font-semibold flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-purple-600" />
                              Busy Time
                            </Label>
                            <p className="text-xs text-gray-600">Select predefined options or enter custom text</p>
                            
                            <div className="space-y-2">
                              <Textarea
                                id="edit-busyTime"
                                name="busyTime"
                                value={formData.busyTime}
                                onChange={handleInputChange}
                                rows={2}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none transition-all duration-200 hover:border-purple-300 focus:scale-[1.01]"
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
                                    className={`transition-all duration-200 hover:scale-105 focus:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-full px-3 py-1.5 text-xs font-medium border-2 ${
                                      selectedBusyTimeTags.includes(option.value)
                                        ? `${buttonStyles.primary} border-0 shadow-lg font-bold`
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:bg-purple-50'
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

                        {/* Suitable For Tags Section */}
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-600" />
                            Suitable For
                          </Label>
                          <p className="text-xs text-gray-600">Select predefined options or enter custom text</p>
                          
                          <div className="space-y-2">
                            <Textarea
                              id="edit-suitableFor"
                              name="suitableFor"
                              value={formData.suitableFor}
                              onChange={handleInputChange}
                              rows={3}
                              className="w-full px-4 py-1 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none transition-all duration-200 hover:border-purple-300 focus:scale-[1.01]"
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
                                  className={`transition-all duration-200 hover:scale-105 focus:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-full px-4 py-2 text-sm font-medium border-2 ${
                                    selectedTags.includes(option.value)
                                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-500 shadow-lg font-bold'
                                      : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:bg-purple-50'
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
                    </CardContent>
                  </Card>

                  {/* Images Card */}
                <Card className="border-2 border-purple-200 shadow-lg bg-gradient-to-br from-purple-50/30 to-pink-50/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                          <Camera className="h-5 w-5 text-purple-600" />
                        </div>
                        Place Images
                      </h3>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-purple-300 px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 hover:border-purple-400 cursor-pointer transition-all">
                          <Upload className="w-4 h-4" />
                          Upload Files
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleFileSelect}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          placeholder="https://example.com/photo.jpg"
                          className="flex-1 border-2 border-dashed border-purple-300 focus:border-purple-500"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddUrlImage()}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddUrlImage}
                          disabled={!imageUrlInput.trim()}
                          className="border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add URL
                        </Button>
                      </div>

                      {editImages.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">No images yet</p>
                              <p className="text-xs text-gray-500 mt-1">Upload files or paste image URLs to showcase this place</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          {editImages.map((image, index) => (
                            <div
                              key={`${image.preview}-${index}`}
                              className="group relative rounded-xl border-2 border-gray-200 bg-white overflow-hidden hover:border-purple-400 transition-all shadow-sm hover:shadow-md"
                            >
                              <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                                <img
                                  src={image.preview}
                                  alt={image.altText}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = '/placeholder.svg'
                                  }}
                                />
                                <button
                                  type="button"
                                  className="absolute top-2 right-2 rounded-full bg-red-500 text-white p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                                  onClick={() => handleRemoveImage(index)}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="p-2">
                                <Input
                                  value={image.altText}
                                  onChange={(e) => handleAltChange(index, e.target.value)}
                                  placeholder="Image description"
                                  className="text-xs border-gray-200 focus:border-purple-400 h-8"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </div>
              </div>

              {/* Info Banner and Action Buttons - Full Width */}
              <div className="space-y-4 mt-6">
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3 text-xs text-gray-600 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>
                    Location metadata (latitude, longitude, Google Place ID) stays synced in the background and will be included automatically in the update request.
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-2 border-t">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !hasUnsavedChanges}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  >
                    {isSaving ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Update Place
                      </>
                    )}
                  </Button>
                </div>
              </div>
              </>
            )}
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

    {/* Map Modal */}
    {isMapModalOpen && createPortal(
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          width: '100vw', 
          height: '100vh', 
          zIndex: 9999999,
          pointerEvents: 'auto'
        }}
        onClick={(e) => {
          // Close when clicking backdrop
          if (e.target === e.currentTarget) {
            setIsMapModalOpen(false)
          }
        }}
      >
        <div 
          className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 flex flex-col"
          style={{ pointerEvents: 'auto', zIndex: 10000000 }}
          onClick={(e) => e.stopPropagation()}
        >
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

          <div className="p-6 space-y-5 flex-1 overflow-y-auto" style={{ position: 'relative', pointerEvents: 'auto' }}>
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

            <div 
              className="border-2 border-gray-300 rounded-2xl overflow-hidden shadow-lg" 
              style={{ height: '500px', color:'#0b1f3a', pointerEvents: 'auto', position: 'relative', zIndex: 1 }}
            >
              <TrackMap
                visible={isMapModalOpen}
                onPick={handleLocationPick}
                center={formData.latitude && formData.longitude ? [formData.longitude, formData.latitude] : undefined}
              />
            </div>

            {formData.latitude !== 0 && formData.longitude !== 0 && (
              <Card className="border-2 border-green-200 shadow-md bg-gradient-to-br from-green-50/50 to-emerald-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-gray-900">Current Coordinates</CardTitle>
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
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          width: '100vw', 
          height: '100vh', 
          zIndex: 1000001,
          pointerEvents: 'auto'
        }}
        onClick={(e) => {
          // Don't close when clicking backdrop - user must use buttons
          e.stopPropagation()
        }}
      >
        <div 
          className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-300"
          style={{ zIndex: 1000002, pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
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
    </>
  )
}

export default EditPlaceModal

