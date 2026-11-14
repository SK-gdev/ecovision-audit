import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import Card from '../ui/Card';
import type { WasteComposition } from '../../types';

interface WasteBreakdownProps {
  data?: WasteComposition[];
  isLoading?: boolean;
}

const GREEN_PALETTE = [
  '#1B4332',
  '#2D6A4F',
  '#40916C',
  '#52B788',
  '#74C69D',
  '#95D5B2',
  '#B7E4C7',
];

export default function WasteBreakdown({ data = [], isLoading }: WasteBreakdownProps) {
  const chartData = data.map((item) => ({
    name: item.class_name,
    count: item.count,
    percentage: item.percentage,
  }));

  return (
    <Card className="p-5 flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-text-primary">
          Waste Stream Breakdown
        </h3>
        <p className="text-xs text-text-secondary">Item counts per category under active filters</p>
      </div>

      <div className="flex-1 min-h-[300px] w-full flex items-center justify-center">
        {isLoading ? (
          <div className="text-sm text-text-secondary animate-pulse">Loading breakdown...</div>
        ) : chartData.length === 0 ? (
          <div className="text-sm text-text-secondary">No data matching current filters</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0F0F0" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 11, fill: '#1A1A2E' }}
                width={100}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-surface p-2.5 rounded-lg shadow-md border border-gray-100 text-xs">
                        <p className="font-semibold text-text-primary">{d.name}</p>
                        <p className="text-text-secondary mt-0.5">
                          Count: <span className="font-medium text-text-primary">{d.count} items</span>
                        </p>
                        <p className="text-text-secondary">
                          Share: <span className="font-medium text-accent">{d.percentage}%</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={GREEN_PALETTE[index % GREEN_PALETTE.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
