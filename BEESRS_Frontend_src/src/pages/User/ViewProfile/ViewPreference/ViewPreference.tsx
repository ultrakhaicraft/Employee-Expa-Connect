import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, PlusCircle, Settings2 } from 'lucide-react'
import {
  CreateUserPreference,
  GetAllTags,
  GetUserPreferences,
  UpdateUserPreference,
  type UserPreference,
  type UserPreferencePayload,
} from '@/services/userService'

const primaryCuisineQuestion = {
  key: 'cuisineTypes',
  question: 'What types of cuisine do you usually enjoy?',
  placeholder: 'Vietnamese, Japanese, Italian',
} as const

type TagOption = {
  tagId: number
  name: string
  description?: string
  isActive: boolean
}

const hydrateFromCuisineString = (cuisinePreferences?: string | null) => {
  if (!cuisinePreferences) {
    return { primaryAnswer: '', tagNames: [] as string[] }
  }
  const tokens = cuisinePreferences
    .split(',')
    .map(token => token.trim())
    .filter(Boolean)

  const [first, ...rest] = tokens
  return { primaryAnswer: first ?? '', tagNames: rest }
}

const buildCuisinePreferenceString = (primaryAnswer: string, tagNames: string[]) =>
  [primaryAnswer, ...tagNames]
    .map(entry => entry.trim())
    .filter(Boolean)
    .join(', ')

const budgetLevels = [
  { value: 1, label: 'Modest' },
  { value: 2, label: 'Saving' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Comfort' },
  { value: 5, label: 'Premium' },
] as const

const getBudgetLabel = (value: number | null | undefined) => {
  if (!value) return 'N/A'
  return budgetLevels.find(level => level.value === value)?.label ?? `Level ${value}`
}

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

export default function ViewPreference() {
  const { toast } = useToast()
  const [preference, setPreference] = useState<UserPreference | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [primaryAnswer, setPrimaryAnswer] = useState('')
  const [budgetPreference, setBudgetPreference] = useState(3)
  const [distanceRadius, setDistanceRadius] = useState(5)
  const [availableTags, setAvailableTags] = useState<TagOption[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([])
  const [tagSearch, setTagSearch] = useState('')
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false)

  const cuisineBadges = useMemo(() => {
    if (!preference?.cuisinePreferences) return []
    return preference.cuisinePreferences
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }, [preference?.cuisinePreferences])

  const actionLabel = preference ? 'Update Preference' : 'Create Preference'

  const loadTags = async () => {
    try {
      const response = await GetAllTags()
      if (Array.isArray(response)) {
        const activeTags = response.filter((tag: TagOption) => tag.isActive)
        setAvailableTags(activeTags)
      }
    } catch (error) {
      console.error('Failed to load tags', error)
    }
  }

  const loadPreferences = async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const preferenceData = await GetUserPreferences()
      setPreference(preferenceData)
      if (preferenceData) {
        const hydrated = hydrateFromCuisineString(preferenceData.cuisinePreferences)
        setPrimaryAnswer(hydrated.primaryAnswer)
        setSelectedTagNames(hydrated.tagNames)
        setBudgetPreference(preferenceData.budgetPreference ?? 3)
        setDistanceRadius(preferenceData.distanceRadius ?? 5)
      } else {
        setPrimaryAnswer('')
        setSelectedTagNames([])
        setBudgetPreference(3)
        setDistanceRadius(5)
      }
    } catch (error: any) {
      setLoadError(error?.message || 'Failed to load preferences')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadTags()
    void loadPreferences()
  }, [])

  useEffect(() => {
    if (availableTags.length === 0 || selectedTagNames.length === 0) return
    const ids = availableTags
      .filter(tag => selectedTagNames.some(name => name.toLowerCase() === tag.name.toLowerCase()))
      .map(tag => tag.tagId)
    setSelectedTagIds(ids)
  }, [availableTags, selectedTagNames])

  const openDialog = () => {
    if (preference) {
      const hydrated = hydrateFromCuisineString(preference.cuisinePreferences)
      setPrimaryAnswer(hydrated.primaryAnswer)
      setSelectedTagNames(hydrated.tagNames)
      setBudgetPreference(preference.budgetPreference ?? 3)
      setDistanceRadius(preference.distanceRadius ?? 5)
    } else {
      setPrimaryAnswer('')
      setSelectedTagNames([])
      setBudgetPreference(3)
      setDistanceRadius(5)
    }
    setSelectedTagIds([])
    setTagSearch('')
    setIsTagDropdownOpen(false)
    setFormError('')
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setFormError('')
  }

  const handleAddTag = (tagId: number) => {
    setSelectedTagIds(prev => {
      if (prev.includes(tagId)) return prev
      return [...prev, tagId]
    })
    setIsTagDropdownOpen(false)
    setTagSearch('')
  }

  const handleRemoveTag = (tagId: number) => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId))
    const tag = availableTags.find(t => t.tagId === tagId)
    if (tag) {
      setSelectedTagNames(prev => prev.filter(name => name.toLowerCase() !== tag.name.toLowerCase()))
    }
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')

    if (budgetPreference < 1 || budgetPreference > 5) {
      setFormError('Budget preference must be between 1 and 5.')
      return
    }

    if (distanceRadius < 0) {
      setFormError('Distance radius must be 0 or greater.')
      return
    }

    if (!primaryAnswer.trim()) {
      setFormError('Please answer the cuisine question.')
      return
    }

    const selectedTagNamesFromIds = availableTags
      .filter(tag => selectedTagIds.includes(tag.tagId))
      .map(tag => tag.name)

    const combinedTags = Array.from(
      new Set([...selectedTagNamesFromIds, ...selectedTagNames].map(name => name.trim()).filter(Boolean))
    )

    const cuisinePreferences = buildCuisinePreferenceString(primaryAnswer, combinedTags)

    const payload: UserPreferencePayload = {
      cuisinePreferences,
      budgetPreference,
      distanceRadius,
    }

    try {
      setIsSubmitting(true)
      if (preference) {
        await UpdateUserPreference(payload)
      } else {
        await CreateUserPreference(payload)
      }
      toast({
        title: 'Preference saved',
        description: 'Your dining preference has been updated successfully.',
      })
      await loadPreferences()
      closeDialog()
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to save preference.'
      setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b flex flex-col gap-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-600 text-white">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-slate-900">User Preferences</CardTitle>
                <p className="text-sm text-slate-500">Help us suggest places that suit your taste.</p>
              </div>
            </div>
            <Button onClick={openDialog} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              {actionLabel}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : loadError ? (
            <div className="text-center py-10">
              <p className="text-sm text-red-600 mb-3">{loadError}</p>
              <Button variant="outline" onClick={loadPreferences}>
                Retry
              </Button>
            </div>
          ) : preference ? (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cuisine Highlights</p>
                {cuisineBadges.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {cuisineBadges.map(item => (
                      <Badge key={item} variant="secondary" className="bg-blue-50 text-blue-700 border border-blue-100">
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No cuisine information saved yet.</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Budget Comfort</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{getBudgetLabel(preference.budgetPreference)}</p>
                  <p className="text-sm text-slate-500 mt-1">Level {preference.budgetPreference} / 5</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Distance Radius</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{preference.distanceRadius}<span className="text-base text-slate-500"> km</span></p>
                  <p className="text-sm text-slate-500 mt-1">Maximum distance you are willing to travel</p>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                <p>Created: {formatDate(preference.createdAt)}</p>
                <p>Last updated: {formatDate(preference.updatedAt)}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 mb-4">
                <Settings2 className="h-7 w-7" />
              </div>
              <p className="text-base font-medium text-slate-900 mb-1">No preferences yet</p>
              <p className="text-sm text-slate-500 mb-4">Share your dining habits so we can personalize your recommendations.</p>
              <Button variant="outline" onClick={openDialog}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Start now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) {
          closeDialog()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
                <DialogTitle>{actionLabel}</DialogTitle>
            <DialogDescription>
              Answer these quick questions so we can summarize your cuisine preferences.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor={primaryCuisineQuestion.key} className="text-sm font-medium text-slate-800">
                  {primaryCuisineQuestion.question}
                </Label>
                <Textarea
                  id={primaryCuisineQuestion.key}
                  value={primaryAnswer}
                  onChange={(event) => setPrimaryAnswer(event.target.value)}
                  placeholder={primaryCuisineQuestion.placeholder}
                  className="min-h-[72px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-800">Select tags (optional)</Label>
                <div className="relative">
                  <div
                    className="w-full min-h-[48px] border rounded-md px-3 py-2 flex items-center gap-2 flex-wrap cursor-text bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all duration-200"
                    onClick={() => setIsTagDropdownOpen(true)}
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
                          <span aria-hidden>×</span>
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
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredTagOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No tags found</div>
                      ) : (
                        filteredTagOptions.map((tag) => (
                          <button
                            type="button"
                            key={tag.tagId}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              handleAddTag(tag.tagId)
                              setSelectedTagNames(prev => {
                                if (prev.some(name => name.toLowerCase() === tag.name.toLowerCase())) return prev
                                return [...prev, tag.name]
                              })
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors"
                          >
                            <div className="text-sm font-semibold text-gray-900">{tag.name}</div>
                            {tag.description && <div className="text-xs text-gray-600">{tag.description}</div>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500">Pick or search tags to refine your cuisine preference.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetPreference" className="text-sm font-medium text-slate-800">
                  Budget preference
                </Label>
                <Select
                  value={String(budgetPreference)}
                  onValueChange={(value) => setBudgetPreference(Number(value))}
                >
                  <SelectTrigger id="budgetPreference">
                    <SelectValue placeholder="Select a budget level" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetLevels.map((level) => (
                      <SelectItem key={level.value} value={String(level.value)}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Choose the spending comfort that best matches you.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="distanceRadius" className="text-sm font-medium text-slate-800">
                  Distance radius (km)
                </Label>
                <Input
                  id="distanceRadius"
                  type="number"
                  min={0}
                  value={distanceRadius}
                  onChange={(event) => setDistanceRadius(Number(event.target.value))}
                />
                <p className="text-xs text-slate-500">How far are you willing to travel for food?</p>
              </div>
            </div>

            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  actionLabel
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}