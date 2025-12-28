import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LeftSidebar } from './components/LeftSidebar'
import { RightSidebar } from './components/RightSidebar'
import { PlaceCard } from './components/PlaceCard'
import { MobileHeader } from './components/MobileHeader'
import { MobileSidebar } from './components/MobileSidebar'
import { Header } from '@/commonPage/Header/Header'
import { Toaster } from '@/components/ui/toaster'
import { HomePageApi, ViewCategory, GetAllBranchesForHomePage } from '@/services/userService'
import { useSelector } from 'react-redux'
import type { RootState } from '@/redux/store'
import { LoginRequiredModal } from './LoginRequiredModal'
import { MapPin, AlertCircle, RefreshCw, Search } from 'lucide-react'
import './NewHomePage.css'

export default function NewHomePage() {
  const [activeNavItem, setActiveNavItem] = useState('home')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [places, setPlaces] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoginRequiredModalOpen, setIsLoginRequiredModalOpen] = useState(false)
  const [isPaginating, setIsPaginating] = useState(false)
  const [visibleCount, setVisibleCount] = useState(5)
  const [categories, setCategories] = useState<any[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')
  const [branches, setBranches] = useState<any[]>([])
  const [branchesLoading, setBranchesLoading] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  const { isAuthenticated, decodedToken } = useSelector((state: RootState) => state.auth)
  const currentUserId = decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]

  const PAGE_SIZE = 9999 // Max page size to load all data at once
  const ITEMS_PER_LOAD = 5 // Number of items to show per load

  const heroImages = [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=900&q=80',
    'https://i.pinimg.com/1200x/cd/f2/5c/cdf25c1974935f79e6c421086c73198b.jpg',

  ]

  const visiblePlaces = useMemo(() => places.slice(0, visibleCount), [places, visibleCount])
  const hasMorePlaces = visibleCount < places.length
  const hasActiveFilters = useMemo(
    () => selectedCategory !== 'all' || branchFilter !== 'all',
    [selectedCategory, branchFilter]
  )

  // Fetch places data when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories()
      fetchBranches()
      fetchPlaces()
    }
  }, [isAuthenticated])

  const getPlaceTimestamp = (entry: any) => {
    const raw =
      entry?.createdAt ||
      entry?.placeDetail?.createdAt ||
      entry?.placeDetail?.submittedAt ||
      entry?.placeDetail?.updatedAt ||
      entry?.updatedAt
    const parsed = raw ? Date.parse(raw) : NaN
    return Number.isNaN(parsed) ? 0 : parsed
  }

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true)
      const data = await ViewCategory()
      const mapped = Array.isArray(data) ? data : []
      setCategories(mapped)
    } catch (err) {
      console.error('Error fetching categories:', err)
    } finally {
      setCategoriesLoading(false)
    }
  }

  const fetchBranches = async () => {
    try {
      setBranchesLoading(true)
      const data = await GetAllBranchesForHomePage()
      const mapped = Array.isArray(data) ? data : []
      setBranches(mapped)
    } catch (err) {
      console.error('Error fetching branches:', err)
    } finally {
      setBranchesLoading(false)
    }
  }

  const fetchPlaces = async (options?: { categoryId?: string | number | null; branchId?: string | null }) => {
    try {
      setLoading(true)
      setError(null)
      const incomingCategory = options?.categoryId
      const incomingBranch = options?.branchId
      const effectiveCategory =
        incomingCategory === null || incomingCategory === 'all'
          ? undefined
          : incomingCategory ?? (selectedCategory !== 'all' ? selectedCategory : undefined)
      // Backend uses BrandId as branch filter param
      const effectiveBranch =
        incomingBranch === null || incomingBranch === 'all'
          ? undefined
          : incomingBranch ?? (branchFilter !== 'all' ? branchFilter : undefined)

      const response = await HomePageApi(1, PAGE_SIZE, effectiveCategory, effectiveBranch)
      const items = Array.isArray(response?.items) ? response.items : []

      // Sort and set all places
      const sorted = [...items].sort((a, b) => getPlaceTimestamp(b) - getPlaceTimestamp(a))
      setPlaces(sorted)
      setVisibleCount(Math.min(ITEMS_PER_LOAD, sorted.length))
    } catch (err) {
      console.error('Error fetching places:', err)
      setError('Unable to load places data')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = useCallback(async () => {
    if (isPaginating || !hasMorePlaces || loading) return

    setIsPaginating(true)

    try {
      // Show loading for 1 second, then load next 5 items
      await new Promise(resolve => setTimeout(resolve, 1000))

      setVisibleCount((prev) => Math.min(prev + ITEMS_PER_LOAD, places.length))
    } catch (err) {
      console.error('Error loading more places:', err)
    } finally {
      setIsPaginating(false)
    }
  }, [isPaginating, hasMorePlaces, loading, places.length])

  const handleCategoryChange = async (value: string) => {
    setSelectedCategory(value)
    setVisibleCount(ITEMS_PER_LOAD)
    await fetchPlaces({ categoryId: value, branchId: branchFilter })
  }

  const handleBranchChange = async (value: string) => {
    setBranchFilter(value)
    setVisibleCount(ITEMS_PER_LOAD)
    await fetchPlaces({ branchId: value, categoryId: selectedCategory })
  }

  const handleClearFilters = async () => {
    if (!hasActiveFilters) return
    setSelectedCategory('all')
    setBranchFilter('all')
    setVisibleCount(ITEMS_PER_LOAD)
    await fetchPlaces({ categoryId: null, branchId: null })
  }


  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const onScroll = () => {
      if (!hasMorePlaces || loading || isPaginating) return
      const threshold = 200
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - threshold) {
        handleLoadMore()
      }
    }

    container.addEventListener('scroll', onScroll)
    return () => {
      container.removeEventListener('scroll', onScroll)
    }
  }, [handleLoadMore, hasMorePlaces, loading, isPaginating])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Header />
      </motion.div>

      {/* Mobile Header */}
      <motion.div
        className="lg:hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      >
        <MobileHeader onMenuClick={() => setIsMobileSidebarOpen(true)} />
      </motion.div>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        activeItem={activeNavItem}
        onItemClick={setActiveNavItem}
      />

      <div className="flex">
        {/* Left Sidebar - Desktop Only */}
        <motion.div
          className="hidden lg:block relative"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          <LeftSidebar
            activeItem={activeNavItem}
            onItemClick={setActiveNavItem}
          />
        </motion.div>

        {/* Main Content */}
        <div
          ref={scrollContainerRef}
          className="flex-1 w-full overflow-y-auto scrollbar-hide"
          style={{ maxHeight: 'calc(100vh - 80px)' }}
        >
          <div className="max-w-4xl mx-auto p-4 lg:p-6">
            {/* Welcome Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
              className="mb-8"
            >
              <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 border border-gray-100">
                <div className="text-center space-y-6">
                  {/* Welcome Title */}
                  <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
                  >
                    Welcome to BEESRS
                  </motion.h1>

                  {/* Slogan */}
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="text-xl md:text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
                  >
                    Discover Places & Connect Through Social Activities
                  </motion.p>

                  {/* Description */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="max-w-3xl mx-auto space-y-4"
                  >
                    <p className="text-gray-700 text-base md:text-lg leading-relaxed">
                      <span className="font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        BEESRS (Broadcom Employee Engagement & Social Recommendation System)
                      </span>{' '}
                      is designed to help Broadcom employees working abroad adapt to new cultures, cuisines, and work environments.
                    </p>
                  </motion.div>

                  {/* Hero slider */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.65 }}
                    className="relative w-full overflow-hidden rounded-2xl border border-gray-100 shadow-inner"
                  >
                    <motion.div
                      className="flex"
                      animate={{ x: ['0%', '-50%'] }}
                      transition={{
                        duration: 18,
                        repeat: Infinity,
                        ease: 'linear'
                      }}
                      style={{ width: '200%' }}
                    >
                      {[...heroImages, ...heroImages].map((src, idx) => (
                        <div key={`${src}-${idx}`} className="w-1/4 p-1 md:p-2">
                          <div className="h-32 md:h-44 rounded-xl overflow-hidden">
                            <motion.img
                              src={src}
                              alt={`Hero gallery ${idx + 1}`}
                              className="w-full h-full object-cover"
                              whileHover={{ scale: 1.05 }}
                              transition={{ duration: 0.5 }}
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement
                                if (target.dataset.fallbackApplied === 'true') return
                                target.dataset.fallbackApplied = 'true'
                                target.src = '/placeholder.jpg'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  </motion.div>

                  {/* Explore Now Button */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    className="pt-4"
                  >
                    <motion.button
                      onClick={() => {
                        if (!isAuthenticated) {
                          setIsLoginRequiredModalOpen(true)
                        } else {
                          const placeCardsSection = document.querySelector('[data-place-cards]')
                          if (placeCardsSection) {
                            placeCardsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }
                        }
                      }}
                      className="px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2 mx-auto"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span>Explore Now</span>
                      <motion.svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        animate={{ y: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </motion.svg>
                    </motion.button>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Filters */}
            {isAuthenticated && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="mb-6"
              >
                <div className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-xl shadow-sm p-4 md:p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Discover by filters</p>
                      <p className="text-xs text-gray-500">Refine your home feed with curated categories</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {categoriesLoading && (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                          <span>Loading categories...</span>
                        </>
                      )}
                      <button
                        onClick={handleClearFilters}
                        disabled={!hasActiveFilters}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition ${
                          hasActiveFilters
                            ? 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:-translate-y-0.5 shadow-sm'
                            : 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                        }`}
                      >
                        <RefreshCw className={`w-4 h-4 ${hasActiveFilters ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span>Clear filters</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col">
                      <label className="text-xs font-medium text-gray-600 mb-1">Category</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      >
                        <option value="all">All categories</option>
                        {categories.map((cat: any) => (
                          <option key={cat.categoryId ?? cat.id} value={cat.categoryId ?? cat.id}>
                            {cat.name ?? cat.categoryName ?? 'Unnamed'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs font-medium text-gray-600 mb-1">Branch</label>
                      <div className="relative">
                        <select
                          value={branchFilter}
                          onChange={(e) => handleBranchChange(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition pr-10"
                        >
                          <option value="all">All branches</option>
                          {branches.map((b: any) => (
                            <option key={b.branchId} value={b.branchId}>
                              {`${b.name ?? 'Unnamed'} · ${b.cityName ?? 'Unknown city'} · ${b.countryName ?? 'Unknown country'}`}
                            </option>
                          ))}
                        </select>
                        {branchesLoading && (
                          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                            <RefreshCw className="w-4 h-4 animate-spin text-purple-500" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-end">
                      <div className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold py-3 px-4 shadow-lg">
                        Filters auto-apply on change
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Content Feed - Only show when authenticated */}
            {isAuthenticated && (
              <motion.div
                className="space-y-6"
                data-place-cards
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <AnimatePresence>
                  {loading && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center justify-center py-16"
                    >
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 mb-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                        <p className="text-gray-600 font-medium">Loading amazing places...</p>
                      </div>
                    </motion.div>
                  )}

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center py-16"
                    >
                      <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 border border-gray-100 max-w-md w-full">
                        <div className="text-center space-y-6">
                          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 via-orange-100 to-amber-100 mb-4">
                            <AlertCircle className="w-10 h-10 text-red-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">{error}</p>
                          </div>
                          <motion.button
                            onClick={() => fetchPlaces()}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2 mx-auto"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <RefreshCw className="w-5 h-5" />
                            <span>Try Again</span>
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {!loading && !error && visiblePlaces.map((place, index) => (
                    <motion.div
                      key={place.placeDetail?.placeId || place.placeId || index}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: 0.7 + index * 0.1,
                        ease: "easeOut"
                      }}
                      whileHover={{
                        scale: 1.02,
                        transition: { duration: 0.2 }
                      }}
                      layout
                    >
                      <PlaceCard
                        placeDetail={place.placeDetail || place}
                        currentUserId={currentUserId}
                      />
                    </motion.div>
                  ))}

                  {isPaginating && hasMorePlaces && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center py-6"
                    >
                      <div className="flex items-center gap-3 text-sm text-gray-500 bg-white/80 px-4 py-2 rounded-full shadow">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                        <span>Loading more places...</span>
                      </div>
                    </motion.div>
                  )}

                  {!loading && !error && places.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center py-16"
                    >
                      <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 border border-gray-100 max-w-md w-full">
                        <div className="text-center space-y-6">
                          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 mb-4">
                            <Search className="w-10 h-10 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                              No places found
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              We couldn't find any places to display right now. Check back later or explore other areas!
                            </p>
                          </div>
                          <div className="pt-2">
                            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                              <MapPin className="w-4 h-4" />
                              <span>More places coming soon</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Desktop Only */}
        <motion.div
          className="hidden xl:block relative"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
        >
          <RightSidebar />
        </motion.div>
      </div>

      {/* Toaster for notifications */}
      <Toaster />

      {/* Login Required Modal */}
      <LoginRequiredModal
        isOpen={isLoginRequiredModalOpen}
        onClose={() => setIsLoginRequiredModalOpen(false)}
      />
    </div>
  )
}
