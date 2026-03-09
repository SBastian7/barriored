'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CommunityForm } from '@/components/admin/community-form'
import { BoundaryEditor } from '@/components/admin/boundary-editor'
import { SettingsPanel } from '@/components/admin/settings-panel'

interface Props {
  communityId: string
  initialData: any
}

export function CommunityEditTabs({ communityId, initialData }: Props) {
  return (
    <Tabs defaultValue="info" className="space-y-6">
      <TabsList className="brutalist-card inline-flex">
        <TabsTrigger
          value="info"
          className="uppercase tracking-widest font-bold text-xs"
        >
          Información
        </TabsTrigger>
        <TabsTrigger
          value="boundaries"
          className="uppercase tracking-widest font-bold text-xs"
        >
          Límites
        </TabsTrigger>
        <TabsTrigger
          value="settings"
          className="uppercase tracking-widest font-bold text-xs"
        >
          Configuración
        </TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <CommunityForm mode="edit" initialData={initialData} />
      </TabsContent>

      <TabsContent value="boundaries">
        <BoundaryEditor
          communityId={communityId}
          communityName={initialData.name}
          municipality={initialData.municipality}
          department={initialData.department}
          initialBoundary={initialData.boundary}
        />
      </TabsContent>

      <TabsContent value="settings">
        <SettingsPanel
          communityId={communityId}
          initialSettings={{
            is_active: initialData.is_active,
            primary_color: initialData.primary_color,
            logo_url: initialData.logo_url,
          }}
        />
      </TabsContent>
    </Tabs>
  )
}
