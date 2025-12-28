import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  MapPin,
  Plus,
  Search,
  Filter,
  Clock,
  DollarSign,
  Share2,
  Copy,
  Trash2,
  Edit,
  FileText,
  Download,
  Globe,
  Lock,
  AlertTriangle,
  X,
  BarChart3,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card } from "../../../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { Badge } from "../../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import type { Itinerary } from "../../../types/itinerary.types";
import {
  getAllItineraries,
  getSharedWithMe,
  deleteItinerary,
  duplicateItinerary,
  exportToPDF,
} from "../../../services/itineraryService";
import { useToast } from "../../../components/ui/use-toast";
import ShareModal from "./ShareModal";

export default function ItineraryList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"my" | "shared">("my");
  const [myItineraries, setMyItineraries] = useState<Itinerary[]>([]);
  const [sharedItineraries, setSharedItineraries] = useState<Itinerary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tripTypeFilter, setTripTypeFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize] = useState(9);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);
  const [itemToShare, setItemToShare] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadItineraries();
  }, [activeTab, currentPage, searchQuery, tripTypeFilter, countryFilter]);

  const loadItineraries = async () => {
    setLoading(true);
    try {
      if (activeTab === "my") {
        const params = {
          Page: currentPage,
          PageSize: pageSize,
          ...(searchQuery && { Title: searchQuery }),
          ...(tripTypeFilter && tripTypeFilter !== "all" && { TripType: tripTypeFilter }),
          ...(countryFilter && { DestinationCountry: countryFilter }),
        };
        const data = await getAllItineraries(params);
        setMyItineraries(data.items);
        setTotalItems(data.totalItems);
      } else {
        const data = await getSharedWithMe();
        setSharedItineraries(Array.isArray(data) ? data : []);
        setTotalItems(Array.isArray(data) ? data.length : 0);
      }
    } catch (error) {
      console.error("Failed to load itineraries:", error);
      const status = (error as any)?.response?.status;
      // Nếu backend trả 404/204 khi không có dữ liệu, coi như trạng thái rỗng, không toast lỗi
      if (status === 404 || status === 204) {
        if (activeTab === "my") {
          setMyItineraries([]);
          setTotalItems(0);
        } else {
          setSharedItineraries([]);
          setTotalItems(0);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to load itineraries",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string, title: string) => {
    setItemToDelete({ id, title });
    setShowDeleteModal(true);
  };

  const handleShareClick = (id: string, title: string) => {
    setItemToShare({ id, title });
    setShowShareModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    
    setDeleting(true);
    try {
      await deleteItinerary(itemToDelete.id);
      
      setShowDeleteModal(false);
      setItemToDelete(null);
      
      // Show success toast with animation
      toast({
        title: "✅ Deleted Successfully",
        description: `"${itemToDelete.title}" has been removed from your itineraries.`,
      });
      
      // Wait a bit before reloading to show the animation
      setTimeout(() => {
        loadItineraries();
      }, 300);
    } catch (error) {
      console.error("Failed to delete:", error);
      toast({
        title: "❌ Error",
        description: "Failed to delete itinerary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const duplicated = await duplicateItinerary(id);
      toast({
        title: "Success",
        description: "Itinerary duplicated successfully",
      });
      // Navigate to detail page or refresh list if no ID
      if (duplicated?.itineraryId) {
        navigate(`/itinerary/${duplicated.itineraryId}`);
      } else {
        loadItineraries();
      }
    } catch (error) {
      console.error("Failed to duplicate:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate itinerary",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async (id: string, title: string) => {
    try {
      const blob = await exportToPDF(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Success",
        description: "PDF exported successfully",
      });
    } catch (error) {
      console.error("Failed to export:", error);
    }
  };

  const currentItineraries = activeTab === "my" ? myItineraries : sharedItineraries;
  
  const totalPages = Math.ceil(totalItems / pageSize);

  const getTripTypeColor = (tripType: string) => {
    switch (tripType) {
      case "Business":
        return "bg-blue-100 text-blue-800";
      case "Leisure":
        return "bg-green-100 text-green-800";
      case "Mixed":
        return "bg-purple-100 text-purple-800";
      case "Adventure":
        return "bg-orange-100 text-orange-800";
      case "Family":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return "N/A";
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "N/A";
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const calculateDuration = (startDate: string | null | undefined, endDate: string | null | undefined): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end dates
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-[95%] lg:max-w-[1600px]">
          {/* Header Section with Gradient Background */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 sm:p-8 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="flex-1"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                        My Itineraries
                      </h1>
                    </div>
                  </div>
                  <p className="text-gray-600 text-base sm:text-lg ml-14">
                    Plan and manage your travel adventures
                  </p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => navigate("/itinerary/analytics")}
                    className="border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-400 transition-all shadow-sm"
                  >
                    <BarChart3 className="mr-2 h-5 w-5" />
                    View Analytics
                  </Button>
                  <Button
                    onClick={() => navigate("/itinerary/create")}
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Create New Trip
                  </Button>
                </motion.div>
              </div>
            </Card>

            {/* Search and Filters - Enhanced Card Design */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card className="p-5 bg-white/80 backdrop-blur-sm border-0 shadow-md">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      placeholder="Search by title..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-12 h-11 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg shadow-sm transition-all"
                    />
                  </div>
                  
                  {/* Country Filter */}
                  <div className="relative flex-1 lg:flex-initial lg:w-56">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      placeholder="Filter by country..."
                      value={countryFilter}
                      onChange={(e) => {
                        setCountryFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-11 h-11 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg shadow-sm transition-all"
                    />
                  </div>
                  
                  {/* Type Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="gap-2 h-11 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-400 shadow-sm transition-all"
                      >
                        <Filter className="h-4 w-4" />
                        <span className="hidden sm:inline">Type:</span> {tripTypeFilter === "all" ? "All" : tripTypeFilter}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48 shadow-xl">
                      <DropdownMenuItem onClick={() => { setTripTypeFilter("all"); setCurrentPage(1); }}>
                        All Types
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setTripTypeFilter("Business"); setCurrentPage(1); }}>
                        Business
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setTripTypeFilter("Leisure"); setCurrentPage(1); }}>
                        Leisure
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setTripTypeFilter("Mixed"); setCurrentPage(1); }}>
                        Mixed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setTripTypeFilter("Adventure"); setCurrentPage(1); }}>
                        Adventure
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setTripTypeFilter("Family"); setCurrentPage(1); }}>
                        Family
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Browse Templates */}
                  <Button
                    variant="outline"
                    onClick={() => navigate("/itinerary/templates")}
                    className="gap-2 h-11 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-400 shadow-sm transition-all"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Browse</span> Templates
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mb-6"
        >
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "my" | "shared"); setCurrentPage(1); }}>
          <TabsList className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 shadow-sm p-1.5 rounded-lg mb-6">
            <TabsTrigger 
              value="my" 
              className="gap-2 px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-md"
            >
              <MapPin className="h-4 w-4" />
              <span className="font-semibold">My Itineraries</span>
              <Badge variant="secondary" className="ml-1 bg-white/50 text-gray-700">
                {totalItems}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="shared" 
              className="gap-2 px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-md"
            >
              <Share2 className="h-4 w-4" />
              <span className="font-semibold">Shared with Me</span>
              <Badge variant="secondary" className="ml-1 bg-white/50 text-gray-700">
                {sharedItineraries.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="flex gap-2">
                      <div className="h-8 w-20 bg-gray-200 rounded"></div>
                      <div className="h-8 w-20 bg-gray-200 rounded"></div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : currentItineraries.length === 0 ? (
              <Card className="p-12 text-center">
                <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No itineraries found
                </h3>
                <p className="text-gray-600 mb-6">
                  Start planning your next adventure by creating a new itinerary
                </p>
                <Button
                  onClick={() => navigate("/itinerary/create")}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Create Your First Trip
                </Button>
              </Card>
            ) : (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0 }}
              >
                <AnimatePresence>
                {currentItineraries.map((itinerary) => (
                  <motion.div
                    key={itinerary.itineraryId}
                    whileHover={{ 
                      scale: 1.01,
                      transition: { duration: 0.15 }
                    }}
                  >
                  <Card
                    className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group p-0 gap-0"
                  >
                    {/* Cover Image */}
                    <div
                      className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 relative overflow-hidden rounded-t-xl"
                      onClick={() =>
                        navigate(`/itinerary/${itinerary.itineraryId}`)
                      }
                    >
                      {itinerary.ItineraryImageUrl && itinerary.ItineraryImageUrl.trim() !== '' ? (
                        <img
                          src={itinerary.ItineraryImageUrl}
                          alt={itinerary.title}
                          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-300 ease-out"
                          onError={(e) => {
                            // Fallback to gradient if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="h-20 w-20 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div>';
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="h-20 w-20 text-white/50" />
                        </div>
                      )}
                      <div className="absolute top-4 right-4 flex gap-2">
                        {itinerary.isTemplate && (
                          <Badge className="bg-yellow-500">Template</Badge>
                        )}
                        {itinerary.isPublic ? (
                          <Globe className="h-5 w-5 text-white" />
                        ) : (
                          <Lock className="h-5 w-5 text-white" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3
                            className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 hover:text-blue-600 transition-colors duration-200 cursor-pointer"
                            onClick={() =>
                              navigate(`/itinerary/${itinerary.itineraryId}`)
                            }
                          >
                            {itinerary.title}
                          </h3>
                          <Badge className={getTripTypeColor(itinerary.tripType || "Leisure")}>
                            {itinerary.tripType || "Leisure"}
                          </Badge>
                        </div>
                      </div>

                      {itinerary.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {itinerary.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4 py-4 border-y">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-xs text-gray-500">Duration</div>
                            <div className="text-sm font-semibold">
                              {(() => {
                                const duration = calculateDuration(itinerary.startDate, itinerary.endDate);
                                return duration > 0 ? `${duration} days` : "N/A";
                              })()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-xs text-gray-500">Destination</div>
                            <div className="text-sm font-semibold">
                              {itinerary.destinationCity || "N/A"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatDate(itinerary.startDate)} -{" "}
                          {formatDate(itinerary.endDate)}
                        </span>
                      </div>

                      {itinerary.estimatedTotalCost && (
                        <div className="flex items-center gap-2 text-sm font-semibold text-green-600 mb-4">
                          <DollarSign className="h-4 w-4" />
                          <span>~${itinerary.estimatedTotalCost}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            navigate(`/itinerary/${itinerary.itineraryId}`)
                          }
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              •••
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleDuplicate(itinerary.itineraryId)
                              }
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleExportPDF(
                                  itinerary.itineraryId,
                                  itinerary.title
                                )
                              }
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Export PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => 
                                handleShareClick(itinerary.itineraryId, itinerary.title)
                              }
                            >
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            {activeTab === "my" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDeleteClick(itinerary.itineraryId, itinerary.title)
                                }
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                  </motion.div>
                ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Pagination */}
            {!loading && currentItineraries.length > 0 && totalPages > 1 && (
              <motion.div 
                className="mt-8 flex items-center justify-center gap-2"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>

                <span className="text-sm text-gray-600 ml-4">
                  Page {currentPage} of {totalPages} ({totalItems} total)
                </span>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
        </motion.div>
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
        {showDeleteModal && itemToDelete && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setShowDeleteModal(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
            >
              <Card className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Delete Itinerary?
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Are you sure you want to delete <strong>"{itemToDelete.title}"</strong>?
                    </p>
                    <p className="text-sm text-red-600 font-medium">
                      ⚠️ This action cannot be undone. All itinerary items will also be deleted.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleConfirmDelete}
                    disabled={deleting}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {deleting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mr-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </motion.div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </>
        )}
        </AnimatePresence>

        {/* Share Modal */}
        {showShareModal && itemToShare && (
          <ShareModal
            itineraryId={itemToShare.id}
            onClose={() => setShowShareModal(false)}
          />        
        )}
      </div>
  );
}

