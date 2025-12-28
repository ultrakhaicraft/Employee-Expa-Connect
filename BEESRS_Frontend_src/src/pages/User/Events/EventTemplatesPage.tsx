import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import EventTemplatesList from '../../../components/Event/EventTemplatesList';
import CreateEventTemplateModal from '../../../components/Event/CreateEventTemplateModal';

const EventTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(-1)}
                className="hover:bg-slate-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Event Templates</h1>
                <p className="text-slate-600 text-sm mt-0.5">Create and manage event templates</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="bg-white shadow-sm border border-slate-200">
          <TabsTrigger value="my" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4 mr-2" />
            My Templates
          </TabsTrigger>
          <TabsTrigger value="public" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4 mr-2" />
            Public Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="space-y-4">
          <EventTemplatesList 
            key={`my-${refreshKey}`} 
            publicOnly={false}
            onRefresh={() => setRefreshKey(prev => prev + 1)}
          />
        </TabsContent>

        <TabsContent value="public" className="space-y-4">
          <EventTemplatesList 
            key={`public-${refreshKey}`} 
            publicOnly={true}
            onRefresh={() => setRefreshKey(prev => prev + 1)}
          />
        </TabsContent>
      </Tabs>
      </div>

      {showCreateModal && (
        <CreateEventTemplateModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setRefreshKey(prev => prev + 1);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
};

export default EventTemplatesPage;

