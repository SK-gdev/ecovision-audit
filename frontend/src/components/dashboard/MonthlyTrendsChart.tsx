import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import Card from '../ui/Card';
import type { MonthlyTrend } from '../../types';

interface MonthlyTrendsChartProps {
  data?: MonthlyTrend[];
  isLoading?: boolean;
}

export default function MonthlyTrendsChart({ data = [], isLoading }: MonthlyTrendsChartProps) {
  const chartData = data.map((item) => ({
    month: item.month,
    weight: item.total_weight_kg ?? item.total_weight ?? 0,
    contaminationRate: Number(
      ((item.avg_contamination_rate ?? item.contamination_rate ?? 0) * 100).toFixed(1),
    ),
    audits: item.total_audits ?? item.audit_count ?? 0,
  }));

  return (
    <Card className="p-5 flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-text-primary">Monthly Audit Trends</h3>
        <p className="text-xs text-text-secondary">Total waste weight (kg) & contamination rate (%)</p>
      </div>

      <div className="flex-1 min-h-[280px] w-full flex items-center justify-center">
        {isLoading ? (
          <div className="text-sm text-text-secondary animate-pulse">Loading trend data...</div>
        ) : chartData.length === 0 ? (
          <div className="text-sm text-text-secondary">No trend data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                unit="kg"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                unit="%"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-surface p-2.5 rounded-lg shadow-md border border-gray-100 text-xs">
                        <p className="font-semibold text-text-primary mb-1">{label}</p>
                        {payload.map((entry, index) => (
                          <p key={index} style={{ color: entry.color }} className="flex justify-between gap-4">
                            <span>{entry.name}:</span>
                            <span className="font-medium">
                              {entry.value} {entry.name === 'Contamination Rate' ? '%' : 'kg'}
                            </span>
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              />
              <Bar
                yAxisId="left"
                dataKey="weight"
                name="Waste Weight (kg)"
                fill="#2D6A4F"
                radius={[4, 4, 0, 0]}
                barSize={28}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="contaminationRate"
                name="Contamination Rate"
                stroke="#DC2626"
                strokeWidth={2}
                dot={{ r: 3, fill: '#DC2626' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
