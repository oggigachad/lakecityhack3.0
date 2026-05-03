import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = { CRITICAL: '#C0392B', MEDIUM: '#E67E22', LOW: '#27AE60' }

export default function SeverityDonut({ data = [] }) {
  if (!data.length) return <div className="skeleton" style={{ height: 180 }} />

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((entry, i) => <Cell key={i} fill={COLORS[entry.name] || '#1E3A5F'} />)}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
