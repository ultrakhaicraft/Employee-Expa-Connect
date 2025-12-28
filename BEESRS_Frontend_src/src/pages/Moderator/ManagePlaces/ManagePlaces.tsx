import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPinCheck, ShieldCheck, FlagTriangleRight, ListChecks } from 'lucide-react'
import VerifyPlaces from './VerifyPlaces/VerifyPlaces'
import ViewReportPlaces from './ReportPlaces/ViewReportPlaces'
import ViewAllPlaces from './ViewAllPlaces/ViewAllPlaces'

export default function ManagePlaces() {
  const [tab, setTab] = useState<'verify' | 'reported' | 'all'>('verify')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <MapPinCheck className="w-8 h-8 text-blue-600" />
          Manage Places
        </h1>
        <p className="text-gray-600">
          Review newly submitted locations and resolve community reports in one streamlined workspace.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as 'verify' | 'reported' | 'all')} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="verify" className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Pending Verification
          </TabsTrigger>
          <TabsTrigger value="reported" className="flex items-center justify-center gap-2">
            <FlagTriangleRight className="w-4 h-4" />
            Reported Places
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center justify-center gap-2">
            <ListChecks className="w-4 h-4" />
            All Places
          </TabsTrigger>
        </TabsList>

        <TabsContent value="verify">
          <VerifyPlaces />
        </TabsContent>

        <TabsContent value="reported">
          <ViewReportPlaces />
        </TabsContent>

        <TabsContent value="all">
          <ViewAllPlaces />
        </TabsContent>
      </Tabs>
    </div>
  )
}

