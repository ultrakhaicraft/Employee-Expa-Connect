import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Map, User, MoreHorizontal, Settings, LogOut, Star, ArrowRight, X, Trash2, History, Bookmark } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import type { RootState } from '@/redux/store'
import { buttonStyles, inputStyles, colors } from '@/lib/colors'
import { MapModal } from '@/pages/User/Place/MapModal'
import { LoginRequiredModal } from '@/pages/public/Home/LoginRequiredModal'
import { SearchPlace, SearchHistory, GetAllSearchHistory, DeleteSearchHistory, DeleteAllSearchHistory } from '@/services/userService'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logout } from '@/redux/authSlice'
import { useToast } from '@/components/ui/use-toast'

interface SearchHistoryEntry {
  searchId?: string
  searchHistoryId?: string
  id?: string
  searchQuery?: string
  clickedPlaceId?: string | null
  searchTimestamp?: string
  searchedAt?: string
}

interface HeaderProps {
  fixed?: boolean
}

export function Header({ fixed = true }: HeaderProps) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { toast } = useToast()
  const { isAuthenticated, userProfile, decodedToken } = useSelector((state: RootState) => state.auth)
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results')
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch search history
  const fetchSearchHistory = async () => {
    if (!isAuthenticated) {
      return
    }

    try {
      setIsLoadingHistory(true)
      const response = await GetAllSearchHistory()
      const historyData = response?.items || response?.data?.items || response || []
      if (Array.isArray(historyData)) {
        const normalizedHistory = historyData.map((item: SearchHistoryEntry) => ({
          ...item,
          clickedPlaceId: item.clickedPlaceId ?? null,
        }))
        setSearchHistory(normalizedHistory)
      } else {
        setSearchHistory([])
      }
    } catch (error: any) {
      console.error('Error fetching search history:', error)
      setSearchHistory([])
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Fetch history when input is focused and empty
  useEffect(() => {
    if (showDropdown && !searchQuery.trim() && isAuthenticated) {
      fetchSearchHistory()
    }
  }, [showDropdown, searchQuery, isAuthenticated])

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!searchQuery.trim()) {
      setSearchResults([])
      setActiveTab('history')
      if (showDropdown && isAuthenticated) {
        fetchSearchHistory()
      }
      return
    }

    setActiveTab('results')

    debounceTimerRef.current = setTimeout(async () => {
      try {
        setIsSearching(true)
        setShowDropdown(true)
        const response = await SearchPlace({
          name: searchQuery.trim(),
          userLat: 0,
          userLng: 0,
          page: 1,
          pageSize: 5 // Max 5 results in dropdown
        })

        const items = response?.items || response?.data?.items || []
        setSearchResults(items.slice(0, 5)) // Ensure max 5
      } catch (error: any) {
        console.error('Error searching places:', error)
        setSearchResults([])
        // Don't show toast, just show "No places found" in dropdown
      } finally {
        setIsSearching(false)
      }
    }, 300) // 300ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery, showDropdown, isAuthenticated])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedQuery = searchQuery.trim()
    
    if (!trimmedQuery) {
      return
    }

    if (isAuthenticated) {
      try {
        await SearchHistory({
          searchQuery: trimmedQuery,
          latitude: 0,
          longitude: 0,
          clickedPlaceId: null
        })
        await fetchSearchHistory()
      } catch (error: any) {
        console.error('Error logging search history:', error)
      }
    }

    // Navigate to search results page
    navigate(`/search-places-result?q=${encodeURIComponent(trimmedQuery)}`)
    setSearchQuery('')
    setShowDropdown(false)
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit(e as any)
    }
  }

  const handlePlaceClick = async (placeId: string, placeName: string) => {
    if (isAuthenticated) {
      try {
        await SearchHistory({
          searchQuery: placeName || '',
          latitude: 0,
          longitude: 0,
          clickedPlaceId: placeId,
        })
        await fetchSearchHistory()
      } catch (error: any) {
        console.error('Error saving search history:', error)
      }
    }

    navigate(`/search-places?placeId=${placeId}`)
    setSearchQuery('')
    setShowDropdown(false)
  }

  const handleHistoryClick = async (historyItem: SearchHistoryEntry) => {
    try {
      const historyQuery = (historyItem.searchQuery || '').trim()
      const clickedPlaceId = historyItem.clickedPlaceId || null

      if (!historyQuery && !clickedPlaceId) {
        return
      }

      if (isAuthenticated) {
        try {
          await SearchHistory({
            searchQuery: historyQuery,
            latitude: 0,
            longitude: 0,
            clickedPlaceId,
          })
          await fetchSearchHistory()
        } catch (error: any) {
          console.error('Error saving search history:', error)
        }
      }

      if (clickedPlaceId) {
        navigate(`/search-places?placeId=${clickedPlaceId}`)
      } else if (historyQuery) {
        navigate(`/search-places-result?q=${encodeURIComponent(historyQuery)}`)
      }
      setSearchQuery('')
      setShowDropdown(false)
    } catch (error: any) {
      console.error('Error handling history click:', error)
    }
  }

  const handleDeleteHistory = async (e: React.MouseEvent, historyId: string) => {
    e.stopPropagation()
    if (!historyId) {
      return
    }
    try {
      await DeleteSearchHistory(historyId)
      // Refresh history
      await fetchSearchHistory()
    } catch (error: any) {
      console.error('Error deleting search history:', error)
      // Don't show toast
    }
  }

  const handleClearAllHistory = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await DeleteAllSearchHistory()
      // Refresh history
      await fetchSearchHistory()
    } catch (error: any) {
      console.error('Error clearing all search history:', error)
      // Don't show toast
    }
  }

  const handleViewMore = () => {
    if (searchQuery.trim()) {
      navigate(`/search-places-result?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setShowDropdown(false)
    }
  }

  const handleMapClick = () => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true)
    } else {
      setIsMapModalOpen(true)
    }
  }

  const displayName = userProfile?.fullName || decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || 'User'
  const userInitial = displayName.charAt(0).toUpperCase()
  const userHandle = `@${displayName.toLowerCase().replace(/\s+/g, '')}`

  const handleLogout = async () => {
    try {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('expiresAt')
      localStorage.removeItem('user')
      localStorage.removeItem('likedPlaces')

      dispatch(logout())

      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
        variant: "default",
      })

      navigate('/')
      setTimeout(() => window.location.reload(), 100)
    } catch (error) {
      console.error('Logout error:', error)
      dispatch(logout())
      toast({
        title: "Logged out",
        description: "You have been logged out of your account.",
        variant: "default",
      })
      navigate('/')
    }
  }

  return (
    <>
      <header
        className={`bg-white border-b border-gray-200 shadow-sm ${
          fixed ? "fixed top-0 left-0 right-0 z-50" : "relative"
        }`}
      >
        <div className="w-full px-4 py-2">
          <div className="grid grid-cols-3 items-center max-w-7xl mx-auto ">
            {/* Left Section - Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-all duration-300 hover:scale-105">
                <motion.img 
                  src="/logo.png" 
                  alt="Beesrs Logo" 
                  className="w-8 h-8 object-contain"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
                <span className="text-xl font-bold text-gray-900">Beesrs</span>
              </Link>
            </motion.div>

            {/* Middle Section - Search Bar */}
            <motion.div 
              className="justify-self-center w-full max-w-2xl"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            >
              <div className="flex items-center gap-2">
                <div className="relative flex-1" ref={searchRef}>
                <form onSubmit={handleSearchSubmit} className="w-full">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                    <motion.div
                      whileFocus={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Input
                        placeholder="Search places..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onKeyPress={handleSearchKeyPress}
                        onFocus={() => {
                          setShowDropdown(true)
                          if (!searchQuery.trim() && isAuthenticated) {
                            fetchSearchHistory()
                            setActiveTab('history')
                          } else if (searchQuery.trim()) {
                            setActiveTab('results')
                          }
                        }}
                        className={`pl-10 pr-10 ${inputStyles.default}`}
                      />
                    </motion.div>
                    {searchQuery.trim() && (
                      <motion.button
                        type="submit"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg bg-gradient-to-r from-purple-400 to-blue-400 text-white hover:from-purple-500 hover:to-blue-500 transition-all duration-200 z-10"
                        title="Search"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Search className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  {showDropdown && (searchQuery.trim() || (isAuthenticated && !searchQuery.trim())) && (
                    <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-[100] max-h-96 overflow-hidden flex flex-col">
                      {/* Tabs - Show both tabs if user has entered search query, only history if empty */}
                      {searchQuery.trim() ? (
                        <div className="flex border-b border-gray-200">
                          <button
                            type="button"
                            onClick={() => setActiveTab('results')}
                            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                              activeTab === 'results'
                                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            Results
                          </button>
                          {isAuthenticated && (
                            <button
                              type="button"
                              onClick={() => setActiveTab('history')}
                              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === 'history'
                                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <History className="w-4 h-4" />
                                History
                              </div>
                            </button>
                          )}
                        </div>
                      ) : (
                        isAuthenticated && (
                          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                              <History className="w-4 h-4" />
                              Search History
                            </div>
                          </div>
                        )
                      )}

                      {/* Tab Content */}
                      <div className="overflow-y-auto flex-1">
                        {/* Results Tab - Only show when user has entered search query */}
                        {searchQuery.trim() && activeTab === 'results' && (
                          <>
                            {isSearching ? (
                              <div className="p-4 text-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="text-sm text-gray-500 mt-2">Searching...</p>
                              </div>
                            ) : (
                              <>
                                {searchResults.length > 0 ? (
                                  <>
                                    {searchResults.map((item) => (
                                      <div
                                        key={item.placeId}
                                        onClick={() => handlePlaceClick(item.placeId, item.name)}
                                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <p className="font-semibold text-gray-900 truncate">{item.name || 'N/A'}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            {item.categoryName && (
                                              <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full text-white font-medium">
                                                {item.categoryName}
                                              </span>
                                            )}
                                            {item.averageRating > 0 && (
                                              <div className="flex items-center gap-1">
                                                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                                <span className="text-xs text-gray-600">{item.averageRating.toFixed(1)}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      </div>
                                    ))}
                                    
                                    {/* View More Button */}
                                    <div
                                      onClick={handleViewMore}
                                      className="flex items-center justify-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors border-t border-gray-200"
                                    >
                                      <Search className="w-4 h-4 text-blue-600" />
                                      <span className="text-sm font-medium text-blue-600">View More Results</span>
                                      <ArrowRight className="w-4 h-4 text-blue-600" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="p-4 text-center text-gray-500">
                                    <p className="text-sm">No places found</p>
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        )}

                        {/* History Tab */}
                        {(activeTab === 'history' || !searchQuery.trim()) && isAuthenticated && (
                          <>
                            {isLoadingHistory ? (
                              <div className="p-4 text-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="text-sm text-gray-500 mt-2">Loading history...</p>
                              </div>
                            ) : (
                              <>
                                {/* Clear All Button */}
                                {searchHistory.length > 0 && (
                                  <div className="border-b border-gray-200">
                                    <button
                                      type="button"
                                      onClick={handleClearAllHistory}
                                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      <span>Clear All</span>
                                    </button>
                                  </div>
                                )}

                                {searchHistory.length > 0 ? (
                                  <>
                                    {searchHistory.map((item, index) => {
                                      const historyId = item.searchId || item.searchHistoryId || item.id || ''
                                      const historyQuery = item.searchQuery || 'Untitled search'
                                      const timestamp = item.searchTimestamp || item.searchedAt || ''
                                      const formattedTimestamp = timestamp ? new Date(timestamp).toLocaleString() : null
                                      const isPlaceHistory = Boolean(item.clickedPlaceId)
                                      
                                      return (
                                        <div
                                          key={historyId || `history-${index}`}
                                          onClick={() => handleHistoryClick(item)}
                                          className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 group"
                                        >
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <p className="font-semibold text-gray-900 truncate">{historyQuery}</p>
                                              <span className={`text-xs px-2 py-0.5 rounded-full ${isPlaceHistory ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {isPlaceHistory ? 'Place' : 'Keyword'}
                                              </span>
                                            </div>
                                            {formattedTimestamp && (
                                              <p className="text-xs text-gray-500 mt-1">
                                                {formattedTimestamp}
                                              </p>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => handleDeleteHistory(e, historyId)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Delete"
                                            disabled={!historyId}
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        </div>
                                      )
                                    })}
                                  </>
                                ) : (
                                  <div className="p-4 text-center text-gray-500">
                                    <p className="text-sm">No search history</p>
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </form>
                </div>
                <motion.button
                  onClick={handleMapClick}
                  className="h-9 px-4 bg-gradient-to-r from-purple-400 to-blue-400 text-white border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-400 transition-colors flex items-center gap-2"
                  title="View places on map"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                >
                  <Map className="w-4 h-4" />
                  <span className="text-sm">Map</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Right Section */}
            <div className="justify-self-end">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-3 px-7 py-1 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <div className="relative">
                        {userProfile?.profilePictureUrl ? (
                          <img
                            src={userProfile.profilePictureUrl}
                            alt={displayName}
                            className="w-9 h-9 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none'
                              const fallback = (e.currentTarget.nextElementSibling as HTMLElement)
                              if (fallback) fallback.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-gray-200"
                          style={{ 
                            background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                            display: userProfile?.profilePictureUrl ? 'none' : 'flex'
                          }}
                        >
                          <span className="text-white font-bold text-sm">
                            {userInitial}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-semibold text-gray-900 truncate max-w-[150px]">
                          {displayName}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">
                          {userHandle}
                        </p>
                      </div>
                      <MoreHorizontal className="w-4 h-4 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-52" align="end" sideOffset={8}>
                    <DropdownMenuItem asChild>
                      <Link 
                        to="/profile" 
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <User className="w-4 h-4" />
                        Your Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link 
                        to="/saved-places" 
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <Bookmark className="w-4 h-4" />
                        Saved Places
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link 
                        to="/change-password" 
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <Settings className="w-4 h-4" />
                        Change Password
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-sm text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <motion.div 
                  className="flex items-center"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button className={`${buttonStyles.primary} rounded-lg`}>
                      <Link to="/login">Sign in</Link>
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </header>
      {/* Spacer to offset fixed header height (responsive to actual header height) */}
      {fixed && <div className="h-16 md:h-20" />}
      
      {/* Map Modal */}
      {isAuthenticated && (
        <MapModal 
          isOpen={isMapModalOpen} 
          onClose={() => setIsMapModalOpen(false)} 
        />
      )}

      {/* Login Required Modal */}
      <LoginRequiredModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </>
  )
}
