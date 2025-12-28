// src/pages/User/Conversations/ConversationsPage.tsx
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, Plus, ArrowLeft, Users, AlertTriangle } from 'lucide-react';
// animations removed for a calmer UI on navigation to Messages
import { useConversation } from '../../../lib/hooks/useConversation';
import { ConversationList } from './ConversationList';
import { ConversationDetail } from './ConversationDetail';
import { FriendsList } from './FriendsList';
import { CreateGroupModal } from './CreateGroupModal';
import { Header } from '@/commonPage/Header/Header';
import { LeftSidebar } from '../../public/Home/components/LeftSidebar';
import { MobileSidebar } from '../../public/Home/components/MobileSidebar';
import { useToast } from '../../../components/ui/use-toast';
import type { RootState } from '../../../redux/store';
import type { SendMessageDto, EditMessageDto } from '../../../types/conversation.types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";

export const ConversationsPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, decodedToken } = useSelector((state: RootState) => state.auth);
  const currentUserId = decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
  const [showMobileList, setShowMobileList] = useState(!conversationId);
  const [activeNavItem, setActiveNavItem] = useState('messages');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'conversations' | 'friends'>('conversations');
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  const {
    conversations,
    currentConversation,
    currentMessages,
    currentTypingUsers,
    isLoading,
    sendMessage,
    editMessage,
    deleteMessage,
    sendTyping,
    deleteConversation,
    createDirectConversation,
    createGroupConversation,
    addReaction,
    removeReaction,
  } = useConversation(conversationId);

  const handleSelectConversation = (convId: string) => {
    navigate(`/conversations/${convId}`);
    setShowMobileList(false);
  };

  const handleBack = () => {
    navigate('/conversations');
    setShowMobileList(true);
  };

  const handleSendMessage = async (content: string, type: 'text' | 'image' | 'video' | 'location', mediaData?: any) => {
    if (!conversationId) {
      console.error('❌ No conversationId');
      return;
    }

    // For text messages, content is required
    // For media messages, content can be empty
    if (type === 'text' && (!content || content.trim() === '')) {
      console.error('❌ Empty message content for text message');
      return;
    }

    // For media messages, check if we have media data
    if (type !== 'text' && !mediaData) {
      console.error('❌ No media data for media message');
      return;
    }

    const dto: SendMessageDto = {
      conversationId,
      messageType: type,
      messageContent: content.trim(),
      fileUrl: mediaData?.url || '',
      fileName: mediaData?.fileName || '',
      fileSize: mediaData?.fileSize || 0,
      fileMimeType: mediaData?.mimeType || '',
      thumbnailUrl: mediaData?.thumbnailUrl || '',
      duration: Math.round(mediaData?.duration ?? 0) || 0,
      locationName: mediaData?.locationName || '',
      latitude: mediaData?.latitude || 0,
      longitude: mediaData?.longitude || 0,
    };

    console.log('📤 Preparing to send message:', dto);
    await sendMessage(dto);
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    const dto: EditMessageDto = {
      messageId,
      messageContent: content,
    };

    await editMessage(dto);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!conversationId) return;
    await deleteMessage(messageId, conversationId);
  };

  const handleTyping = (isTyping: boolean) => {
    sendTyping(isTyping);
  };

  const handleDeleteConversation = (convId: string) => {
    setIdToDelete(convId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteConversation = async () => {
    if (!idToDelete) return;
    
    const convId = idToDelete;
    setShowDeleteConfirm(false);
    
    try {
      await deleteConversation(convId);
      if (convId === conversationId) {
        handleBack();
      }
      toast({
        title: "Conversation deleted",
        description: "The conversation has been successfully removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    } finally {
      setIdToDelete(null);
    }
  };

  const handleSelectFriend = async (friend: any) => {
    try {
      toast({
        title: 'Creating conversation...',
        description: `Starting chat with ${friend.fullName}`,
      });

      // Create or get existing direct conversation
      const conversation = await createDirectConversation(friend.userId);
      
      if (conversation) {
        // Switch to conversations tab and navigate to the conversation
        setActiveTab('conversations');
        navigate(`/conversations/${conversation.conversationId}`);
        setShowMobileList(false);
        
        toast({
          title: 'Success!',
          description: `Chat opened with ${friend.fullName}`,
        });
      }
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive',
      });
    }
  };

  const handleCreateGroup = async (groupName: string, participantIds: string[]) => {
    const conversation = await createGroupConversation(groupName, participantIds);
    
    if (conversation) {
      // Switch to conversations tab and navigate to the new group
      setActiveTab('conversations');
      navigate(`/conversations/${conversation.conversationId}`);
      setShowMobileList(false);
    }
  };

  // Check authentication
  if (!isAuthenticated || !currentUserId) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600">Please log in to access conversations</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-hidden">
      {/* Fixed Header (single render for all breakpoints) */}
      <Header />

      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        activeItem={activeNavItem}
        onItemClick={setActiveNavItem}
      />

      <div className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] pt-2 md:pt-0 min-h-0">
        {/* Left Sidebar - Desktop Only */}
        <div className="hidden lg:block">
          <LeftSidebar 
            activeItem={activeNavItem} 
            onItemClick={setActiveNavItem} 
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex h-full bg-white">
          {/* Conversation List Sidebar (Desktop always visible, Mobile conditional) */}
          <div
            className={`
              w-full md:w-96 border-r border-gray-200 flex flex-col bg-white h-full min-h-0 overflow-y-auto overscroll-contain
              ${showMobileList ? 'block' : 'hidden md:block'}
            `}
            style={{ overflowAnchor: 'none' as any }}
          >
            {/* Tabs Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
              <div className="flex items-center justify-between px-6 py-4">
                <h1 className="text-xl font-bold text-gray-900">
                  {activeTab === 'conversations' ? 'Messages' : 'Friends'}
                </h1>
                {activeTab === 'conversations' && (
                  <button
                    onClick={() => setIsCreateGroupModalOpen(true)}
                    className="p-2.5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white hover:shadow-lg transition-all duration-200 hover:scale-105"
                    title="Create New Group"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              {/* Tab Buttons */}
              <div className="flex border-t border-gray-200">
                <button
                  onClick={() => setActiveTab('conversations')}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-3 font-medium transition-all duration-200
                    ${activeTab === 'conversations'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Conversations</span>
                  {conversations.length > 0 && (
                    <span className={`
                      text-xs px-2 py-0.5 rounded-full font-semibold
                      ${activeTab === 'conversations' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700'
                      }
                    `}>
                      {conversations.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('friends')}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-3 font-medium transition-all duration-200
                    ${activeTab === 'friends'
                      ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                      : 'text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  <Users className="w-4 h-4" />
                  <span>Friends</span>
                </button>
              </div>
            </div>


            {/* Tab Content */}
            {activeTab === 'conversations' ? (
              <>
                {isLoading ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600" />
                      <p className="text-sm text-gray-600">Loading conversations...</p>
                    </div>
                  </div>
                ) : (
                  <ConversationList
                    conversations={conversations}
                    currentConversationId={conversationId}
                    currentUserId={currentUserId}
                    onSelectConversation={handleSelectConversation}
                    onDeleteConversation={handleDeleteConversation}
                  />
                )}
              </>
            ) : (
              <FriendsList onSelectFriend={handleSelectFriend} />
            )}
          </div>

          {/* Main Chat Area */}
          <div
            className={`
              flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50/20
              ${!showMobileList ? 'block' : 'hidden md:block'}
            `}
          >
            {conversationId && currentConversation ? (
              <>
                {/* Mobile Back Button */}
                <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
                  <button
                    onClick={handleBack}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                  </button>
                </div>

                <div 
                  className="flex-1 overflow-y-auto overscroll-contain"
                  style={{ overflowAnchor: 'none' as any }}
                >
                  <ConversationDetail
                    conversation={currentConversation}
                    messages={currentMessages}
                    typingUsers={currentTypingUsers}
                    currentUserId={currentUserId}
                    onSendMessage={handleSendMessage}
                    onEditMessage={handleEditMessage}
                    onDeleteMessage={handleDeleteMessage}
                    onTyping={handleTyping}
                    onAddReaction={addReaction}
                    onRemoveReaction={removeReaction}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-4">
                  <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center shadow-lg">
                    <MessageCircle className="w-16 h-16 text-blue-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    Welcome to Messages
                  </h2>
                  <p className="text-gray-600 max-w-md text-lg">
                    Select a conversation from the list to start messaging with your friends
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar removed for Conversations page */}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onCreateGroup={handleCreateGroup}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="z-[10000] w-[90%] max-w-[400px] rounded-2xl p-6">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold text-gray-900">
              Delete Conversation?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-gray-500 text-base">
              Are you sure you want to delete this conversation? This action will remove all messages and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <AlertDialogCancel className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl py-3 font-semibold transition-all active:scale-95 m-0 order-2 sm:order-1">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteConversation}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 font-semibold transition-all active:scale-95 m-0 order-1 sm:order-2"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};


