'use client'

import { PushStatsDashboard } from './push-stats-dashboard'
import { PushTestSender } from './push-test-sender'
import { PushConfigPanel } from './push-config-panel'

export function NotificationsTab() {
  return (
    <div className="space-y-12">
      {/* Statistics Section */}
      <section>
        <h2 className="text-2xl font-heading font-black uppercase italic mb-4 border-b-2 border-black pb-2">
          📊 Estadísticas
        </h2>
        <PushStatsDashboard />
      </section>

      {/* Configuration Section */}
      <section>
        <h2 className="text-2xl font-heading font-black uppercase italic mb-4 border-b-2 border-black pb-2">
          ⚙️ Configuración y Pruebas
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PushTestSender />
          <PushConfigPanel />
        </div>
      </section>
    </div>
  )
}
