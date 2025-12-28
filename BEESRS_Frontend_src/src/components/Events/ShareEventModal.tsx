import React, { useState, useEffect } from "react";
import { X, Search, User, Mail, Share2, AlertCircle, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import eventService from "@/services/eventService";
import { ViewFriends } from "@/services/userService";
import type { EventShareCreateRequest, EventShareDetailResponse } from "@/types/event.types";

interface Friend {
  userId: string;
  userName: string;
  fullName: string;
  profilePictureUrl: string | null;
  email?: string;
}

interface ShareEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  onShareSuccess?: () => void;
}

const ShareEventModal: React.FC<ShareEventModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  onShareSuccess,
}) => {
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [permissionLevel, setPermissionLevel] = useState<string>("View");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingFriends, setIsFetchingFriends] = useState(false);
  const [shareMethod, setShareMethod] = useState<"friend" | "email">("friend");
  const [activeTab, setActiveTab] = useState<"share" | "manage">("share");
  const [currentShares, setCurrentShares] = useState<EventShareDetailResponse[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      if (activeTab === "manage") {
        loadCurrentShares();
      }
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredFriends(friends);
    } else {
      const filtered = friends.filter(
        (friend) =>
          friend.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          friend.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          friend.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFriends(filtered);
    }
  }, [searchQuery, friends]);

  const fetchFriends = async () => {
    try {
      setIsFetchingFriends(true);
      const response = await ViewFriends();
      const friendsData = response.items || [];
      setFriends(friendsData);
      setFilteredFriends(friendsData);
    } catch (error: any) {
      console.error("Error fetching friends:", error);
      toast({
        title: "Error",
        description: "Failed to load friends list",
        variant: "destructive",
      });
    } finally {
      setIsFetchingFriends(false);
    }
  };

  const loadCurrentShares = async () => {
    try {
      setIsLoadingShares(true);
      const shares = await eventService.getEventShares(eventId);
      setCurrentShares(shares);
    } catch (error: any) {
      console.error("Error loading current shares:", error);
      toast({
        title: "Error",
        description: "Failed to load current shares",
        variant: "destructive",
      });
    } finally {
      setIsLoadingShares(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      await eventService.revokeShareEvent(shareId);
      toast({
        title: "Success",
        description: "Share access revoked successfully",
      });
      loadCurrentShares();
      onShareSuccess?.();
    } catch (error: any) {
      console.error("Error revoking share:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to revoke share",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (shareMethod === "friend" && !selectedFriendId) {
      toast({
        title: "Error",
        description: "Please select a friend to share with",
        variant: "destructive",
      });
      return;
    }

    if (shareMethod === "email" && !emailInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const request: EventShareCreateRequest = {
        permissionLevel,
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 days from now
      };

      if (shareMethod === "friend") {
        request.sharedWithUserId = selectedFriendId!;
      } else {
        request.sharedWithEmail = emailInput.trim();
      }

      await eventService.shareEvent(eventId, request);

      toast({
        title: "Success",
        description: `Event "${eventTitle}" shared successfully!`,
      });

      // Reset form
      setSelectedFriendId(null);
      setEmailInput("");
      setPermissionLevel("View");
      setShareMethod("friend");

      // Reload current shares if on manage tab
      if (activeTab === "manage") {
        loadCurrentShares();
      }

      onShareSuccess?.();
    } catch (error: any) {
      console.error("Error sharing event:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to share event",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Share2 className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Share Event</h2>
              <p className="text-sm text-gray-400">{eventTitle}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700/50">
          <button
            onClick={() => setActiveTab("share")}
            className={`flex-1 px-6 py-3 font-semibold transition-colors ${
              activeTab === "share"
                ? "bg-blue-500/20 text-blue-400 border-b-2 border-blue-500"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
            }`}
          >
            <Share2 className="h-4 w-4 inline mr-2" />
            Share Event
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            className={`flex-1 px-6 py-3 font-semibold transition-colors ${
              activeTab === "manage"
                ? "bg-blue-500/20 text-blue-400 border-b-2 border-blue-500"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
            }`}
          >
            <Settings className="h-4 w-4 inline mr-2" />
            Manage Shares
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === "share" ? (
            <>
          {/* Share Method Selection */}
          <div className="flex gap-4">
            <Button
              variant={shareMethod === "friend" ? "default" : "outline"}
              onClick={() => setShareMethod("friend")}
              className="flex-1"
            >
              <User className="h-4 w-4 mr-2" />
              Share with Friend
            </Button>
            <Button
              variant={shareMethod === "email" ? "default" : "outline"}
              onClick={() => setShareMethod("email")}
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              Share via Email
            </Button>
          </div>

          {/* Friend Selection */}
          {shareMethod === "friend" && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              {isFetchingFriends ? (
                <div className="text-center py-8 text-gray-400">
                  Loading friends...
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-500" />
                  <p>No friends found</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredFriends.map((friend) => (
                    <div
                      key={friend.userId}
                      onClick={() => setSelectedFriendId(friend.userId)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedFriendId === friend.userId
                          ? "bg-blue-500/20 border-2 border-blue-500"
                          : "bg-gray-800/50 border-2 border-transparent hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {friend.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {friend.fullName}
                          </p>
                          <p className="text-sm text-gray-400">
                            @{friend.userName}
                          </p>
                        </div>
                        {selectedFriendId === friend.userId && (
                          <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Email Input */}
          {shareMethod === "email" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="Enter email address"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
          )}

          {/* Permission Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Permission Level
            </label>
            <select
              value={permissionLevel}
              onChange={(e) => setPermissionLevel(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
            >
              <option value="View">View Only</option>
              <option value="Invite">Invite Participants</option>
              <option value="Manage">Manage Event</option>
            </select>
          </div>
            </>
          ) : (
            <>
              {/* Manage Shares Tab */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Current Shares</h3>
                
                {isLoadingShares ? (
                  <div className="text-center py-8 text-gray-400">
                    Loading shares...
                  </div>
                ) : currentShares.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-500" />
                    <p>No shares found</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {currentShares.map((share) => (
                      <div
                        key={share.shareId}
                        className="p-4 rounded-lg bg-gray-800/50 border border-gray-700"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {share.sharedWithUserId ? (
                                <User className="h-4 w-4 text-blue-400" />
                              ) : (
                                <Mail className="h-4 w-4 text-green-400" />
                              )}
                              <span className="text-white font-medium">
                                {share.sharedWithUserName || share.sharedWithEmail || "Unknown"}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-400">
                              <p>
                                <span className="font-semibold">Permission:</span> {share.permissionLevel}
                              </p>
                              <p>
                                <span className="font-semibold">Shared at:</span>{" "}
                                {new Date(share.sharedAt).toLocaleString()}
                              </p>
                              {share.expiresAt && (
                                <p>
                                  <span className="font-semibold">Expires at:</span>{" "}
                                  {new Date(share.expiresAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRevokeShare(share.shareId)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700/50">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Close
          </Button>
          {activeTab === "share" && (
            <Button
              onClick={handleShare}
              disabled={
                isLoading ||
                (shareMethod === "friend" && !selectedFriendId) ||
                (shareMethod === "email" && !emailInput.trim())
              }
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Sharing..." : "Share Event"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareEventModal;





