import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Bookmark, Loader2, RefreshCcw } from 'lucide-react'
import { GetAllSavedPlaces } from '@/services/userService'
import { PlaceCard } from '@/pages/public/Home/components/PlaceCard'

type PlaceCardProps = React.ComponentProps<typeof PlaceCard>
type PlaceDetail = PlaceCardProps['placeDetail']

interface SavedPlaceEntry {
  placeDetail: PlaceDetail
}

const normalizeSavedPlaces = (data: any): SavedPlaceEntry[] => {
  const ensureValidEntry = (entry: any): entry is SavedPlaceEntry => Boolean(entry?.placeDetail)

  if (!data) return []
  if (Array.isArray(data)) return data.filter(ensureValidEntry)
  if (Array.isArray(data.items)) return data.items.filter(ensureValidEntry)
  if (Array.isArray(data.savedPlaces)) return data.savedPlaces.filter(ensureValidEntry)
  return []
}

function ViewSavedPlaces() {
  const [savedPlaces, setSavedPlaces] = useState<SavedPlaceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(10)
  const [isPaginating, setIsPaginating] = useState(false)
  const paginationTimeoutRef = useRef<number | null>(null)

  const totalSaved = useMemo(() => savedPlaces.length, [savedPlaces])
  const visibleSavedPlaces = useMemo(
    () => savedPlaces.slice(0, visibleCount),
    [savedPlaces, visibleCount]
  )
  const hasMorePlaces = visibleCount < savedPlaces.length

  const fetchSavedPlaces = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await GetAllSavedPlaces()
      const normalized = normalizeSavedPlaces(response)
      setSavedPlaces(normalized)

      const savedIds = normalized
        .map((entry) => entry.placeDetail?.placeId)
        .filter((id): id is string => Boolean(id))
      localStorage.setItem('savedPlaces', JSON.stringify(savedIds))
      setVisibleCount(Math.min(10, normalized.length))
    } catch (err) {
      console.error('Failed to fetch saved places:', err)
      setError('Failed to load your saved places. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSavedPlaces()
  }, [fetchSavedPlaces])

  const handlePlaceDeleted = useCallback(
    async (placeId: string) => {
      setSavedPlaces(prev => prev.filter(entry => entry.placeDetail.placeId !== placeId))
      await fetchSavedPlaces()
    },
    [fetchSavedPlaces]
  )

  const handlePlaceUpdated = useCallback(async () => {
    await fetchSavedPlaces()
  }, [fetchSavedPlaces])

  const handleLoadMore = useCallback(() => {
    if (isPaginating || !hasMorePlaces) return
    setIsPaginating(true)
    if (paginationTimeoutRef.current) {
      window.clearTimeout(paginationTimeoutRef.current)
    }
    paginationTimeoutRef.current = window.setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 10, savedPlaces.length))
      setIsPaginating(false)
      paginationTimeoutRef.current = null
    }, 600)
  }, [hasMorePlaces, isPaginating, savedPlaces.length])

  useEffect(() => {
    const onScroll = () => {
      if (!hasMorePlaces || loading) return
      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200
      if (scrolledToBottom) {
        handleLoadMore()
      }
    }
    window.addEventListener('scroll', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [handleLoadMore, hasMorePlaces, loading])

  useEffect(() => {
    return () => {
      if (paginationTimeoutRef.current) {
        window.clearTimeout(paginationTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Saved Places</h1>
              <p className="text-gray-600">All destinations you have bookmarked stay safely here.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {totalSaved} saved {totalSaved === 1 ? 'place' : 'places'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSavedPlaces}
            className="flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-gray-600 font-medium">Loading your saved places…</p>
            <p className="text-sm text-gray-500">Give us a second to prepare your curated list.</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="py-8 flex flex-col items-center gap-4 text-center">
            <p className="text-red-600 font-semibold">Something went wrong</p>
            <p className="text-sm text-red-500 max-w-md">{error}</p>
            <Button onClick={fetchSavedPlaces} className="px-6">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : totalSaved === 0 ? (
        <Card className="border border-dashed border-gray-300 bg-white">
          <CardContent className="py-14 flex flex-col items-center gap-3 text-center">
            <Bookmark className="w-10 h-10 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">No saved places yet</h3>
            <p className="text-sm text-gray-500 max-w-md">
              Start discovering interesting locations and save the ones you love. They will appear here for quick access.
            </p>
            <Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Discover Places
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {visibleSavedPlaces.map((entry) => (
            <PlaceCard 
              key={entry.placeDetail.placeId}
              placeDetail={entry.placeDetail}
              onPlaceDeleted={handlePlaceDeleted}
              onPlaceUpdated={handlePlaceUpdated}
            />
          ))}
          {isPaginating && hasMorePlaces && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-3 text-sm text-gray-500 bg-white/80 px-4 py-2 rounded-full shadow">
                <RefreshCcw className="w-4 h-4 animate-spin text-blue-500" />
                <span>Loading more places...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ViewSavedPlaces