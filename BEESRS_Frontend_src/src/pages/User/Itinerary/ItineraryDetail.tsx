import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  Navigation,
  Share2,
  Download,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Image as ImageIcon,
  Upload,
  Star,
  Tag,
  Phone,
  Globe,
  Mail,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { useToast } from "../../../components/ui/use-toast";
import type {
  Itinerary,
  ItineraryItem,
  BookingStatus,
  UpdateItineraryRequest,
} from "../../../types/itinerary.types";
import {
  getItineraryById,
  getItineraryItems,
  updateItinerary,
  deleteItineraryItem,
  exportToPDF,
  uploadItineraryCoverImage,
  generateItineraryCoverImage,
} from "../../../services/itineraryService";
import { ViewDetailPlace } from "../../../services/userService";
import AddItemModal from "./AddItemModal";
import EditItemModal from "./EditItemModal";
import ShareModal from "./ShareModal";
import RouteOptimization from "./RouteOptimization";
import PlaceDetailModal from "../ViewProfile/ViewPlace/PlaceDetailModal";
import { useItineraryDistances } from "../../../hooks/useItineraryDistances";
import { TravelSegment } from "../../../components/Event/TravelSegment";
import { optimizeItineraryRoute } from "../../../services/vrpService";
import { RouteOptimizationDialog } from "../../../components/Event/RouteOptimizationDialog";
import { formatDistance, formatDuration, getDistanceMatrix, getDirections } from "../../../services/trackAsiaService";
import type { OptimizedRouteResult } from "../../../services/vrpService";
import { convertUtcToLocalTime } from "../../../utils/timezone";

export default function ItineraryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRouteOptimization, setShowRouteOptimization] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedOverItem, setDraggedOverItem] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editData, setEditData] = useState<UpdateItineraryRequest>({});
  
  // Place detail modal state
  const [showPlaceDetail, setShowPlaceDetail] = useState(false);
  const [selectedPlaceDetail, setSelectedPlaceDetail] = useState<any>(null);
  const [loadingPlaceDetail, setLoadingPlaceDetail] = useState(false);

  // TrackAsia Route Optimization - Transport mode and optimization state
  const [transportMode, setTransportMode] = useState<'car' | 'moto' | 'walk'>('car');
  const [showOptimizationDialog, setShowOptimizationDialog] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizedRouteResult | null>(null);
  const [applyingOptimization, setApplyingOptimization] = useState(false);

  // Group items by day first - memoized to prevent infinite loops
  const itemsByDayMap = useMemo((): Map<number, ItineraryItem[]> => {
    const grouped = new Map<number, ItineraryItem[]>();
    if (!itinerary?.items) return grouped;

    itinerary.items.forEach((item) => {
      const day = item.dayNumber;
      if (!grouped.has(day)) {
        grouped.set(day, []);
      }
      grouped.get(day)!.push(item);
    });

    // Sort items within each day
    grouped.forEach((items) => {
      items.sort((a, b) => a.orderInDay - b.orderInDay);
    });

    return grouped;
  }, [itinerary?.items]);

  // Calculate distances for all days - combine all items sorted by day and order - memoized
  const allItemsSorted = useMemo(() => {
    const sorted: ItineraryItem[] = [];
    const days = Array.from(itemsByDayMap.keys()).sort((a, b) => a - b);
    days.forEach(day => {
      sorted.push(...(itemsByDayMap.get(day) || []));
    });
    return sorted;
  }, [itemsByDayMap]);

  const { distances, totalDistance, totalDuration, loading: calculatingDistances } = useItineraryDistances(
    allItemsSorted,
    {
      profile: transportMode,
      enabled: !!itinerary && allItemsSorted.length >= 2
    }
  );

  useEffect(() => {
    if (id) {
      loadItinerary();
    }
  }, [id]);

  // Helper function to check and update completion status
  const checkAndUpdateCompletionStatus = async (
    items: ItineraryItem[],
    itineraryData: Itinerary,
    itineraryId: string
  ) => {
    // Chỉ check nếu có items
    if (items.length === 0) {
      // Nếu không có items, giữ nguyên status hiện tại (không tự động complete)
      return;
    }

    // Check xem tất cả items đã completed chưa
    const allItemsCompleted = items.every(item => item.isCompleted === true);
    
    // Nếu tất cả items đã completed và status chưa phải "Completed"
    if (allItemsCompleted && itineraryData.status !== "Completed") {
      try {
        const completedAt = new Date().toISOString();
        await updateItinerary(itineraryId, { 
          ...itineraryData, 
          status: "Completed",
          completedAt: completedAt
        });
        itineraryData.status = "Completed";
        itineraryData.completedAt = completedAt;
        toast({
          title: "🎉 Congratulations!",
          description: "All activities completed! Itinerary marked as completed.",
        });
      } catch (error) {
        console.error("Failed to update itinerary completion status:", error);
      }
    } 
    // Nếu không phải tất cả items completed nhưng status đang là "Completed", revert về "Planning"
    else if (!allItemsCompleted && itineraryData.status === "Completed") {
      try {
        await updateItinerary(itineraryId, { 
          ...itineraryData, 
          status: "Planning",
          completedAt: null
        });
        itineraryData.status = "Planning";
        itineraryData.completedAt = undefined;
      } catch (error) {
        console.error("Failed to update itinerary status:", error);
      }
    }
  };

  const loadItinerary = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getItineraryById(id);
      
      // Load items separately
      let items: ItineraryItem[] = [];
      try {
        items = await getItineraryItems(id);
        
        // Load place details for each item that doesn't have place info
        const itemsWithPlaces = await Promise.all(
          items.map(async (item) => {
            // If place info is missing and placeId exists, load it
            if (!item.place && item.placeId) {
              try {
                const placeDetail = await ViewDetailPlace({ placeId: item.placeId });
                // Map from PlaceDetail structure to Place interface and store full detail
                return {
                  ...item,
                  place: {
                    placeId: placeDetail.placeId || item.placeId,
                    placeName: placeDetail.name || item.activityTitle || "Unknown Place",
                    address: placeDetail.addressLine1 || "",
                    latitude: typeof placeDetail.latitude === 'number' ? placeDetail.latitude : Number(placeDetail.latitude) || 0,
                    longitude: typeof placeDetail.longitude === 'number' ? placeDetail.longitude : Number(placeDetail.longitude) || 0,
                    imageUrl: placeDetail.imageUrls?.[0]?.imageUrl || "",
                    description: placeDetail.description || "",
                    // Store full place detail for additional info
                    placeDetail: placeDetail as any,
                  },
                };
              } catch (error) {
                console.error(`Failed to load place ${item.placeId}:`, error);
                return item;
              }
            }
            return item;
          })
        );
        
        items = itemsWithPlaces;
      } catch (error) {
        console.error("Failed to load itinerary items:", error);
        // Continue even if items fail to load
      }
      
      // Sync status with CompletedAt if there's inconsistency
      if (data) {
        const hasCompletedAt = (data as any).completedAt != null;
        const isStatusCompleted = data.status === "Completed";
        
        // If has CompletedAt but status is not "Completed", sync status
        if (hasCompletedAt && !isStatusCompleted) {
          try {
            await updateItinerary(id, {
              ...data,
              status: "Completed"
            });
            data.status = "Completed";
          } catch (error) {
            console.error("Failed to sync status with CompletedAt:", error);
          }
        }
        // If status is "Completed" but no CompletedAt, check items to determine if should keep status
        else if (isStatusCompleted && !hasCompletedAt) {
          // Will be handled by checkAndUpdateCompletionStatus below
        }
        
        // Check completion status: if all items are completed, mark itinerary as completed
        await checkAndUpdateCompletionStatus(items, data, id);
      }
      
      // Set itinerary with items
      if (data) {
        setItinerary({
          ...data,
          items: items,
        });
        
        setEditData({
          title: data.title,
          description: data.description,
          startDate: data.startDate.split("T")[0],
          endDate: data.endDate.split("T")[0],
          tripType: data.tripType,
          destinationCity: data.destinationCity,
          destinationCountry: data.destinationCountry,
          totalBudget: data.totalBudget,
          currency: data.currency,
          isPublic: data.isPublic,
          isTemplate: data.isTemplate,
          templateCategory: data.templateCategory,
        });
        // Load existing cover image if available
        const existingImageUrl = data.ItineraryImageUrl && data.ItineraryImageUrl.trim() !== '' 
          ? data.ItineraryImageUrl 
          : null;
        setCoverImagePreview(existingImageUrl);
        setCoverImageFile(null); // Reset file when loading
      }
    } catch (error) {
      console.error("Failed to load itinerary:", error);
      toast({
        title: "Error",
        description: "Failed to load itinerary",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be less than 10MB",
          variant: "destructive",
        });
        return;
      }
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCoverImage = () => {
    setCoverImageFile(null);
    setCoverImagePreview(null);
    // Also clear the ItineraryImageUrl in editData to indicate removal
    setEditData({ ...editData, ItineraryImageUrl: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerateImage = async () => {
    if (!itinerary) return;
    
    // Validate required fields
    if (!itinerary.title || !itinerary.destinationCity || !itinerary.destinationCountry) {
      toast({
        title: "Missing Information",
        description: "Please ensure title, destination city, and country are filled to generate an image.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingImage(true);
    try {
      const imageUrl = await generateItineraryCoverImage({
        title: itinerary.title,
        description: itinerary.description,
        tripType: itinerary.tripType,
        destinationCity: itinerary.destinationCity,
        destinationCountry: itinerary.destinationCountry,
      });

      setCoverImagePreview(imageUrl);
      setCoverImageFile(null);
      setEditData({ ...editData, ItineraryImageUrl: imageUrl });
      
      toast({
        title: "✨ Image Generated!",
        description: "AI-generated cover image has been created for your itinerary.",
      });
    } catch (error: any) {
      console.error("Failed to generate image:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    try {
      // Upload cover image if a new file is selected
      let coverImageUrl: string | undefined = undefined;
      if (coverImageFile) {
        try {
          coverImageUrl = await uploadItineraryCoverImage(coverImageFile);
        } catch (uploadError: any) {
          console.error("Failed to upload cover image:", uploadError);
          toast({
            title: "Upload Error",
            description: uploadError.message || "Failed to upload cover image. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      const dataToUpdate: UpdateItineraryRequest = {
        ...editData,
      };

      // Handle cover image update:
      // 1. If new file uploaded, use new URL
      // 2. If user removed image (preview is null and no file), set to empty
      // 3. If no change (preview exists and matches original), keep original (don't update)
      if (coverImageUrl) {
        // New image uploaded
        dataToUpdate.ItineraryImageUrl = coverImageUrl;
      } else if (coverImagePreview === null && coverImageFile === null) {
        // User removed image - check if original had image
        const originalHadImage = itinerary?.ItineraryImageUrl && itinerary.ItineraryImageUrl.trim() !== '';
        if (originalHadImage) {
          // User explicitly removed the image
          dataToUpdate.ItineraryImageUrl = "";
        }
        // If original had no image and preview is null, no need to update
      }
      // If coverImagePreview exists and no new file, keep original (don't include in update)

      await updateItinerary(id, dataToUpdate);
      
      // If user checked "Save as Template", call saveAsTemplate API
      if (editData.isTemplate) {
        try {
          const { saveAsTemplate } = await import("../../../services/itineraryService");
          await saveAsTemplate(id);
          toast({
            title: "✅ Success",
            description: "Itinerary updated and saved as template successfully!",
          });
        } catch (templateError: any) {
          console.error("Failed to save as template:", templateError);
          toast({
            title: "⚠️ Warning",
            description: "Itinerary updated, but failed to save as template: " + (templateError?.message || "Unknown error"),
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "✅ Success",
          description: "Itinerary updated successfully",
        });
      }
      
      setEditMode(false);
      setCoverImageFile(null);
      // Reset cover image preview to original when canceling
      if (itinerary) {
        const existingImageUrl = itinerary.ItineraryImageUrl && itinerary.ItineraryImageUrl.trim() !== '' 
          ? itinerary.ItineraryImageUrl 
          : null;
        setCoverImagePreview(existingImageUrl);
      }
      loadItinerary();
    } catch (error) {
      console.error("Failed to update:", error);
      toast({
        title: "Error",
        description: "Failed to update itinerary",
        variant: "destructive",
      });
    }
  };

  const handleReorderItems = async (dayNumber: number, newOrder: { itemId: string; newSortOrder: number }[]) => {
    if (!id) return;
    try {
      const { reorderItineraryItems } = await import("../../../services/itineraryService");
      await reorderItineraryItems(id, {
        items: newOrder.map(order => ({
          itemId: order.itemId,
          newSortOrder: order.newSortOrder,
          newDayNumber: dayNumber,
        })),
      });
      toast({
        title: "✅ Success",
        description: "Items reordered successfully!",
      });
      loadItinerary();
    } catch (error: any) {
      console.error("Failed to reorder items:", error);
      toast({
        title: "❌ Error",
        description: error?.message || "Failed to reorder items",
        variant: "destructive",
      });
    }
  };

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== itemId) {
      setDraggedOverItem(itemId);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDraggedOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, dayNumber: number, items: ItineraryItem[], targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem || !id) return;

    const draggedIndex = items.findIndex(item => item.itemId === draggedItem);
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedItem(null);
      setDraggedOverItem(null);
      return;
    }

    // Create new order
    const newItems = [...items];
    const [dragged] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, dragged);

    // Prepare reorder request
    const reorderRequest = newItems.map((item, index) => ({
      itemId: item.itemId,
      newSortOrder: index + 1,
    }));

    handleReorderItems(dayNumber, reorderRequest);
    setDraggedItem(null);
    setDraggedOverItem(null);
  };

  const handleApplyOptimization = async () => {
    if (!optimizationResult || !id) return;

    setApplyingOptimization(true);
    try {
      // Map optimized items to reorder request
      const reorderRequest = optimizationResult.optimizedItems.map((item, index) => ({
        itemId: item.itemId,
        newSortOrder: index + 1,
        newDayNumber: item.dayNumber // Keep original day
      }));

      // Apply reordering
      const { reorderItineraryItems } = await import("../../../services/itineraryService");
      await reorderItineraryItems(id, { items: reorderRequest });

      toast({
        title: "🎉 Route Optimized!",
        description: `Saved ${optimizationResult.savingsPercent}% travel distance`,
      });

      // Reload itinerary to show new order
      await loadItinerary();
      
      // Close dialog
      setShowOptimizationDialog(false);
      setOptimizationResult(null);
    } catch (error: any) {
      toast({
        title: "Failed to Apply",
        description: error.message || "Failed to apply optimization",
        variant: "destructive",
      });
    } finally {
      setApplyingOptimization(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteItineraryItem(itemId);
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
      loadItinerary();
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  const handlePlaceClick = async (placeId: string) => {
    if (!placeId) return;
    
    setLoadingPlaceDetail(true);
    setShowPlaceDetail(true);
    
    try {
      const placeDetail = await ViewDetailPlace({ placeId });
      setSelectedPlaceDetail(placeDetail);
    } catch (error: any) {
      console.error("Failed to load place detail:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to load place details",
        variant: "destructive",
      });
      setShowPlaceDetail(false);
    } finally {
      setLoadingPlaceDetail(false);
    }
  };

  const handleExportPDF = async () => {
    if (!id || !itinerary) return;
    try {
      const blob = await exportToPDF(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${itinerary.title}.pdf`;
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


  const toggleDayExpanded = (day: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(day)) {
      newExpanded.delete(day);
    } else {
      newExpanded.add(day);
    }
    setExpandedDays(newExpanded);
  };

  const getBookingStatusColor = (status: BookingStatus) => {
    switch (status) {
      case "Confirmed":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const calculateDuration = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end dates
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <Card className="p-8 text-center shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Itinerary not found
          </h3>
          <Button onClick={() => navigate("/itinerary")} className="mt-4">
            View All Itineraries
          </Button>
        </Card>
      </div>
    );
  }

  const itemsByDay = itemsByDayMap;

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Cover Image and Basic Info */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6 max-w-[95%] lg:max-w-[1600px]">
          <Card className="mb-6 overflow-hidden shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          {itinerary.ItineraryImageUrl && itinerary.ItineraryImageUrl.trim() !== '' && (
            <div className="h-64 w-full relative overflow-hidden">
              <img
                src={itinerary.ItineraryImageUrl}
                alt={itinerary.title}
                className="absolute inset-0 w-full h-full object-cover object-center"
                onError={(e) => {
                  // Hide image if it fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>
          )}

          <div className="p-6 sm:p-8">
            {editMode ? (
              <div className="space-y-8">
                {/* Title & Description - 2 Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      Title *
                    </Label>
                    <Input
                      value={editData.title || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, title: e.target.value })
                      }
                      className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
                      placeholder="Enter itinerary title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                      Description
                    </Label>
                    <textarea
                      value={editData.description || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, description: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm shadow-sm transition-all"
                      rows={3}
                      placeholder="Describe your itinerary..."
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-xs text-gray-500 font-medium">TRIP DETAILS</span>
                  </div>
                </div>

                {/* Trip Type, Destination City, Destination Country */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      Trip Type *
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between text-left h-11 border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 shadow-sm transition-all"
                        >
                          <span className="text-sm font-medium">{editData.tripType || "Select type"}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full shadow-lg">
                        {["Business", "Leisure", "Mixed", "Adventure", "Family"].map((type) => (
                          <DropdownMenuItem
                            key={type}
                            onClick={() => setEditData({ ...editData, tripType: type })}
                            className="cursor-pointer"
                          >
                            {type}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                      Destination City *
                    </Label>
                    <Input
                      value={editData.destinationCity || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, destinationCity: e.target.value })
                      }
                      className="h-11 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
                      placeholder="City"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                      Destination Country *
                    </Label>
                    <Input
                      value={editData.destinationCountry || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, destinationCountry: e.target.value })
                      }
                      className="h-11 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
                      placeholder="Country"
                    />
                  </div>
                </div>

                {/* Start Date, End Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      Start Date *
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600 pointer-events-none" />
                      <Input
                        type="date"
                        value={editData.startDate || ""}
                        onChange={(e) =>
                          setEditData({ ...editData, startDate: e.target.value })
                        }
                        className="pl-10 h-11 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      End Date *
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600 pointer-events-none" />
                      <Input
                        type="date"
                        value={editData.endDate || ""}
                        onChange={(e) =>
                          setEditData({ ...editData, endDate: e.target.value })
                        }
                        className="pl-10 h-11 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Cover Image Upload - Compact */}
                <div className="mb-6 p-4 bg-gradient-to-br from-gray-50 to-blue-50/50 rounded-xl border border-gray-200">
                  <Label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                    Cover Image (Optional)
                  </Label>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-32">
                      {coverImagePreview ? (
                        <div className="relative w-32 aspect-video rounded-xl overflow-hidden border-2 border-blue-300 shadow-md group">
                          <img
                            src={coverImagePreview}
                            alt="Cover preview"
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              // If image fails to load, hide it
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            onClick={handleRemoveCoverImage}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-gray-300 rounded-xl aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all shadow-sm"
                        >
                          <ImageIcon className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageChange}
                        className="hidden"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-3">
                      {!coverImagePreview && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 shadow-sm"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Choose Image
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateImage}
                            disabled={generatingImage || !itinerary?.title || !itinerary?.destinationCity || !itinerary?.destinationCountry}
                            className="border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 shadow-sm bg-gradient-to-r from-purple-50 to-pink-50"
                          >
                            {generatingImage ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate with AI
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                      {coverImagePreview && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-fit border-blue-300 text-blue-700 hover:bg-blue-500 hover:border-blue-400 shadow-sm"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Change Image
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Total Budget, Currency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                      Total Budget
                    </Label>
                    <Input
                      type="number"
                      value={editData.totalBudget || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, totalBudget: Number(e.target.value) })
                      }
                      className="h-11 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                      Currency
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between text-left h-11 border-gray-300 hover:border-blue-400 hover:bg-blue-400 shadow-sm transition-all"
                        >
                          <span className="text-sm font-medium">{editData.currency || "USD"}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full shadow-lg">
                        {["USD", "EUR", "GBP", "VND", "JPY", "KRW"].map((curr) => (
                          <DropdownMenuItem
                            key={curr}
                            onClick={() => setEditData({ ...editData, currency: curr })}
                            className="cursor-pointer"
                          >
                            {curr}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Template Category (if template) */}
                {editData.isTemplate && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                      Template Category
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between text-left h-11 border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 shadow-sm transition-all"
                        >
                          <span className="text-sm font-medium">{editData.templateCategory || "Other"}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full shadow-lg">
                        {["City Break", "Beach Holiday", "Adventure", "Cultural", "Road Trip", "Backpacking", "Luxury", "Family Friendly", "Romantic", "Food & Wine", "Other"].map((cat) => (
                          <DropdownMenuItem
                            key={cat}
                            onClick={() => setEditData({ ...editData, templateCategory: cat })}
                            className="cursor-pointer"
                          >
                            {cat}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex flex-wrap gap-6 p-4 bg-gradient-to-br from-gray-50 to-blue-50/50 rounded-xl border border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={editData.isPublic || false}
                      onChange={(e) =>
                        setEditData({ ...editData, isPublic: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-700">Make Public</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={editData.isTemplate || false}
                      onChange={(e) =>
                        setEditData({ ...editData, isTemplate: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-700">Save as Template</span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 ">
                  <Button 
                    onClick={handleSaveEdit} 
                    className="px-8 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditMode(false)}
                    className="h-12 px-8 text-base font-semibold border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-400 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {itinerary.title}
                    </h1>
                    <div className="flex gap-2 items-center">
                      <Badge className="text-sm">{itinerary.tripType || itinerary.purpose || "Leisure"}</Badge>
                      {itinerary.status && (
                        <Badge variant="outline" className="text-sm">
                          {itinerary.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/itinerary/${id}/statistics`)}
                      title="View Statistics"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditMode(true)}
                      title="Edit Details"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowShareModal(true)}
                      title="Share"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" title="Export">
                          <Download className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={handleExportPDF}>
                          Export as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => {
                          if (!id || !itinerary) return;
                          try {
                            const { exportToICal } = await import("../../../services/itineraryService");
                            const blob = await exportToICal(id);
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${itinerary.title}.ics`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            toast({
                              title: "✅ Success",
                              description: "iCal file exported successfully!",
                            });
                          } catch (error: any) {
                            toast({
                              title: "❌ Error",
                              description: error?.message || "Failed to export iCal file",
                              variant: "destructive",
                            });
                          }
                        }}>
                          Export to Calendar (iCal)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => {
                          if (!id || !itinerary) return;
                          try {
                            const { exportToJSON } = await import("../../../services/itineraryService");
                            const json = await exportToJSON(id);
                            const blob = new Blob([json], { type: "application/json" });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${itinerary.title}.json`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            toast({
                              title: "✅ Success",
                              description: "JSON file exported successfully!",
                            });
                          } catch (error: any) {
                            toast({
                              title: "❌ Error",
                              description: error?.message || "Failed to export JSON file",
                              variant: "destructive",
                            });
                          }
                        }}>
                          Export as JSON
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {itinerary.description && (
                  <p className="text-gray-600 mb-4">{itinerary.description}</p>
                )}

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Duration</div>
                      <div className="font-bold text-lg">
                        {calculateDuration(itinerary.startDate, itinerary.endDate)} days
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <MapPin className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Destination</div>
                      <div className="font-bold text-sm">
                        {itinerary.destinationCity || "N/A"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {itinerary.destinationCountry || ""}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Clock className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Dates</div>
                      <div className="font-semibold text-xs">
                        {formatDate(itinerary.startDate)}
                      </div>
                      <div className="text-xs text-gray-500">
                        to {formatDate(itinerary.endDate)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Budget</div>
                      {itinerary.totalBudget ? (
                        <div className="font-bold text-lg">
                          {itinerary.totalBudget.toLocaleString()} {itinerary.currency || "USD"}
                        </div>
                      ) : (
                        <div className="font-semibold text-gray-400">Not set</div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Additional Info */}
                <div className="mt-6 pt-6 border-t">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {itinerary.items && itinerary.items.length > 0 && (
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Places</div>
                        <div className="font-semibold">{itinerary.items.length} stops</div>
                      </div>
                    )}
                    
                    {(itinerary as any).totalEstimateCost !== undefined && (itinerary as any).totalEstimateCost > 0 && (
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Est. Cost</div>
                        <div className="font-semibold">
                          {(itinerary as any).totalEstimateCost.toLocaleString()} {itinerary.currency || "USD"}
                        </div>
                      </div>
                    )}
                    
                    {(itinerary as any).totalActualCost !== undefined && (itinerary as any).totalActualCost > 0 && (
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Actual Cost</div>
                        <div className="font-semibold text-green-600">
                          {(itinerary as any).totalActualCost.toLocaleString()} {itinerary.currency || "USD"}
                        </div>
                      </div>
                    )}
                    
                    {itinerary.createdAt && (
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Created</div>
                        <div className="font-semibold text-xs">
                          {formatDateTime(itinerary.createdAt)}
                        </div>
                      </div>
                    )}
                    
                    {itinerary.updatedAt && (
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Last Updated</div>
                        <div className="font-semibold text-xs">
                          {formatDateTime(itinerary.updatedAt)}
                        </div>
                      </div>
                    )}
                    
                    {(itinerary as any).completedAt && (
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Completed</div>
                        <div className="font-semibold text-xs text-green-600">
                          {formatDateTime((itinerary as any).completedAt)}
                        </div>
                      </div>
                    )}
                    
                    {(itinerary as any).templateCategory && (
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Category</div>
                        <div className="font-semibold">{(itinerary as any).templateCategory}</div>
                      </div>
                    )}
                    
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Visibility</div>
                      <div className="font-semibold">
                        {itinerary.isPublic ? "Public" : "Private"}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-6 max-w-[95%] lg:max-w-[1600px]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Day Selector */}
            <Card className="p-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <h3 className="font-semibold mb-4">Days</h3>
              <div className="space-y-2">
                {Array.from({ length: calculateDuration(itinerary.startDate, itinerary.endDate) }, (_, i) => i + 1).map(
                  (day) => (
                    <Button
                      key={day}
                      variant={selectedDay === day ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        setSelectedDay(day);
                        setExpandedDays(new Set([day]));
                      }}
                    >
                      Day {day}
                      <Badge variant="secondary" className="ml-auto">
                        {itemsByDay.get(day)?.length || 0}
                      </Badge>
                    </Button>
                  )
                )}
              </div>
            </Card>
          </div>

          {/* Main Content - Itinerary Items */}
          <div className="lg:col-span-3">
            {/* Header with Controls */}
            <div className="mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Schedule</h2>
                  {itinerary.status !== "Completed" && (
                      <Button onClick={() => setShowAddItem(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Place
                      </Button>
                  )}
              </div>

              {/* TrackAsia Controls */}
              {itinerary && itinerary.items && itinerary.items.length >= 2 && (
                <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Transport Mode Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Transport:</span>
                      <div className="flex gap-1">
                        {[
                          { mode: 'car' as const, icon: '🚗', label: 'Car' },
                          { mode: 'moto' as const, icon: '🏍️', label: 'Moto' },
                          { mode: 'walk' as const, icon: '🚶', label: 'Walk' }
                        ].map(({ mode, icon, label }) => (
                          <Button
                            key={mode}
                            size="sm"
                            variant={transportMode === mode ? "default" : "outline"}
                            onClick={() => setTransportMode(mode)}
                            className="h-8"
                          >
                            <span className="mr-1">{icon}</span>
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Optimize Button Hidden */}
                    {/* <Button
                      onClick={handleOptimizeRoute}
                      disabled={optimizing || itinerary.items.length < 2}
                      className="ml-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      size="sm"
                    >
                      {optimizing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Optimizing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Optimize Route
                        </>
                      )}
                    </Button> */}

                    {/* Calculating indicator */}
                    {calculatingDistances && (
                      <div className="ml-auto text-xs text-gray-600 flex items-center">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Calculating distances...
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {itemsByDay.size === 0 ? (
              <Card className="p-12 text-center shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No places added yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start building your itinerary by adding places to visit
                </p>
                <Button
                  onClick={() => setShowAddItem(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add Your First Place
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: calculateDuration(itinerary.startDate, itinerary.endDate) }, (_, i) => i + 1)
                  .filter((day) => itemsByDay.has(day))
                  .map((day) => {
                    const items = itemsByDay.get(day) || [];
                    const isExpanded = expandedDays.has(day);

                    return (
                      <Card key={day} className="overflow-hidden border-0 shadow-sm bg-white/90">
                        <div
                          className="px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 cursor-pointer hover:bg-blue-100 transition-colors"
                          onClick={() => toggleDayExpanded(day)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">
                                Day {day}
                              </h3>
                              <p className="text-xs text-gray-600">
                                {items.length} places
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-2 space-y-2">
                            {items.map((item, index) => {
                              const isDragging = draggedItem === item.itemId;
                              const isDraggedOver = draggedOverItem === item.itemId;
                              return (
                              <div key={item.itemId} className="space-y-2">
                              <div
                                draggable
                                onDragStart={() => handleDragStart(item.itemId)}
                                onDragOver={(e) => handleDragOver(e, item.itemId)}
                                onDragEnd={handleDragEnd}
                                onDrop={(e) => handleDrop(e, day, items, index)}
                                className={`relative flex gap-2 p-2 rounded-lg hover:shadow-sm transition-all duration-200 group bg-white/60 hover:bg-white/90 border border-transparent hover:border-gray-200/40 cursor-move ${
                                  isDragging ? "opacity-50" : ""
                                } ${
                                  isDraggedOver ? "border-blue-400 bg-blue-50" : ""
                                }`}
                                onClick={() => item.placeId && handlePlaceClick(item.placeId)}
                              >
                                {/* Order Number - Compact */}
                                <div className="flex flex-col items-center flex-shrink-0">
                                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                    {index + 1}
                                  </div>
                                  {index < items.length - 1 && (
                                    <div className="w-0.5 h-full bg-blue-200 my-1"></div>
                                  )}
                                </div>

                                {/* Place Image - Compact */}
                                {item.place?.imageUrl && (
                                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                                    <img
                                      src={item.place.imageUrl}
                                      alt={item.place.placeName}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}

                                {/* Item Content - Compact */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-sm text-gray-900 truncate">
                                        {item.place?.placeName || item.activityTitle || "Unknown Place"}
                                      </h4>
                                      {item.place?.address && (
                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                          {item.place.address}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 flex-shrink-0 hover:bg-blue-50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingItem(item);
                                          setShowEditItem(true);
                                        }}
                                        title="Edit item"
                                      >
                                        <Edit className="h-3 w-3 text-blue-600" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 flex-shrink-0 hover:bg-red-50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteItem(item.itemId);
                                        }}
                                        title="Delete item"
                                      >
                                        <Trash2 className="h-3 w-3 text-red-600" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Badges - Compact */}
                                  <div className="flex flex-wrap gap-1 mb-1.5">
                                    {item.bookingStatus && (
                                      <Badge
                                        className={`${getBookingStatusColor(item.bookingStatus)} text-xs px-1.5 py-0 hover:text-white`}
                                      >
                                        {item.bookingStatus}
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Info Grid - Compact */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 text-xs text-gray-600">
                                    {item.startTime && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                        <span className="truncate">
                                          {item.startTime.split(':').slice(0, 2).join(':')}
                                          {item.endTime && ` - ${item.endTime.split(':').slice(0, 2).join(':')}`}
                                        </span>
                                      </div>
                                    )}
                                    {item.durationMinutes && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                        <span>{item.durationMinutes} min</span>
                                      </div>
                                    )}
                                    {item.transportMethod && (
                                      <div className="flex items-center gap-1">
                                        <Navigation className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                        <span className="truncate">{item.transportMethod}</span>
                                      </div>
                                    )}
                                    {item.estimatedCost && (
                                      <div className="flex items-center gap-1">
                                        <DollarSign className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                        <span>${item.estimatedCost}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Place Additional Info */}
                                  {item.place?.placeDetail && (
                                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
                                      <div className="flex flex-wrap gap-2 text-xs">
                                        {/* Rating */}
                                        {item.place.placeDetail.averageRating > 0 && (
                                          <div className="flex items-center gap-1 text-amber-600">
                                            <Star className="h-3 w-3 fill-amber-600" />
                                            <span className="font-medium">{item.place.placeDetail.averageRating.toFixed(1)}</span>
                                            {item.place.placeDetail.totalReviews > 0 && (
                                              <span className="text-gray-500">({item.place.placeDetail.totalReviews})</span>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* Category */}
                                        {item.place.placeDetail.categoryName && (
                                          <div className="flex items-center gap-1 text-blue-600">
                                            <Tag className="h-3 w-3" />
                                            <span>{item.place.placeDetail.categoryName}</span>
                                          </div>
                                        )}
                                        
                                        {/* Price Level */}
                                        {item.place.placeDetail.priceLevel && item.place.placeDetail.priceLevel > 0 && (
                                          <div className="flex items-center gap-1 text-green-600">
                                            <DollarSign className="h-3 w-3" />
                                            <span>{"$".repeat(item.place.placeDetail.priceLevel)}</span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Operating Hours */}
                                      {item.place.placeDetail.openTime && item.place.placeDetail.closeTime && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                          <Clock className="h-3 w-3 text-gray-400" />
                                          <span>
                                            {convertUtcToLocalTime(item.place.placeDetail.openTime, localStorage.getItem('timezone'))} - {convertUtcToLocalTime(item.place.placeDetail.closeTime, localStorage.getItem('timezone'))}
                                          </span>
                                        </div>
                                      )}
                                      
                                      {/* Best Time to Visit */}
                                      {item.place.placeDetail.bestTimeToVisit && (
                                        <div className="flex items-center gap-1.5 text-xs text-green-600">
                                          <Calendar className="h-3 w-3" />
                                          <span>Best: {item.place.placeDetail.bestTimeToVisit}</span>
                                        </div>
                                      )}
                                      
                                      {/* Busy Time */}
                                      {item.place.placeDetail.busyTime && (
                                        <div className="flex items-center gap-1.5 text-xs text-orange-600">
                                          <Clock className="h-3 w-3" />
                                          <span>Busy: {item.place.placeDetail.busyTime}</span>
                                        </div>
                                      )}
                                      
                                      {/* Contact Info */}
                                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                        {item.place.placeDetail.phoneNumber && (
                                          <div className="flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            <span className="truncate">{item.place.placeDetail.phoneNumber}</span>
                                          </div>
                                        )}
                                        {item.place.placeDetail.websiteUrl && (
                                          <div className="flex items-center gap-1">
                                            <Globe className="h-3 w-3" />
                                            <span className="truncate max-w-[150px]">Website</span>
                                          </div>
                                        )}
                                        {item.place.placeDetail.email && (
                                          <div className="flex items-center gap-1">
                                            <Mail className="h-3 w-3" />
                                            <span className="truncate max-w-[150px]">{item.place.placeDetail.email}</span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Description */}
                                      {item.place.placeDetail.description && (
                                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                                          {item.place.placeDetail.description}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Activity Title/Description - Compact */}
                                  {item.activityTitle && item.activityTitle !== item.place?.placeName && (
                                    <div className="mt-1 text-xs text-gray-600">
                                      <span className="font-medium">{item.activityTitle}</span>
                                      {item.activityDescription && (
                                        <span className="text-gray-500 ml-1">• {item.activityDescription}</span>
                                      )}
                                    </div>
                                  )}

                                  {item.distanceFromPrevious && (
                                    <div className="mt-1 text-xs text-blue-600">
                                      <Navigation className="h-3 w-3 inline mr-1" />
                                      {item.distanceFromPrevious.toFixed(2)} km from previous
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Travel Segment to next item */}
                              {index < items.length - 1 && distances[`${item.itemId}-${items[index + 1].itemId}`] && (
                                <TravelSegment
                                  distance={distances[`${item.itemId}-${items[index + 1].itemId}`].distance}
                                  duration={distances[`${item.itemId}-${items[index + 1].itemId}`].duration}
                                  transportMethod={transportMode}
                                  className="my-2"
                                />
                              )}
                            </div>
                            );
                            })}
                          </div>
                        )}
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
        </div>

      {/* Modals */}
      {showAddItem && id && itinerary && (
        <AddItemModal
          itineraryId={id}
          totalDays={calculateDuration(itinerary.startDate, itinerary.endDate)}
          selectedDay={selectedDay}
          onClose={() => setShowAddItem(false)}
          onSuccess={() => {
            loadItinerary();
            setShowAddItem(false);
          }}
        />
      )}

      {/* Route Optimization Dialog */}
      {showOptimizationDialog && optimizationResult && itinerary && (
        <RouteOptimizationDialog
          open={showOptimizationDialog}
          onClose={() => setShowOptimizationDialog(false)}
          originalItems={itinerary.items || []}
          optimizedResult={optimizationResult}
          onApply={handleApplyOptimization}
          loading={applyingOptimization}
        />
      )}

      {showShareModal && id && (
        <ShareModal
          itineraryId={id}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showRouteOptimization && id && (
        <RouteOptimization
          itineraryId={id}
          onClose={() => setShowRouteOptimization(false)}
          onOptimized={() => {
            loadItinerary();
            setShowRouteOptimization(false);
          }}
        />
      )}

      {/* Edit Item Modal */}
      {showEditItem && editingItem && id && itinerary && (
        <EditItemModal
          item={editingItem}
          itineraryId={id}
          totalDays={calculateDuration(itinerary.startDate, itinerary.endDate)}
          onClose={() => {
            setShowEditItem(false);
            setEditingItem(null);
          }}
          onSuccess={() => {
            loadItinerary();
            setShowEditItem(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Place Detail Modal */}
      {showPlaceDetail && (
        <PlaceDetailModal
          isOpen={showPlaceDetail}
          onClose={() => {
            setShowPlaceDetail(false);
            setSelectedPlaceDetail(null);
          }}
          placeDetail={selectedPlaceDetail}
          isLoading={loadingPlaceDetail}
          isOwnerOverride={false}
        />
      )}
    </div>
  );
}



