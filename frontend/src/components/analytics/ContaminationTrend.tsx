import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import Card from '../ui/Card';
import type { ContaminationTrendPoint } from '../../types';

interface ContaminationTrendProps {
  data?: ContaminationTrendPoint[];
  isLoading?: boolean;
}

export default function ContaminationTrend({ data = [], isLoading }: ContaminationTrendProps) {
  const chartData = data.map((d) => ({
    date: d.date,
    rate: Number((d.contamination_rate * 100).toFixed(1)),
    count: d.audit_count,
  }));

  return (
    <Card className="p-5 flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-text-primary">
          Contamination Rate Trends
        </h3>
        <p className="text-xs text-text-secondary">Daily contamination percentage progression</p>
      </div>

      <div className="flex-1 min-h-[300px] w-full flex items-center justify-center">
        {isLoading ? (
          <div className="text-sm text-text-secondary animate-pulse">Loading trend...</div>
        ) : chartData.length === 0 ? (
          <div className="text-sm text-text-secondary">No trend points available</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis
                unit="%"
                domain={[0, 'auto']}
                tick={{ fontSize: 11, fill: '#6B7280' }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-surface p-2.5 rounded-lg shadow-md border border-gray-100 text-xs">
                        <p className="font-semibold text-text-primary mb-1">{label}</p>
                        <p className="text-error font-medium">
                          Contamination: {item.rate}%
                        </p>
                        <p className="text-text-secondary">
                          Audits recorded: {item.count}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#DC2626"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#DC2626' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
