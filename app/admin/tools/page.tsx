'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HardDrive, Bell } from 'lucide-react'

export default function AdminToolsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
          Herramientas de <span className="text-primary">Admin</span>
        </h1>
        <p className="font-bold text-black/60 text-sm">
          Gestión avanzada de almacenamiento, SEO y notificaciones.
        </p>
      </header>

      <Tabs defaultValue="images" className="space-y-6">
        <TabsList className="border-2 border-black bg-white">
          <TabsTrigger
            value="images"
            className="data-[state=active]:bg-primary data-[state=active]:text-white uppercase tracking-widest text-xs font-black"
          >
            <HardDrive className="h-4 w-4 mr-2" />
            Imágenes
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="data-[state=active]:bg-primary data-[state=active]:text-white uppercase tracking-widest text-xs font-black"
          >
            <Bell className="h-4 w-4 mr-2" />
            Notificaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="images">
          <div className="p-8 border-4 border-black rounded-none">
            <p className="text-center text-black/40 font-bold uppercase">
              Próximamente: Análisis de almacenamiento
            </p>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="p-8 border-4 border-black rounded-none">
            <p className="text-center text-black/40 font-bold uppercase">
              Próximamente: Estadísticas de notificaciones
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
