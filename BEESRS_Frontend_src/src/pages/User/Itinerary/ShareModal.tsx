import { useState, useEffect } from "react";
import {
  X,
  Share2,
  Users,
  Mail,
  UserPlus,
  Trash2,
  Check,
  Copy,
  Globe,
  Lock,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { useToast } from "../../../components/ui/use-toast";
import type {
  ShareItineraryRequest,
  ItineraryShare,
} from "../../../types/itinerary.types";
import {
  shareItinerary,
  getItineraryShares,
  revokeShare,
} from "../../../services/itineraryService";

interface ShareModalProps {
  itineraryId: string;
  onClose: () => void;
}

export default function ShareModal({ itineraryId, onClose }: ShareModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState<ItineraryShare[]>([]);
  const [shareEmail, setShareEmail] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [message, setMessage] = useState("");
  const [shareLink, setShareLink] = useState("");

  useEffect(() => {
    loadShares();
    generateShareLink();
  }, []);

  const loadShares = async () => {
    try {
      const data = await getItineraryShares(itineraryId);
      setShares(data);
    } catch (error) {
      console.error("Failed to load shares:", error);
    }
  };

  const generateShareLink = () => {
    const baseUrl = window.location.origin;
    setShareLink(`${baseUrl}/itinerary/${itineraryId}`);
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shareEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Mock user ID - In real app, search user by email first
      const shareRequest: ShareItineraryRequest = {
        sharedWithUserId: "00000000-0000-0000-0000-000000000000", // Temporarily value, not used in backend
        sharedWithEmail: shareEmail,
        canEdit,
        message: message.trim() || undefined,
      };

      await shareItinerary(itineraryId, shareRequest);

      toast({
        title: "Success",
        description: `Itinerary shared with ${shareEmail}`,
      });

      setShareEmail("");
      setMessage("");
      setCanEdit(false);
      loadShares();
    } catch (error) {
      console.error("Failed to share:", error);
      toast({
        title: "Error",
        description: "Failed to share itinerary",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!confirm("Are you sure you want to revoke this share?")) return;

    try {
      console.log("Revoking share with ID:", shareId);
      await revokeShare(shareId);
      toast({
        title: "Success",
        description: "Share access revoked",
      });
      loadShares();
    } catch (error) {
      console.error("Failed to revoke share:", error);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast({
      title: "Copied!",
      description: "Share link copied to clipboard",
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Share2 className="h-6 w-6 text-blue-600" />
              Share Itinerary
            </h2>
            <p className="text-gray-600">
              Share your itinerary with friends and family
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Share Link */}
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <Label className="text-base font-semibold mb-3 flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              Share Link
            </Label>
            <div className="flex gap-2">
              <Input
                value={shareLink}
                readOnly
                className="bg-white"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button onClick={handleCopyLink} variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Anyone with this link can view your itinerary
            </p>
          </Card>

          {/* Share with Specific User */}
          <form onSubmit={handleShare}>
            <Card className="p-4">
              <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                Share with Specific User
              </Label>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="friend@example.com"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="message">Personal Message (Optional)</Label>
                  <textarea
                    id="message"
                    placeholder="Hey! Check out my travel itinerary..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="canEdit"
                    checked={canEdit}
                    onChange={(e) => setCanEdit(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <Label htmlFor="canEdit" className="cursor-pointer">
                    Allow this person to edit the itinerary
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={loading}
                >
                  {loading ? "Sharing..." : "Share Itinerary"}
                </Button>
              </div>
            </Card>
          </form>

          {/* Current Shares */}
          <div>
            <Label className="text-base font-semibold mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Shared With ({shares.length})
            </Label>

            {shares.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">
                  You haven't shared this itinerary yet
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {shares.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    No shares found.
                  </div>
                ) :
                (shares.map((share) => (
                  <Card key={share.shareId} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {share.sharedWithUser?.userName?.[0]?.toUpperCase() ||
                            "?"}
                        </div>

                        {/* User Info */}
                        <div>
                          <div className="font-semibold text-gray-900">
                            {share.sharedWithUser?.userName || "Unknown User"}
                          </div>
                          <div className="text-sm text-gray-600">
                            {share.sharedWithUser?.email}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Shared on {formatDate(share.sharedAt)}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={share.canEdit ? "default" : "secondary"}
                          className="flex items-center gap-1"
                        >
                          {share.canEdit ? (
                            <>
                              <Check className="h-3 w-3" />
                              Can Edit
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3" />
                              View Only
                            </>
                          )}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeShare(share.shareId)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <div className="flex gap-3">
              <div className="text-yellow-600 mt-0.5">
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="text-sm text-yellow-900">
                <p className="font-semibold mb-1">Privacy Notice:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>
                    People with "View Only" access can see your itinerary but
                    cannot make changes
                  </li>
                  <li>
                    People with "Can Edit" access can add, modify, or remove
                    places
                  </li>
                  <li>You can revoke access at any time</li>
                  <li>
                    Shared users will receive notifications about major changes
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-6">
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}


