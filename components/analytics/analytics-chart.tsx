'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface AnalyticsChartProps {
  data: {
    labels: string[]
    views: number[]
    clicks: number[]
  }
}

export function AnalyticsChart({ data }: AnalyticsChartProps) {
  // Transform data to Recharts format
  const chartData = data.labels.map((label, index) => ({
    date: label,
    views: data.views[index] || 0,
    clicks: data.clicks[index] || 0
  }))

  return (
    <div className="brutalist-card p-4 bg-white">
      <h3 className="text-lg font-black uppercase tracking-widest mb-4">
        Últimos 7 Días
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#000" opacity={0.1} />
          <XAxis
            dataKey="date"
            stroke="#000"
            style={{ fontSize: '12px', fontWeight: 'bold' }}
          />
          <YAxis
            stroke="#000"
            style={{ fontSize: '12px', fontWeight: 'bold' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '2px solid #000',
              borderRadius: '0',
              boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)'
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}
          />
          <Line
            type="monotone"
            dataKey="views"
            stroke="oklch(0.57 0.23 18)"
            strokeWidth={3}
            dot={{ r: 6 }}
            name="Vistas"
          />
          <Line
            type="monotone"
            dataKey="clicks"
            stroke="oklch(0.5 0.2 260)"
            strokeWidth={3}
            dot={{ r: 6 }}
            name="Clics WhatsApp"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
