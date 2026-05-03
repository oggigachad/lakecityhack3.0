import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function TimeSeriesChart({ data = [] }) {
  if (!data.length) return <div className="skeleton" style={{ height: 180 }} />

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data}>
        <XAxis dataKey="label" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 8, fill: '#8A9BB0' }} />
        <YAxis tick={{ fontFamily: 'IBM Plex Mono', fontSize: 8, fill: '#8A9BB0' }} />
        <Tooltip contentStyle={{ backgroundColor: '#0F1E38', border: '1px solid #1A2E4A' }} />
        <Line dataKey="count" stroke="#3498DB" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
