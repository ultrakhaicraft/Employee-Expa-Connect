import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { GetAllPlaces, DeletePlace } from "@/services/moderatorService";
import type { ModeratorPlaceSummary, PaginatedModeratorPlaces } from "@/services/moderatorService";
import { ViewDetailPlace } from "@/services/userService";
import { useToast } from "@/components/ui/use-toast";
import { convertUtcToLocalTime } from "@/utils/timezone";
import {
  Eye,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

interface PlaceDetail extends Partial<ModeratorPlaceSummary> {
  description?: string;
  address?: string;
  addressLine1?: string;
  city?: string;
  stateProvince?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  websiteUrl?: string;
  openingHours?: string;
  openTime?: string;
  closeTime?: string;
  googlePlaceId?: string;
  bestTimeToVisit?: string;
  busyTime?: string;
  suitableFor?: string;
  totalLikes?: number;
  totalReviews?: number;
  imageUrls?: { imageId?: string; imageUrl: string; altText?: string }[];
}

function ViewAllPlaces() {
  const { toast } = useToast();
  const notify = useCallback(
    (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => {
      toast(opts);
      // bridge event for global listener if local toaster is missing
      try {
        window.dispatchEvent(new CustomEvent("app:toast", { detail: opts }));
      } catch {}
    },
    [toast]
  );
  const [data, setData] = useState<PaginatedModeratorPlaces>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    items: [],
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<PlaceDetail | null>(null);

  const [previewImages, setPreviewImages] = useState<PlaceDetail["imageUrls"]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<ModeratorPlaceSummary | null>(null);

  const totalPages = useMemo(() => {
    if (data.pageSize === 0) return 1;
    return Math.max(1, Math.ceil(data.totalItems / data.pageSize));
  }, [data.totalItems, data.pageSize]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    data.items.forEach((i) => i.categoryName && set.add(i.categoryName));
    return Array.from(set).sort();
  }, [data.items]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>();
    data.items.forEach((i) => i.verificationStatus && set.add(i.verificationStatus));
    return Array.from(set).sort();
  }, [data.items]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.items.filter((item) => {
      const matchSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        (item.categoryName || "").toLowerCase().includes(term);
      const matchCategory = categoryFilter === "all" || item.categoryName === categoryFilter;
      const matchStatus = statusFilter === "all" || item.verificationStatus === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [data.items, search, categoryFilter, statusFilter]);

  const fetchPlaces = useCallback(
    async (pageToFetch = page, pageSizeToFetch = pageSize) => {
      setLoading(true);
      setError(null);
      const payloadSearch = search.trim();
      try {
        const response = await GetAllPlaces({
          page: pageToFetch,
          pageSize: pageSizeToFetch,
          search: payloadSearch,
        });
        setData(response);
        setPage(response.page || pageToFetch);
        setPageSize(response.pageSize || pageSizeToFetch);
      } catch (err: any) {
        setError(err?.message || "Failed to load places");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, search]
  );

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const handleSearch = () => {
    setPage(1);
    fetchPlaces(1, pageSize);
  };

  const handleViewDetail = async (placeId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const result = await ViewDetailPlace({ placeId });
      if (result) {
        setDetail(result);
      } else {
        setDetail(null);
        notify({
          variant: "destructive",
          title: "Detail unavailable",
          description: "Could not fetch detail for this place.",
        });
      }
    } catch (err: any) {
      notify({
        variant: "destructive",
        title: "Detail unavailable",
        description: err?.message || "Could not fetch detail for this place.",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (placeId: string) => {
    try {
      const resp = await DeletePlace(placeId);
      const successMessage =
        (resp as any)?.message ||
        (resp as any)?.statusMessage ||
        (resp as any)?.data?.message ||
        "The place has been deleted successfully.";
      notify({
        title: "Place removed",
        description: successMessage,
      });
      await fetchPlaces();
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Unable to delete this place.";
      notify({
        variant: "destructive",
        title: "Delete failed",
        description: errorMessage,
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleChangePage = (direction: "prev" | "next") => {
    const nextPage = direction === "next" ? page + 1 : page - 1;
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
    fetchPlaces(nextPage, pageSize);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
    fetchPlaces(1, size);
  };

  const getPriceLevel = (level?: number | null) => {
    if (!level) return "Not specified";
    const priceLevels = ["", "Cheap", "Fair", "Moderate", "Expensive", "Luxury"];
    return priceLevels[level] || "Not specified";
  };

  const getTagList = (value?: string | null) => {
    if (!value) return [];
    return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.dataset.fallbackApplied === "true") return;
    target.dataset.fallbackApplied = "true";
    target.src = "/placeholder.jpg";
  };

  const openPreview = (images: PlaceDetail["imageUrls"] = [], idx = 0) => {
    if (!images.length) return;
    setPreviewImages(images);
    setPreviewIndex(idx);
  };

  const closePreview = () => {
    setPreviewImages([]);
    setPreviewIndex(0);
  };

  const goPreview = (direction: "prev" | "next") => {
    if (!previewImages || previewImages.length <= 1) return;
    setPreviewIndex((prev) => {
      const next = direction === "next" ? prev + 1 : prev - 1;
      if (next < 0) return previewImages.length - 1;
      if (next >= previewImages.length) return 0;
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                All Places
              </CardTitle>
              <CardDescription>
                Track every place in the system. Search, review details, or remove entries in one view.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              Total: {data.totalItems}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full max-w-xl items-center gap-2">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by place name..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </Button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Category</span>
                <select
                  className="rounded-md border px-3 py-1.5 text-sm focus:outline-none"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  {uniqueCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span>Status</span>
                <select
                  className="rounded-md border px-3 py-1.5 text-sm focus:outline-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  {uniqueStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span>Rows</span>
                <select
                  className="rounded-md border px-3 py-1.5 text-sm focus:outline-none"
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                >
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Place</TableHead>
                  <TableHead className="min-w-[150px]">Category</TableHead>
                  <TableHead className="min-w-[140px]">Coordinates</TableHead>
                  <TableHead className="min-w-[90px]">Price</TableHead>
                  <TableHead className="min-w-[120px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Rating</TableHead>
                  <TableHead className="min-w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading places...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No places found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((place) => (
                    <TableRow key={place.placeId}>
                      <TableCell className="font-semibold">
                        <div className="flex flex-col">
                          <span className="text-gray-900">{place.name}</span>
                          <span className="text-xs text-muted-foreground">ID: {place.placeId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{place.categoryName}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 text-blue-500" />
                          <span>
                            {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="flex w-fit items-center gap-1">
                          {getPriceLevel(place.priceLevel ?? null)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            place.verificationStatus === "Pending"
                              ? "bg-yellow-100 text-amber-900 border-yellow-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          }
                          variant="secondary"
                        >
                          {place.verificationStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                          {place.averageRating?.toFixed(1) ?? "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetail(place.placeId)}
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          <AlertDialog open={deleteTarget?.placeId === place.placeId} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteTarget(place)}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this place?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. The place will be removed from the system.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(place.placeId)}>
                                  Confirm delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
            <div>
              Showing {(data.page - 1) * data.pageSize + 1} -{" "}
              {Math.min(data.page * data.pageSize, data.totalItems)} of {data.totalItems} places
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleChangePage("prev")}
                disabled={page <= 1 || loading}
              >
                Previous
              </Button>
              <span className="px-3 py-1 rounded-md bg-muted text-foreground">
                Page {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleChangePage("next")}
                disabled={page >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl sm:max-w-5xl max-h-[90vh] p-0">
          <div className="flex flex-col max-h-[90vh]">
            <div className="flex-shrink-0 px-6 pt-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  Place detail
                </DialogTitle>
                <DialogDescription>Full information of the selected place.</DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide">
              {detailLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Loading detail...
                </div>
              ) : detail ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Place name</p>
                    <p className="text-lg font-semibold text-gray-900">{detail.name}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Category</p>
                      <p className="text-sm font-medium">{detail.categoryName || "N/A"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge variant="secondary">{detail.verificationStatus || "Unknown"}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Coordinates</p>
                      <p className="text-sm text-muted-foreground">
                        {detail.latitude?.toFixed(4)}, {detail.longitude?.toFixed(4)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                      <p className="text-sm font-medium">{detail.averageRating ?? "N/A"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Google Place ID</p>
                      <p className="text-sm break-all">{detail.googlePlaceId || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Price level</p>
                      <p className="text-sm">{getPriceLevel(detail.priceLevel ?? null)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="text-sm">
                        {detail.addressLine1 || detail.address || "Not provided"}
                        {detail.city || detail.stateProvince ? (
                          <span className="text-muted-foreground block">
                            {[detail.city, detail.stateProvince].filter(Boolean).join(", ")}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm">{detail.phoneNumber || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Website</p>
                      <p className="text-sm">
                        {detail.website ? (
                          <a
                            href={detail.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline"
                          >
                            {detail.website}
                          </a>
                        ) : (
                          "Not provided"
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Opening hours</p>
                      <p className="text-sm">
                        {detail.openTime || detail.closeTime
                          ? `${convertUtcToLocalTime(detail.openTime, localStorage.getItem('timezone')) || "N/A"} - ${convertUtcToLocalTime(detail.closeTime, localStorage.getItem('timezone')) || "N/A"}`
                          : detail.openingHours || "Not provided"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Engagement</p>
                      <p className="text-sm text-muted-foreground">
                        Rating: {detail.averageRating ?? "N/A"} • Reviews: {detail.totalReviews ?? 0} • Likes:{" "}
                        {detail.totalLikes ?? 0}
                      </p>
                    </div>
                  </div>

                  {(detail.bestTimeToVisit || detail.busyTime || getTagList(detail.suitableFor).length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Best time</p>
                        <p className="text-sm">{detail.bestTimeToVisit || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Busy time</p>
                        <p className="text-sm">{detail.busyTime || "Not provided"}</p>
                      </div>
                      {getTagList(detail.suitableFor).length > 0 && (
                        <div className="md:col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Suitable for</p>
                          <div className="flex flex-wrap gap-2">
                            {getTagList(detail.suitableFor).map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {detail.description && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm leading-relaxed text-gray-700">{detail.description}</p>
                    </div>
                  )}

                  {detail.imageUrls && detail.imageUrls.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Images</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {detail.imageUrls.slice(0, 3).map((img, idx) => (
                          <button
                            key={img.imageId || img.imageUrl}
                            type="button"
                            onClick={() => openPreview(detail.imageUrls, idx)}
                            className="group relative overflow-hidden rounded-xl border border-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            <img
                              src={img.imageUrl}
                              alt={img.altText || detail.name || "place image"}
                              loading="lazy"
                              decoding="async"
                              fetchPriority="low"
                              className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={handleImageError}
                            />
                            <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/40" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-800">
                                <ZoomIn className="h-3.5 w-3.5" />
                                View
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-10">
                  Detail not available.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={(previewImages?.length ?? 0) > 0} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden rounded-2xl">
          <div className="flex flex-col h-full">
            <DialogHeader className="flex flex-row items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50 space-y-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900">Image Preview</DialogTitle>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {previewImages?.[previewIndex]?.altText || detail?.name || "Place image"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="text-gray-400 hover:text-gray-600 transition-all duration-200 rounded-full p-2 hover:bg-white hover:scale-110"
                aria-label="Close preview"
              >
                <X className="w-6 h-6" />
              </button>
            </DialogHeader>

            <div className="flex-1 bg-gray-50 p-6 overflow-auto flex items-center justify-center relative">
              {previewImages && previewImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => goPreview("prev")}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 text-gray-700 shadow-xl flex items-center justify-center hover:bg-white hover:text-gray-900 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goPreview("next")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 text-gray-700 shadow-xl flex items-center justify-center hover:bg-white hover:text-gray-900 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-4 right-5 bg-white/90 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 shadow-lg">
                    {previewIndex + 1}/{previewImages.length}
                  </div>
                </>
              )}

              {previewImages?.[previewIndex] ? (
                <img
                  src={previewImages[previewIndex]?.imageUrl}
                  alt={previewImages[previewIndex]?.altText || "Preview image"}
                  className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl"
                  onError={handleImageError}
                />
              ) : (
                <div className="text-muted-foreground text-sm">Image not available.</div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={closePreview}
                className="transition-all duration-200 hover:scale-105 px-6"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ViewAllPlaces;