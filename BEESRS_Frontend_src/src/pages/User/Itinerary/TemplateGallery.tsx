import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Clock,
  Star,
  Copy,
  Eye,
  TrendingUp,
  Globe,
  Lock,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { useToast } from "../../../components/ui/use-toast";
import type { Itinerary } from "../../../types/itinerary.types";
import {
  getPublicTemplates,
  getMyTemplates,
  useTemplate,
} from "../../../services/itineraryService";

export default function TemplateGallery() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"public" | "my">("public");
  const [publicTemplates, setPublicTemplates] = useState<Itinerary[]>([]);
  const [myTemplates, setMyTemplates] = useState<Itinerary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tripTypeFilter, setTripTypeFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize] = useState(12);

  useEffect(() => {
    loadTemplates();
  }, [activeTab, currentPage, searchQuery, tripTypeFilter, countryFilter]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const params = {
        Page: currentPage,
        PageSize: pageSize,
        ...(searchQuery && { Title: searchQuery }),
        ...(tripTypeFilter && tripTypeFilter !== "all" && { TripType: tripTypeFilter }),
        ...(countryFilter && { DestinationCountry: countryFilter }),
      };

      if (activeTab === "public") {
        const data = await getPublicTemplates(params);
        setPublicTemplates(data.items);
        setTotalItems(data.totalItems);
      } else {
        const data = await getMyTemplates(params);
        setMyTemplates(data.items);
        setTotalItems(data.totalItems);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      const newItinerary = await useTemplate(templateId);
      toast({
        title: "Success",
        description: "Template applied! You can now customize your itinerary",
      });
      // Navigate to detail page or list if no ID
      if (newItinerary?.itineraryId) {
        navigate(`/itinerary/${newItinerary.itineraryId}`);
      } else {
        navigate('/itinerary');
      }
    } catch (error) {
      console.error("Failed to use template:", error);
      toast({
        title: "Error",
        description: "Failed to use template",
        variant: "destructive",
      });
    }
  };

  const currentTemplates = activeTab === "public" ? publicTemplates : myTemplates;
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

  const calculateDuration = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  // Mock featured templates
  const featuredTemplates = [
    {
      title: "Weekend City Break",
      description: "Perfect 3-day city exploration itinerary",
      icon: "🏙️",
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Beach Paradise",
      description: "Relaxing 7-day beach vacation",
      icon: "🏖️",
      color: "from-yellow-500 to-orange-500",
    },
    {
      title: "Mountain Adventure",
      description: "Exciting 5-day hiking and camping",
      icon: "⛰️",
      color: "from-green-500 to-emerald-500",
    },
    {
      title: "Cultural Tour",
      description: "Immersive 10-day cultural experience",
      icon: "🏛️",
      color: "from-purple-500 to-pink-500",
    },
  ];

  return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Template Gallery
          </h1>
          <p className="text-gray-600">
            Start your journey with professionally crafted itineraries
          </p>
        </motion.div>

        {/* Featured Templates */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            Featured Templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredTemplates.map((template, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
            >
            <Card
              className="overflow-hidden cursor-pointer hover:shadow-xl transition-shadow group"
            >
                <div
                  className={`h-32 bg-gradient-to-br ${template.color} flex items-center justify-center text-6xl`}
                >
                  {template.icon}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {template.title}
                  </h3>
                  <p className="text-sm text-gray-600">{template.description}</p>
              </div>
            </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

        {/* Search and Filters */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 mb-6"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0 }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <div className="relative flex-1 sm:flex-initial sm:w-48">
            <Input
              placeholder="Filter by country..."
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Type: {tripTypeFilter === "all" ? "All" : tripTypeFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
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
        </motion.div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => { setActiveTab(v as "public" | "my"); setCurrentPage(1); }}
        >
          <TabsList className="mb-6">
            <TabsTrigger value="public" className="gap-2">
              <Globe className="h-4 w-4" />
              Public Templates ({activeTab === "public" ? totalItems : 0})
            </TabsTrigger>
            <TabsTrigger value="my" className="gap-2">
              <Lock className="h-4 w-4" />
              My Templates ({activeTab === "my" ? totalItems : 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  </Card>
                ))}
              </div>
            ) : currentTemplates.length === 0 ? (
              <Card className="p-12 text-center">
                <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No templates found
                </h3>
                <p className="text-gray-600 mb-6">
                  {activeTab === "public"
                    ? "Try adjusting your search filters"
                    : "Create an itinerary and save it as a template"}
                </p>
                {activeTab === "my" && (
                  <Button
                    onClick={() => navigate("/itinerary/create")}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    Create New Itinerary
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentTemplates.map((template) => (
                  <Card
                    key={template.itineraryId}
                    className="overflow-hidden hover:shadow-xl transition-shadow group p-0 gap-0"
                  >
                    {/* Cover Image */}
                    <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 relative overflow-hidden rounded-t-xl">
                      {template.ItineraryImageUrl && template.ItineraryImageUrl.trim() !== '' ? (
                        <img
                          src={template.ItineraryImageUrl}
                          alt={template.title}
                          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-300"
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
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-yellow-500 text-white">
                          Template
                        </Badge>
                      </div>
                      {template.isPublic && (
                        <div className="absolute top-4 left-4">
                          <Globe className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="mb-3">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                          {template.title}
                        </h3>
                        <div className="flex gap-2">
                          <Badge className={getTripTypeColor(template.tripType || "Leisure")}>
                            {template.tripType || "Leisure"}
                          </Badge>
                          {template.templateCategory && (
                            <Badge variant="outline" className="text-xs">
                              {template.templateCategory}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {template.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {template.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-4 py-4 border-y">
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Calendar className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="text-sm font-semibold">
                            {calculateDuration(template.startDate, template.endDate)}d
                          </div>
                          <div className="text-xs text-gray-500">Days</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="text-sm font-semibold">
                            {template.destinationCity || "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">Destination</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            navigate(`/itinerary/${template.itineraryId}`)
                          }
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                          onClick={() =>
                            handleUseTemplate(template.itineraryId)
                          }
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Use Template
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && currentTemplates.length > 0 && totalPages > 1 && (
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

        {/* Info Section */}
        <Card className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Why Use Templates?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Save Time
                </h4>
                <p className="text-sm text-gray-600">
                  Start with pre-planned itineraries and customize to your needs
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Star className="h-5 w-5" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Expert Curated
                </h4>
                <p className="text-sm text-gray-600">
                  Created by experienced travelers and local experts
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Proven Routes
                </h4>
                <p className="text-sm text-gray-600">
                  Optimized routes that maximize your travel experience
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

