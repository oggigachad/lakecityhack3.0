import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const TYPE_COLORS = ['#1E3A5F', '#2A4A72', '#C0392B', '#E67E22', '#27AE60', '#8A9BB0', '#3498DB']

export default function TypeBarChart({ data = [] }) {
  if (!data.length) return <div className="skeleton" style={{ height: 180 }} />

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <XAxis type="number" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 8, fill: '#8A9BB0' }} />
        <YAxis type="category" dataKey="name" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 8, fill: '#8A9BB0' }} width={70} />
        <Tooltip contentStyle={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A' }} />
        <Bar dataKey="count" radius={[0, 2, 2, 0]}>
          {data.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
