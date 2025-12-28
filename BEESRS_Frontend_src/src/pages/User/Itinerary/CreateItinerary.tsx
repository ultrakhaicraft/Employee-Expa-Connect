import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, X, Upload, Image as ImageIcon, Sparkles, Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Card } from "../../../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { useToast } from "../../../components/ui/use-toast";
import type {
  CreateItineraryRequest,
} from "../../../types/itinerary.types";
import {
  createItinerary,
  createItineraryAsTemplate,
  uploadItineraryCoverImage,
  generateItineraryCoverImage,
} from "../../../services/itineraryService";
import { branchService, type Country, type City } from "../../../services/branchService";
import { getCurrentUser } from "../../../services/userService";

export default function CreateItinerary() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateCategory, setTemplateCategory] = useState("Other");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dateErrors, setDateErrors] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateItineraryRequest>({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    tripType: "Leisure",
    destinationCity: "",
    destinationCountry: "",
    totalBudget: undefined,
    currency: "USD",
    isPublic: false,
    status: "Planning",
    itineraryItems: [],
  });

  // Load user profile and get country/city from current branch
  useEffect(() => {
    let isMounted = true;
    const initializeForm = async () => {
      try {
        // Load user profile to get current branch ID
        const user = await getCurrentUser().catch(() => null);
        
        if (!isMounted || !user) return;

        // Get current branch ID from user
        const currentBranchId = (user as any).currentBranchId || (user as any).CurrentBranchId;

        // If we have branch ID, get branch details
        if (currentBranchId && currentBranchId !== '00000000-0000-0000-0000-000000000000') {
          try {
            const branch = await branchService.getBranchById(currentBranchId);
            if (branch && branch.countryName && branch.cityName) {
              // Set country and city from branch
              setFormData(prev => ({
                ...prev,
                destinationCountry: branch.countryName,
                destinationCity: branch.cityName,
              }));

              // Load countries to find country ID
              const countriesData = await branchService.getCountriesWithBranches();
              if (!isMounted) return;
              
              setCountries(countriesData);
              
              const country = countriesData.find(
                c => c.name === branch.countryName
              );
              
              if (country) {
                setSelectedCountryId(country.countryId);
                
                // Load cities for this country
                const citiesData = await branchService.getCitiesWithBranches(country.countryId);
                if (!isMounted) return;
                setCities(citiesData);
              }
              return; // Successfully set from branch
            }
          } catch (branchError) {
            console.error('Failed to load branch:', branchError);
            // Fall through to use CurrentLocation as fallback
          }
        }

        // Fallback: Use CurrentLocationCountry/City if branch not available
        // Handle both camelCase and PascalCase property names
        const userProfile = user?.profile || (user as any)?.Profile;
        const userCountry = userProfile?.CurrentLocationCountry || userProfile?.currentLocationCountry;
        const userCity = userProfile?.CurrentLocationCity || userProfile?.currentLocationCity;

        if (userCountry || userCity) {
          // Load countries
          setLoadingCountries(true);
          const countriesData = await branchService.getCountriesWithBranches();
          
          if (!isMounted) return;

          setCountries(countriesData);

          // Set country if available
          if (userCountry) {
            setFormData(prev => ({
              ...prev,
              destinationCountry: userCountry,
            }));

            const country = countriesData.find(
              c => c.name === userCountry
            );
            
            if (country) {
              setSelectedCountryId(country.countryId);
              
              // Load cities for this country
              const citiesData = await branchService.getCitiesWithBranches(country.countryId);
              
              if (!isMounted) return;
              
              setCities(citiesData);
            }
          }

          // Set city if available (regardless of whether country was found)
          if (userCity) {
            setFormData(prev => ({
              ...prev,
              destinationCity: userCity,
            }));
          }
        }
      } catch (error: any) {
        if (isMounted) {
          console.error('Failed to initialize form:', error);
          toast({
            title: "Error",
            description: error.response?.data?.message || "Failed to load destination information. Please refresh the page.",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setLoadingCountries(false);
        }
      }
    };
    
    initializeForm();
    return () => {
      isMounted = false;
    };
  }, []); // Only run once on mount

  // Load cities when country is manually selected (if user changes country)
  useEffect(() => {
    if (!selectedCountryId) {
      return;
    }
    
    // Skip if this is the initial load (handled in initializeForm)
    if (formData.destinationCountry && formData.destinationCity) {
      return;
    }
    
    let isMounted = true;
    const loadCities = async () => {
      try {
        const citiesData = await branchService.getCitiesWithBranches(selectedCountryId);
        if (isMounted) {
          setCities(citiesData);
        }
      } catch (error: any) {
        if (isMounted) {
          console.error('Failed to load cities:', error);
        }
      }
    };
    loadCities();
    return () => {
      isMounted = false;
    };
  }, [selectedCountryId, formData.destinationCountry, formData.destinationCity]);

  const handleInputChange = (
    field: keyof CreateItineraryRequest,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Validate dates in real-time
    if (field === "startDate" || field === "endDate") {
      validateDates(field === "startDate" ? value as string : formData.startDate, 
                   field === "endDate" ? value as string : formData.endDate);
    }
  };

  const validateDates = (startDate: string, endDate: string) => {
    const errors: { startDate?: string; endDate?: string } = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only

    // Validate Start Date
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      // Start date cannot be in the past
      if (start < today) {
        errors.startDate = "Start date cannot be in the past";
      }

      // If end date is already set, check if start date is after end date
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        if (start > end) {
          errors.startDate = "Start date must be before or equal to end date";
        }
      }
    }

    // Validate End Date
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);

      // End date cannot be in the past
      if (end < today) {
        errors.endDate = "End date cannot be in the past";
      }

      // If start date is set, check if end date is before start date
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (end < start) {
          errors.endDate = "End date must be after or equal to start date";
        }
      }
    }

    setDateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }

      setCoverImageFile(file);
      // Create preview
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerateImage = async () => {
    // Validate required fields for image generation
    if (!formData.title || !formData.destinationCity || !formData.destinationCountry) {
      toast({
        title: "Missing Information",
        description: "Please fill in title, destination city, and country to generate an image.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingImage(true);
    try {
      const imageUrl = await generateItineraryCoverImage({
        title: formData.title,
        description: formData.description,
        tripType: formData.tripType,
        destinationCity: formData.destinationCity,
        destinationCountry: formData.destinationCountry,
      });

      setCoverImagePreview(imageUrl);
      setCoverImageFile(null); // No file, just URL
      
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

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a trip title",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.destinationCity.trim() || !formData.destinationCountry.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select destination city and country",
        variant: "destructive",
      });
      return false;
    }

    // Validate that selected city/country has branches
    const country = countries.find(c => c.name === formData.destinationCountry);
    const city = cities.find(c => c.name === formData.destinationCity);
    
    if (!country || !city) {
      toast({
        title: "Validation Error",
        description: "Selected destination must have branches in the system",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.startDate || !formData.endDate) {
      toast({
        title: "Validation Error",
        description: "Please select start and end dates",
        variant: "destructive",
      });
      return false;
    }

    // Validate dates with detailed checks
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    // Check if start date is in the past
    if (startDate < today) {
      toast({
        title: "Validation Error",
        description: "Start date cannot be in the past",
        variant: "destructive",
      });
      return false;
    }

    // Check if end date is in the past
    if (endDate < today) {
      toast({
        title: "Validation Error",
        description: "End date cannot be in the past",
        variant: "destructive",
      });
      return false;
    }

    // Check if end date is before start date
    if (endDate < startDate) {
      toast({
        title: "Validation Error",
        description: "End date must be after or equal to start date",
        variant: "destructive",
      });
      return false;
    }

    // Check if there are any date errors from real-time validation
    if (dateErrors.startDate || dateErrors.endDate) {
      toast({
        title: "Validation Error",
        description: dateErrors.startDate || dateErrors.endDate || "Please fix date errors",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (asTemplate: boolean = false) => {
    if (!validateForm()) return;

    // If saving as template, show modal first
    if (asTemplate) {
      setShowTemplateModal(true);
      return;
    }

    setLoading(true);
    try {
      // Upload cover image to Cloudinary if provided, or use generated image URL
      let coverImageUrl: string | undefined = undefined;
      
      // If we have a generated image URL (from AI), use it directly
      if (coverImagePreview && !coverImageFile) {
        coverImageUrl = coverImagePreview;
      }
      // If we have a file to upload, upload it
      else if (coverImageFile) {
        try {
          coverImageUrl = await uploadItineraryCoverImage(coverImageFile);
        } catch (uploadError: any) {
          console.error("Failed to upload cover image:", uploadError);
          toast({
            title: "Upload Error",
            description: uploadError.message || "Failed to upload cover image. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }
      // If no image provided, try to generate one automatically
      else if (formData.title && formData.destinationCity && formData.destinationCountry) {
        try {
          toast({
            title: "Generating Image...",
            description: "Creating an AI-generated cover image for your itinerary.",
          });
          coverImageUrl = await generateItineraryCoverImage({
            title: formData.title,
            description: formData.description,
            tripType: formData.tripType,
            destinationCity: formData.destinationCity,
            destinationCountry: formData.destinationCountry,
          });
          toast({
            title: "✨ Image Generated!",
            description: "AI-generated cover image has been created.",
          });
        } catch (generateError: any) {
          console.error("Failed to generate image:", generateError);
          // Continue without image if generation fails
          toast({
            title: "Image Generation Skipped",
            description: "Continuing without cover image. You can add one later.",
            variant: "default",
          });
        }
      }

      const dataToSubmit: CreateItineraryRequest = {
        title: formData.title,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        tripType: formData.tripType,
        destinationCity: formData.destinationCity,
        destinationCountry: formData.destinationCountry,
        totalBudget: formData.totalBudget,
        currency: formData.currency || "USD",
        isPublic: formData.isPublic || false,
        status: formData.status || "Planning",
        ItineraryImageUrl: coverImageUrl, // Add cover image URL
        itineraryItems: [],
      };

      const newItinerary = await createItinerary(dataToSubmit);

      toast({
        title: "Success",
        description: "Itinerary created successfully!",
      });

      // Navigate to detail page or list if no ID
      if (newItinerary?.itineraryId) {
        navigate(`/itinerary/${newItinerary.itineraryId}`);
      } else {
        navigate('/itinerary');
      }
    } catch (error) {
      console.error("Failed to create itinerary:", error);
      toast({
        title: "Error",
        description: "Failed to create itinerary",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    setLoading(true);
    setShowTemplateModal(false);
    
    try {
      // Upload cover image to Cloudinary if provided, or use generated image URL
      let coverImageUrl: string | undefined = undefined;
      
      // If we have a generated image URL (from AI), use it directly
      if (coverImagePreview && !coverImageFile) {
        coverImageUrl = coverImagePreview;
      }
      // If we have a file to upload, upload it
      else if (coverImageFile) {
        try {
          coverImageUrl = await uploadItineraryCoverImage(coverImageFile);
        } catch (uploadError: any) {
          console.error("Failed to upload cover image:", uploadError);
          toast({
            title: "Upload Error",
            description: uploadError.message || "Failed to upload cover image. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }
      // If no image provided, try to generate one automatically
      else if (formData.title && formData.destinationCity && formData.destinationCountry) {
        try {
          toast({
            title: "Generating Image...",
            description: "Creating an AI-generated cover image for your itinerary.",
          });
          coverImageUrl = await generateItineraryCoverImage({
            title: formData.title,
            description: formData.description,
            tripType: formData.tripType,
            destinationCity: formData.destinationCity,
            destinationCountry: formData.destinationCountry,
          });
          toast({
            title: "✨ Image Generated!",
            description: "AI-generated cover image has been created.",
          });
        } catch (generateError: any) {
          console.error("Failed to generate image:", generateError);
          // Continue without image if generation fails
          toast({
            title: "Image Generation Skipped",
            description: "Continuing without cover image. You can add one later.",
            variant: "default",
          });
        }
      }

      const dataToSubmit: CreateItineraryRequest = {
        title: formData.title,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        tripType: formData.tripType,
        destinationCity: formData.destinationCity,
        destinationCountry: formData.destinationCountry,
        totalBudget: formData.totalBudget,
        currency: formData.currency || "USD",
        isPublic: formData.isPublic || false,
        templateCategory: templateCategory,
        status: formData.status || "Planning",
        ItineraryImageUrl: coverImageUrl, // Add cover image URL
        itineraryItems: [],
      };

      const newItinerary = await createItineraryAsTemplate(dataToSubmit);

      toast({
        title: "Success",
        description: "Itinerary template created successfully!",
      });

      // Navigate to detail page or list if no ID
      if (newItinerary?.itineraryId) {
        navigate(`/itinerary/${newItinerary.itineraryId}`);
      } else {
        navigate('/itinerary');
      }
    } catch (error) {
      console.error("Failed to create template:", error);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const days = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      return days > 0 ? days : 0;
    }
    return 0;
  };

  const tripTypes = ["Business", "Leisure", "Mixed", "Adventure", "Family"];
  const currencies = ["USD", "EUR", "GBP", "VND", "JPY", "KRW"];
  const templateCategories = ["City Break", "Beach Holiday", "Adventure", "Cultural", "Road Trip", "Backpacking", "Luxury", "Family Friendly", "Romantic", "Food & Wine", "Other"];

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto max-w-[95%] lg:max-w-[1600px]">
          {/* Header */}
          <motion.div 
            className="mb-6 px-4 sm:px-6 lg:px-8 pt-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                Create New Trip
              </h1>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="px-4 sm:px-6 lg:px-8 pb-6"
        >
        <Card className="p-6 sm:p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(false);
            }}
          >
            {/* Trip Title & Description - 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  Trip Title *
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Weekend in Bangkok"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                  Description (Optional)
                </Label>
                <textarea
                  id="description"
                  placeholder="Tell us about your trip..."
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm shadow-sm transition-all"
                  rows={3}
                />
              </div>
            </div>

            {/* Cover Image Upload - Compact */}
            <div className="mb-8 p-4 bg-gradient-to-br from-gray-50 to-blue-50/50 rounded-xl border border-gray-200">
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
                      className="border-2 border-dashed border-gray-300 rounded-xl aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all shadow-sm"
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
                        className="border-indigo-300 text-indigo-700 hover:bg-indigo-300 hover:border-indigo-400 shadow-sm"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Image
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateImage}
                        disabled={generatingImage || !formData.title || !formData.destinationCity || !formData.destinationCountry}
                        className="border-purple-300 text-purple-700 hover:bg-purple-300 hover:text-purple-900 hover:border-purple-400 shadow-sm bg-gradient-to-r from-purple-50 to-pink-50"
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
                      className="w-fit border-indigo-300 text-indigo-700 hover:bg-indigo-300 hover:border-indigo-400 shadow-sm"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Change Image
                    </Button>
                  )}
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/50 transition-colors">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <Label htmlFor="isPublic" className="cursor-pointer text-sm text-gray-700">
                      Make this itinerary public
                    </Label>
                  </div>
                  {calculateDays() > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border border-blue-200">
                      <Calendar className="h-4 w-4 text-blue-700" />
                      <span className="font-semibold text-sm text-blue-900">
                        Duration: {calculateDays()} days
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-xs text-gray-500 font-medium">TRIP DETAILS</span>
              </div>
            </div>

            {/* Trip Type & Destination - 3 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                      className="w-full justify-between text-left h-11 border-gray-300 hover:border-indigo-400 hover:bg-indigo-300 shadow-sm transition-all"
                    >
                      <span className="text-sm font-medium">{formData.tripType}</span>
                      <MapPin className="h-4 w-4 text-white-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full shadow-lg">
                    {tripTypes.map((type) => (
                      <DropdownMenuItem
                        key={type}
                        onClick={() => handleInputChange("tripType", type)}
                        className="cursor-pointer"
                      >
                        {type}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationCountry" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                  Destination Country *
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between text-left h-11 border-gray-300 hover:border-indigo-400 hover:bg-indigo-300 shadow-sm transition-all"
                      disabled={loadingCountries}
                    >
                      <span className="text-sm font-medium">
                        {formData.destinationCountry || "Select country"}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full shadow-lg max-h-60 overflow-y-auto">
                    {loadingCountries ? (
                      <DropdownMenuItem disabled>Loading countries...</DropdownMenuItem>
                    ) : countries.length === 0 ? (
                      <DropdownMenuItem disabled>No countries with branches found</DropdownMenuItem>
                    ) : (
                      countries.map((country) => (
                      <DropdownMenuItem
                        key={country.countryId}
                        onClick={() => {
                          setSelectedCountryId(country.countryId);
                          setFormData(prev => ({ 
                            ...prev, 
                            destinationCountry: country.name,
                            destinationCity: "" // Reset city when country changes
                          }));
                        }}
                        className="cursor-pointer"
                      >
                        {country.name}
                      </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationCity" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                  Destination City *
                </Label>
                <Input
                  id="destinationCity"
                  value={formData.destinationCity}
                  onChange={(e) => setFormData(prev => ({ ...prev, destinationCity: e.target.value }))}
                  placeholder={formData.destinationCity ? "" : "Auto-filled from your current location"}
                  className={formData.destinationCity ? "" : "bg-gray-50"}
                />
                <p className="text-xs text-gray-500">
                  {formData.destinationCity 
                    ? "You can edit this field. To change default, update your profile."
                    : "Based on your current location. To change, update your profile."}
                </p>
              </div>
            </div>

            {/* Dates - 2 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <Label
                  htmlFor="startDate"
                  className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Start Date *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600 pointer-events-none" />
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      handleInputChange("startDate", e.target.value)
                    }
                    min={new Date().toISOString().split('T')[0]} // Cannot select past dates
                    className={`pl-10 h-11 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all ${
                      dateErrors.startDate ? "border-red-500 focus:ring-red-500/20" : ""
                    }`}
                    required
                  />
                </div>
                {dateErrors.startDate && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <span>⚠</span> {dateErrors.startDate}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="endDate"
                  className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4 text-blue-600" />
                  End Date *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600 pointer-events-none" />
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      handleInputChange("endDate", e.target.value)
                    }
                    min={
                      formData.startDate 
                        ? formData.startDate 
                        : new Date().toISOString().split('T')[0]
                    } // Cannot be before start date or today
                    className={`pl-10 h-11 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all ${
                      dateErrors.endDate ? "border-red-500 focus:ring-red-500/20" : ""
                    }`}
                    required
                  />
                </div>
                {dateErrors.endDate && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <span>⚠</span> {dateErrors.endDate}
                  </p>
                )}
              </div>
            </div>

            {/* Budget & Currency - 2 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <Label htmlFor="totalBudget" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                  Total Budget (Optional)
                </Label>
                <Input
                  id="totalBudget"
                  type="number"
                  min="0"
                  placeholder="e.g., 1000"
                  value={formData.totalBudget || ""}
                  onChange={(e) => setFormData({...formData, totalBudget: e.target.value ? parseFloat(e.target.value) : undefined})}
                  className="h-11 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
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
                      className="w-full justify-between text-left h-11 border-gray-300 hover:border-indigo-400 hover:bg-indigo-300 shadow-sm transition-all"
                    >
                      <span className="text-sm font-medium">{formData.currency}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full shadow-lg">
                    {currencies.map((curr) => (
                      <DropdownMenuItem
                        key={curr}
                        onClick={() => handleInputChange("currency", curr)}
                        className="cursor-pointer"
                      >
                        {curr}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>


            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-2">
              <Button
                type="submit"
                className="w-auto px-8 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span> Creating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Create Itinerary
                  </span>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="h-12 px-8 text-base font-semibold border-2 border-gray-300 hover:border-indigo-400 hover:bg-indigo-300 shadow-md hover:shadow-lg transition-all duration-200"
              >
                Save as Template
              </Button>
            </div>
          </form>
        </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="px-4 sm:px-6 lg:px-8 pb-6"
        >
        <Card className="mt-6 p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200/50 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-bold text-base text-gray-900">Next Steps</h3>
          </div>
          <ul className="space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">1</span>
              <span className="pt-0.5">Create your basic itinerary information</span>
            </li>
            <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">2</span>
              <span className="pt-0.5">Add destinations and schedule activities</span>
            </li>
            <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">3</span>
              <span className="pt-0.5">Optimize your route for best travel experience</span>
            </li>
            <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">4</span>
              <span className="pt-0.5">Share with friends or export for offline use</span>
            </li>
          </ul>
        </Card>
        </motion.div>
      </div>

      {/* Template Category Modal */}
      <AnimatePresence>
        {showTemplateModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTemplateModal(false)}
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    Save as Template
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTemplateModal(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold mb-2 block">
                      Template Category *
                    </Label>
                    <p className="text-sm text-gray-600 mb-3">
                      Choose a category that best describes this itinerary template
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between text-left h-12"
                        >
                          <span>{templateCategory}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        {templateCategories.map((category) => (
                          <DropdownMenuItem
                            key={category}
                            onClick={() => setTemplateCategory(category)}
                          >
                            {category}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <Button
                      onClick={handleCreateTemplate}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      disabled={loading}
                    >
                      {loading ? "Creating..." : "Create Template"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowTemplateModal(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

