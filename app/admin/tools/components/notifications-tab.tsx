'use client'

import { PushStatsDashboard } from './push-stats-dashboard'

export function NotificationsTab() {
  return (
    <div className="space-y-8">
      {/* Statistics Section */}
      <section>
        <h2 className="text-2xl font-heading font-black uppercase italic mb-4">
          Estadísticas
        </h2>
        <PushStatsDashboard />
      </section>

      {/* Configuration Section (Phase 3) */}
      <section className="mt-12">
        <h2 className="text-2xl font-heading font-black uppercase italic mb-4">
          Configuración
        </h2>
        <div className="p-8 border-4 border-black rounded-none bg-white">
          <p className="text-center text-black/40 font-bold uppercase">
            Próximamente: Configuración y pruebas
          </p>
        </div>
      </section>
    </div>
  )
}
