import React, { useState } from 'react';
import { UserX, Mail, CheckCircle, XCircle, Clock, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import eventService from '../../services/eventService';

interface Participant {
  userId: string;
  fullName: string;
  email: string;
  profilePictureUrl?: string;
  invitationStatus: string;
  rsvpDate?: string;
  invitedAt?: string;
}

interface ManageInvitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  participants: Participant[];
  onRefresh: () => Promise<void>;
  organizerId?: string;
}

const ManageInvitationsModal: React.FC<ManageInvitationsModalProps> = ({
  isOpen,
  onClose,
  eventId,
  participants,
  onRefresh,
  organizerId,
}) => {
  const [removing, setRemoving] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<{
    participantId: string;
    participantName: string;
    status: string;
  } | null>(null);

  // Statistics
  const stats = {
    total: participants.length,
    accepted: participants.filter(p => p.invitationStatus === 'accepted').length,
    pending: participants.filter(p => p.invitationStatus === 'pending').length,
    declined: participants.filter(p => p.invitationStatus === 'declined').length,
  };

  const handleRemoveInvitation = (participantId: string, participantName: string, status: string) => {
    setPendingRemove({ participantId, participantName, status });
    setShowConfirmDialog(true);
  };

  const handleConfirmRemove = async () => {
    if (!pendingRemove) return;

    const { participantId, participantName, status } = pendingRemove;
    const isAccepted = status === 'accepted';

    try {
      setRemoving(participantId);
      setShowConfirmDialog(false);
      await eventService.removeParticipant(eventId, participantId);
      toast.success(
        isAccepted
          ? `${participantName} has been removed from the event`
          : `Invitation for ${participantName} has been cancelled`
      );
      await onRefresh();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      toast.error('Failed to remove: ' + errorMessage);
    } finally {
      setRemoving(null);
      setPendingRemove(null);
    }
  };

  const handleCancelRemove = () => {
    setShowConfirmDialog(false);
    setPendingRemove(null);
  };

  const handleResendInvitation = async (participantId: string, participantName: string) => {
    try {
      setResending(participantId);
      await eventService.inviteParticipants(eventId, [participantId]);
      toast.success(`Invitation resent to ${participantName}`);
      await onRefresh();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      toast.error('Failed to resend invitation: ' + errorMessage);
    } finally {
      setResending(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'default';
      case 'declined':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  // Group participants by status
  const groupedParticipants = {
    accepted: participants.filter(p => p.invitationStatus === 'accepted'),
    pending: participants.filter(p => p.invitationStatus === 'pending'),
    declined: participants.filter(p => p.invitationStatus === 'declined'),
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <Users className="mr-2 h-6 w-6 text-blue-600" />
            Manage Invitations
          </DialogTitle>
          <DialogDescription>
            View and manage all event invitations
          </DialogDescription>
        </DialogHeader>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Total</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">Accepted</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{stats.accepted}</p>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-700">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-red-700">Declined</span>
            </div>
            <p className="text-2xl font-bold text-red-900">{stats.declined}</p>
          </div>
        </div>

        {/* Participants List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Accepted Participants */}
          {groupedParticipants.accepted.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Accepted ({groupedParticipants.accepted.length})
              </h3>
              <div className="space-y-2">
                {groupedParticipants.accepted.map((participant) => (
                  <ParticipantCard
                    key={participant.userId}
                    participant={participant}
                    onRemove={handleRemoveInvitation}
                    removing={removing === participant.userId}
                    getStatusIcon={getStatusIcon}
                    getStatusBadgeVariant={getStatusBadgeVariant}
                    organizerId={organizerId}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending Participants */}
          {groupedParticipants.pending.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                Pending ({groupedParticipants.pending.length})
              </h3>
              <div className="space-y-2">
                {groupedParticipants.pending.map((participant) => (
                  <ParticipantCard
                    key={participant.userId}
                    participant={participant}
                    onRemove={handleRemoveInvitation}
                    onResend={handleResendInvitation}
                    removing={removing === participant.userId}
                    resending={resending === participant.userId}
                    getStatusIcon={getStatusIcon}
                    getStatusBadgeVariant={getStatusBadgeVariant}
                    organizerId={organizerId}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Declined Participants */}
          {groupedParticipants.declined.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Declined ({groupedParticipants.declined.length})
              </h3>
              <div className="space-y-2">
                {groupedParticipants.declined.map((participant) => (
                  <ParticipantCard
                    key={participant.userId}
                    participant={participant}
                    onRemove={handleRemoveInvitation}
                    onResend={handleResendInvitation}
                    removing={removing === participant.userId}
                    resending={resending === participant.userId}
                    getStatusIcon={getStatusIcon}
                    getStatusBadgeVariant={getStatusBadgeVariant}
                    organizerId={organizerId}
                  />
                ))}
              </div>
            </div>
          )}

          {participants.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No participants yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemove && (
                <>
                  {pendingRemove.status === 'accepted'
                    ? `Are you sure you want to remove ${pendingRemove.participantName} from this event? They have already accepted the invitation.`
                    : `Are you sure you want to cancel the invitation for ${pendingRemove.participantName}?`}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRemove}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove} className="bg-red-600 hover:bg-red-700">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

interface ParticipantCardProps {
  participant: Participant;
  onRemove: (participantId: string, participantName: string, status: string) => void;
  onResend?: (participantId: string, participantName: string) => void;
  removing: boolean;
  resending?: boolean;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusBadgeVariant: (status: string) => 'default' | 'destructive' | 'secondary';
  organizerId?: string;
}

const ParticipantCard: React.FC<ParticipantCardProps> = ({
  participant,
  onRemove,
  onResend,
  removing,
  resending,
  getStatusIcon,
  getStatusBadgeVariant,
  organizerId,
}) => {
  const isOrganizer = organizerId && participant.userId === organizerId;
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all">
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={participant.profilePictureUrl} alt={participant.fullName} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {participant.fullName?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {participant.fullName || participant.email}
          </p>
          <p className="text-xs text-gray-500 truncate flex items-center">
            <Mail className="h-3 w-3 mr-1" />
            {participant.email}
          </p>
          {participant.invitedAt && (
            <p className="text-xs text-gray-400 mt-0.5">
              Invited: {new Date(participant.invitedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <Badge variant={getStatusBadgeVariant(participant.invitationStatus)} className="text-xs shrink-0 ml-2">
          <span className="flex items-center gap-1">
            {getStatusIcon(participant.invitationStatus)}
            {participant.invitationStatus}
          </span>
        </Badge>
      </div>
      <div className="flex items-center gap-2 ml-4">
        {onResend && participant.invitationStatus !== 'accepted' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResend(participant.userId, participant.fullName || participant.email)}
            disabled={resending || removing}
            className="text-xs"
          >
            {resending ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Resend
              </>
            )}
          </Button>
        )}
        {!isOrganizer && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemove(participant.userId, participant.fullName || participant.email, participant.invitationStatus)}
            disabled={removing || resending}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {removing ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <UserX className="h-3 w-3 mr-1" />
                {participant.invitationStatus === 'accepted' ? 'Remove from Event' : 'Cancel Invitation'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ManageInvitationsModal;

