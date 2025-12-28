import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import eventService from '../../services/eventService';
import { 
  FileText, 
  Calendar, 
  Users, 
  Clock, 
  DollarSign, 
  Globe, 
  Settings,
  Sparkles,
  Loader2
} from 'lucide-react';

interface CreateEventTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any; // For edit mode
}

const CreateEventTemplateModal: React.FC<CreateEventTemplateModalProps> = ({
  open,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    templateName: initialData?.templateName || '',
    description: initialData?.description || '',
    title: initialData?.title || '',
    eventDescription: initialData?.eventDescription || '',
    eventType: initialData?.eventType || '',
    estimatedDuration: initialData?.estimatedDuration?.toString() || '',
    expectedAttendees: initialData?.expectedAttendees?.toString() || '',
    maxAttendees: initialData?.maxAttendees?.toString() || '',
    budgetTotal: initialData?.budgetTotal?.toString() || '',
    budgetPerPerson: initialData?.budgetPerPerson?.toString() || '',
    timezone: initialData?.timezone || 'UTC',
    isPublic: initialData?.isPublic || false,
    isDefault: initialData?.isDefault || false,
  });

  // Update form when initialData changes
  React.useEffect(() => {
    if (initialData) {
      setFormData({
        templateName: initialData.templateName || '',
        description: initialData.description || '',
        title: initialData.title || '',
        eventDescription: initialData.eventDescription || '',
        eventType: initialData.eventType || '',
        estimatedDuration: initialData.estimatedDuration?.toString() || '',
        expectedAttendees: initialData.expectedAttendees?.toString() || '',
        maxAttendees: initialData.maxAttendees?.toString() || '',
        budgetTotal: initialData.budgetTotal?.toString() || '',
        budgetPerPerson: initialData.budgetPerPerson?.toString() || '',
        timezone: initialData.timezone || 'UTC',
        isPublic: initialData.isPublic || false,
        isDefault: initialData.isDefault || false,
      });
    } else {
      // Reset form when no initialData
      setFormData({
        templateName: '',
        description: '',
        title: '',
        eventDescription: '',
        eventType: '',
        estimatedDuration: '',
        expectedAttendees: '',
        maxAttendees: '',
        budgetTotal: '',
        budgetPerPerson: '',
        timezone: 'UTC',
        isPublic: false,
        isDefault: false,
      });
    }
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const submitData = {
        templateName: formData.templateName,
        description: formData.description || undefined,
        title: formData.title,
        eventDescription: formData.eventDescription || undefined,
        eventType: formData.eventType,
        estimatedDuration: formData.estimatedDuration ? parseInt(formData.estimatedDuration) : undefined,
        expectedAttendees: parseInt(formData.expectedAttendees),
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : undefined,
        budgetTotal: formData.budgetTotal ? parseFloat(formData.budgetTotal) : undefined,
        budgetPerPerson: formData.budgetPerPerson ? parseFloat(formData.budgetPerPerson) : undefined,
        timezone: formData.timezone,
        isPublic: formData.isPublic,
        isDefault: formData.isDefault,
      };

      if (initialData) {
        // Edit mode
        await eventService.updateEventTemplate(initialData.templateId, submitData);
        toast.success('Template updated successfully!');
      } else {
        // Create mode
        await eventService.createEventTemplate(submitData);
        toast.success('Template created successfully!');
      }
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(`Failed to ${initialData ? 'update' : 'create'} template: ` + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        {/* Header with gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-8 py-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  {initialData ? 'Edit Event Template' : 'Create Event Template'}
                </DialogTitle>
                <DialogDescription className="text-emerald-50 mt-1">
                  {initialData ? 'Update your event template settings' : 'Design a reusable template for your amazing events'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Template Info Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Template Information</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="templateName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Template Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="templateName"
                      value={formData.templateName}
                      onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                      placeholder="E.g., Birthday Party Template"
                      className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Template Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what this template is for..."
                      className="resize-none bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Event Details Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Event Details</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Event Title <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="E.g., Annual Company Meeting"
                      className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eventType" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Event Type <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="eventType"
                      value={formData.eventType}
                      onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                      placeholder="E.g., Meeting, Party, Conference"
                      className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eventDescription" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Event Description
                    </Label>
                    <Textarea
                      id="eventDescription"
                      value={formData.eventDescription}
                      onChange={(e) => setFormData({ ...formData, eventDescription: e.target.value })}
                      placeholder="Provide details about the event..."
                      className="resize-none bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Attendees Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                    <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Attendees & Duration</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expectedAttendees" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Expected <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="expectedAttendees"
                        type="number"
                        value={formData.expectedAttendees}
                        onChange={(e) => {
                          const attendees = e.target.value;
                          // ✅ Tự động tính Total Budget nếu đã có Budget Per Person
                          const newFormData: any = {
                            ...formData,
                            expectedAttendees: attendees,
                          };
                          if (formData.budgetPerPerson && parseFloat(formData.budgetPerPerson) > 0) {
                            const budgetPerPerson = parseFloat(formData.budgetPerPerson);
                            const attendeesNum = parseInt(attendees) || 0;
                            newFormData.budgetTotal = (budgetPerPerson * attendeesNum).toFixed(2);
                          }
                          setFormData(newFormData);
                        }}
                        placeholder="0"
                        className="h-11 pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        required
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxAttendees" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Maximum
                    </Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="maxAttendees"
                        type="number"
                        value={formData.maxAttendees}
                        onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
                        placeholder="0"
                        className="h-11 pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="estimatedDuration" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Duration (minutes)
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="estimatedDuration"
                        type="number"
                        value={formData.estimatedDuration}
                        onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                        placeholder="E.g., 60, 120, 180"
                        className="h-11 pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Budget Planning</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budgetTotal" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Total Budget (USD)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                      <Input
                        id="budgetTotal"
                        type="number"
                        step="0.01"
                        value={formData.budgetTotal}
                        onChange={(e) => setFormData({ ...formData, budgetTotal: e.target.value })}
                        placeholder="0.00"
                        className="h-11 pl-8 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budgetPerPerson" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Per Person (USD)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                      <Input
                        id="budgetPerPerson"
                        type="number"
                        step="0.01"
                        value={formData.budgetPerPerson}
                        onChange={(e) => {
                          const budgetPerPerson = e.target.value;
                          // ✅ Tự động tính Total Budget nếu đã có Expected Attendees
                          const newFormData: any = {
                            ...formData,
                            budgetPerPerson: budgetPerPerson,
                          };
                          if (formData.expectedAttendees && parseFloat(budgetPerPerson) > 0) {
                            const budgetPerPersonNum = parseFloat(budgetPerPerson);
                            const attendeesNum = parseInt(formData.expectedAttendees) || 0;
                            newFormData.budgetTotal = (budgetPerPersonNum * attendeesNum).toFixed(2);
                          }
                          setFormData(newFormData);
                        }}
                        placeholder="0.00"
                        className="h-11 pl-8 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <Settings className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Settings</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Globe className="inline h-4 w-4 mr-1.5 text-slate-400" />
                      Timezone
                    </Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                    >
                      <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">🌐 UTC</SelectItem>
                        <SelectItem value="UTC+07:00">🇻🇳 UTC+07:00</SelectItem>
                        <SelectItem value="America/New_York">🇺🇸 America/New_York</SelectItem>
                        <SelectItem value="Europe/London">🇬🇧 Europe/London</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-2 space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <Checkbox
                        id="isPublic"
                        checked={formData.isPublic}
                        onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked as boolean })}
                        className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Public Template</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Allow others to discover and use this template
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <Checkbox
                        id="isDefault"
                        checked={formData.isDefault}
                        onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked as boolean })}
                        className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Set as Default</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          This template will be selected by default
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="px-6 h-11 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="px-8 h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {initialData ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {initialData ? 'Update Template' : 'Create Template'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventTemplateModal;

