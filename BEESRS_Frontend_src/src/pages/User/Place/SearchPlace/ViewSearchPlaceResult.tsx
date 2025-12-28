import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { SearchPlace, ViewDetailPlace, SearchHistory } from '@/services/userService'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Search as SearchIcon, Star, MapPin } from 'lucide-react'
import { Header } from '@/commonPage/Header/Header'
import { LeftSidebar } from '@/pages/public/Home/components/LeftSidebar'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { useSelector } from 'react-redux'
import type { RootState } from '@/redux/store'

interface SearchPlaceItem {
  placeId: string
  name: string
  categoryId: number
  categoryName: string
  priceLevel: number
  verificationStatus: string
  averageRating: number
}

function ViewSearchPlaceResult() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)
  
  const searchQuery = searchParams.get('q') || ''
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [searchResults, setSearchResults] = useState<SearchPlaceItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [activeNavItem, setActiveNavItem] = useState('home')
  const [inlineMessage, setInlineMessage] = useState<string | null>(null)

  // Reset currentPage when searchQuery changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Fetch search results
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        setTotalItems(0)
        setTotalPages(0)
        return
      }

      try {
        setIsLoading(true)
        setInlineMessage(null)
        const response: any = await SearchPlace({
          name: searchQuery.trim(),
          userLat: 0,
          userLng: 0,
          page: currentPage,
          pageSize: pageSize
        })

        const items = response?.items || response?.data?.items || []
        const totalItemsCount = response?.totalItems || response?.data?.totalItems || 0

        setSearchResults(items)
        setTotalItems(totalItemsCount)
        setTotalPages(Math.ceil(totalItemsCount / pageSize))
      } catch (error: any) {
        console.error('Error searching places:', error)
        setInlineMessage('Unable to load search results. Please try again.')
        setSearchResults([])
        setTotalItems(0)
        setTotalPages(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSearchResults()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, currentPage, pageSize])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePlaceClick = async (item: SearchPlaceItem) => {
    try {
      setInlineMessage(null)
      
      // Call ViewDetailPlace API with placeId
      await ViewDetailPlace({ placeId: item.placeId })
      
      // Call SearchHistory API
      if (isAuthenticated) {
        try {
          await SearchHistory({
            searchQuery: item.name || searchQuery.trim(),
            latitude: 0,
            longitude: 0,
            clickedPlaceId: item.placeId || null
          })
        } catch (error: any) {
          console.error('Error saving search history:', error)
        }
      }
      
      // Navigate to detail page
      navigate(`/search-places?placeId=${item.placeId}`)
    } catch (error: any) {
      console.error('Error loading place details:', error)
      setInlineMessage('Unable to load place details. Please try again.')
    }
  }

  const getPriceLevel = (level: number) => {
    const priceLevels = ['', 'Cheap', 'Fair', 'Moderate', 'Expensive', 'Luxury']
    return priceLevels[level] || 'Not specified'
  }

  if (!searchQuery.trim()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Header />
        </motion.div>

        <div className="flex">
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

          <div className="flex-1 w-full overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 80px)' }}>
            <div className="max-w-4xl mx-auto p-4 lg:p-6">
              <div className="text-center py-12">
                <SearchIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Search Places</h2>
                <p className="text-gray-600">Enter a place name in the search bar to find places</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
        <div className="flex-1 w-full overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          <div className="max-w-4xl mx-auto p-4 lg:p-6">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Search Results for "{searchQuery}"
              </h1>
              {totalItems > 0 && (
                <p className="text-gray-600">
                  Found {totalItems} {totalItems === 1 ? 'place' : 'places'}
                </p>
              )}
            </div>

            {/* Inline Message */}
            {inlineMessage && !isLoading && (
              <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                {inlineMessage}
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Searching places...</span>
              </div>
            )}

            {/* Results */}
            {!isLoading && searchResults.length > 0 && (
              <div className="space-y-4">
                {searchResults.map((item) => (
                  <Card 
                    key={item.placeId}
                    className="bg-white border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => handlePlaceClick(item)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{item.name}</h3>
                          <div className="flex items-center gap-3 flex-wrap">
                            {item.categoryName && (
                              <span className="px-3 py-1 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full text-xs font-medium text-white">
                                {item.categoryName}
                              </span>
                            )}
                            {item.averageRating > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="text-sm text-gray-600 font-medium">
                                  {item.averageRating.toFixed(1)}
                                </span>
                              </div>
                            )}
                            {item.priceLevel > 0 && (
                              <span className="text-sm text-gray-600">
                                {getPriceLevel(item.priceLevel)}
                              </span>
                            )}
                            {item.verificationStatus === 'Approved' && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                Verified
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <MapPin className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* No Results */}
            {!isLoading && searchResults.length === 0 && (
              <div className="text-center py-12">
                <SearchIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No places found</h2>
                <p className="text-gray-600">
                  Try searching with different keywords
                </p>
              </div>
            )}

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="min-w-[40px]"
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
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Page Info */}
            {!isLoading && totalPages > 1 && (
              <div className="mt-4 text-center text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewSearchPlaceResult
