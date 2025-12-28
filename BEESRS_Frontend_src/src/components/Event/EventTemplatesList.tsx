import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  FileText, 
  Calendar, 
  Users, 
  DollarSign, 
  Clock, 
  Globe, 
  Star, 
  Tag,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import eventService from '../../services/eventService';
import CreateEventFromTemplateModal from './CreateEventFromTemplateModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import CreateEventTemplateModal from './CreateEventTemplateModal';
import { format } from 'date-fns';

interface EventTemplate {
  templateId: string;
  templateName: string;
  description?: string;
  title: string;
  eventDescription?: string;
  eventType: string;
  estimatedDuration?: number;
  expectedAttendees: number;
  maxAttendees?: number;
  budgetTotal?: number;
  budgetPerPerson?: number;
  timezone?: string;
  isPublic: boolean;
  isDefault: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: string;
  eventImageUrl?: string;
  imageUrl?: string;
}

interface EventTemplatesListProps {
  publicOnly?: boolean;
  onTemplateSelect?: (template: EventTemplate) => void;
  onRefresh?: () => void;
}

const EventTemplatesList: React.FC<EventTemplatesListProps> = ({ 
  publicOnly = false,
  onTemplateSelect,
  onRefresh
}) => {
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
    // Get current user ID from token
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
        setCurrentUserId(userId);
      }
    } catch (error) {
      console.error('Error parsing token:', error);
    }
  }, [publicOnly]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await eventService.getEventTemplates(publicOnly);
      setTemplates(data);
    } catch (error: any) {
      toast.error('Failed to load templates: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = (template: EventTemplate) => {
    if (onTemplateSelect) {
      onTemplateSelect(template);
    } else {
      setSelectedTemplate(template);
      setShowCreateModal(true);
    }
  };

  const handleView = (template: EventTemplate) => {
    setSelectedTemplate(template);
    setShowViewModal(true);
  };

  const handleEdit = (template: EventTemplate) => {
    setSelectedTemplate(template);
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    
    try {
      setDeleting(true);
      await eventService.deleteEventTemplate(selectedTemplate.templateId);
      toast.success('Template deleted successfully');
      setShowDeleteDialog(false);
      setSelectedTemplate(null);
      fetchTemplates();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error('Failed to delete template: ' + (error.response?.data?.message || error.message));
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateEvent = async (scheduledDate: string, scheduledTime: string) => {
    if (!selectedTemplate) return;

    try {
      await eventService.createEventFromTemplate(
        selectedTemplate.templateId,
        scheduledDate,
        scheduledTime
      );
      toast.success('Event created from template successfully!');
      setShowCreateModal(false);
      setSelectedTemplate(null);
    } catch (error: any) {
      toast.error('Failed to create event: ' + (error.response?.data?.message || error.message));
    }
  };

  const getEventAvatar = (template: EventTemplate) => {
    const imageUrl = template.imageUrl || template.eventImageUrl;
    const initials = template.templateName.charAt(0).toUpperCase();
    // Neutral gray gradient
    const gradientClass = 'from-slate-600 to-slate-700';

    if (imageUrl) {
      return (
        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-sm border border-slate-200">
          <img
            src={imageUrl}
            alt={template.templateName}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }}
          />
          <div
            className={`avatar-fallback w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-semibold text-lg`}
            style={{ display: 'none' }}
          >
            {initials}
          </div>
        </div>
      );
    }

    return (
      <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-semibold text-lg shadow-sm border border-slate-300 flex-shrink-0`}>
        {initials}
      </div>
    );
  };

  const canEditOrDelete = (template: EventTemplate) => {
    if (publicOnly) return false;
    return currentUserId === template.createdBy;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
          <span className="text-sm text-muted-foreground">Loading templates...</span>
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">No templates found</h3>
              <p className="text-sm text-muted-foreground">
                {!publicOnly && 'Create your first template to get started!'}
                {publicOnly && 'No public templates available at the moment.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card 
            key={template.templateId} 
            className="group hover:shadow-2xl transition-all duration-500 border-0 overflow-hidden relative bg-white/80 backdrop-blur-sm"
            style={{
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }}
          >
            {/* Delete Button - Top Right Corner */}
            {canEditOrDelete(template) && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-white/90 hover:bg-red-50 text-red-500 hover:text-red-600 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTemplate(template);
                  setShowDeleteDialog(true);
                }}
                title="Delete template"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            {/* Header with Avatar - Neutral Design */}
            <div className="relative bg-slate-50 border-b border-slate-200 p-4">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="relative">
                  {getEventAvatar(template)}
                  {template.isDefault && (
                    <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 shadow-md">
                      <Star className="h-3 w-3 text-white fill-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-lg font-semibold line-clamp-2 text-slate-900">
                      {template.templateName}
                    </CardTitle>
                  </div>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {template.isPublic && (
                      <Badge variant="outline" className="text-xs px-2 py-0.5 bg-white border-slate-300">
                        <Globe className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    )}
                    {template.isDefault && (
                      <Badge className="bg-amber-500 text-white text-xs px-2 py-0.5 border-0">
                        <Star className="h-3 w-3 mr-1 fill-white" />
                        Default
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="p-4 space-y-3 bg-white">
              {template.description && (
                <CardDescription className="text-sm line-clamp-2 text-slate-600 leading-relaxed">
                  {template.description}
                </CardDescription>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <Calendar className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 mb-0.5">Event Title</p>
                    <p className="text-sm font-medium text-slate-900 truncate">{template.title}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <Tag className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 mb-0.5">Event Type</p>
                    <p className="text-sm font-medium text-slate-900 truncate">{template.eventType}</p>
                  </div>
                </div>
              </div>

              {/* Stats Grid - Neutral */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <Users className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-900 font-medium">{template.expectedAttendees}</p>
                    <p className="text-[10px] text-slate-500">attendees</p>
                  </div>
                </div>
                
                {template.estimatedDuration && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <Clock className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-900 font-medium">{template.estimatedDuration}</p>
                      <p className="text-[10px] text-slate-500">minutes</p>
                    </div>
                  </div>
                )}
                
                {template.budgetPerPerson && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <DollarSign className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-900 font-medium">${template.budgetPerPerson.toFixed(2)}</p>
                      <p className="text-[10px] text-slate-500">per person</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <Star className="h-3.5 w-3.5 text-slate-600 fill-slate-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-900 font-medium">{template.usageCount}</p>
                    <p className="text-[10px] text-slate-500">uses</p>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-3 pt-0 bg-slate-50/50 border-t border-slate-200 flex gap-2">
              <Button 
                variant="outline"
                size="sm"
                className="flex-1 border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition-all"
                onClick={() => handleView(template)}
              >
                <Eye className="mr-1.5 h-4 w-4" />
                View
              </Button>
              {canEditOrDelete(template) && (
                <Button 
                  variant="outline"
                  size="sm"
                  className="border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition-all"
                  onClick={() => handleEdit(template)}
                >
                  <Edit className="mr-1.5 h-4 w-4" />
                  Edit
                </Button>
              )}
              <Button 
                onClick={() => handleUseTemplate(template)}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white transition-all"
              >
                Use Template
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* View Details Modal */}
      {showViewModal && selectedTemplate && (
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start gap-4">
                {getEventAvatar(selectedTemplate)}
                <div className="flex-1">
                  <DialogTitle className="text-2xl font-bold mb-2">
                    {selectedTemplate.templateName}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedTemplate.description || 'No description provided'}
                  </DialogDescription>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedTemplate.isPublic && (
                      <Badge variant="outline">
                        <Globe className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    )}
                    {selectedTemplate.isDefault && (
                      <Badge>
                        <Star className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Event Title</p>
                  <p className="text-base font-semibold">{selectedTemplate.title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Event Type</p>
                  <p className="text-base font-semibold">{selectedTemplate.eventType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Expected Attendees</p>
                  <p className="text-base font-semibold">{selectedTemplate.expectedAttendees}</p>
                </div>
                {selectedTemplate.maxAttendees && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Max Attendees</p>
                    <p className="text-base font-semibold">{selectedTemplate.maxAttendees}</p>
                  </div>
                )}
                {selectedTemplate.estimatedDuration && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Duration</p>
                    <p className="text-base font-semibold">{selectedTemplate.estimatedDuration} minutes</p>
                  </div>
                )}
                {selectedTemplate.budgetPerPerson && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Budget Per Person</p>
                    <p className="text-base font-semibold">${selectedTemplate.budgetPerPerson.toFixed(2)} USD</p>
                  </div>
                )}
                {selectedTemplate.budgetTotal && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Budget</p>
                    <p className="text-base font-semibold">${selectedTemplate.budgetTotal.toFixed(2)} USD</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Usage Count</p>
                  <p className="text-base font-semibold">{selectedTemplate.usageCount} times</p>
                </div>
                {selectedTemplate.timezone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Timezone</p>
                    <p className="text-base font-semibold">{selectedTemplate.timezone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Created At</p>
                  <p className="text-base font-semibold">
                    {format(new Date(selectedTemplate.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              {selectedTemplate.eventDescription && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Event Description</p>
                  <p className="text-base">{selectedTemplate.eventDescription}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              {canEditOrDelete(selectedTemplate) && (
                <>
                  <Button variant="outline" onClick={() => {
                    setShowViewModal(false);
                    handleEdit(selectedTemplate);
                  }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" onClick={() => {
                    setShowViewModal(false);
                    setShowDeleteDialog(true);
                  }}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}
              <Button onClick={() => setShowViewModal(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTemplate && (
        <CreateEventTemplateModal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTemplate(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedTemplate(null);
            fetchTemplates();
            if (onRefresh) onRefresh();
          }}
          initialData={selectedTemplate}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && selectedTemplate && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Template</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedTemplate.templateName}"? This action cannot be undone.
                {selectedTemplate.usageCount > 0 && (
                  <span className="block mt-2 text-amber-600">
                    Note: This template has been used {selectedTemplate.usageCount} time(s).
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowDeleteDialog(false);
                setSelectedTemplate(null);
              }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Event Modal */}
      {showCreateModal && selectedTemplate && (
        <CreateEventFromTemplateModal
          template={selectedTemplate}
          open={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedTemplate(null);
          }}
          onCreate={handleCreateEvent}
        />
      )}
    </>
  );
};

export default EventTemplatesList;
