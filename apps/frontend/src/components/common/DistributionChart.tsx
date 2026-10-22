import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Distribution } from '@/types';

export function DistributionChart({ data }: { data: Distribution[] }) {
  const rows = data.map((d) => ({ label: `${d.rating}★`, count: d.count }));
  return (
    <div className="h-56 w-full" role="img" aria-label={`Rating distribution: ${data.map((d) => `${d.rating} stars: ${d.count}`).join(', ')}`}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
          <Bar dataKey="count" name="Ratings" fill="hsl(243 75% 59%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
