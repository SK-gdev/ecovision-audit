import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import Card from '../ui/Card';
import type { WasteComposition } from '../../types';

interface WasteCompositionChartProps {
  data?: WasteComposition[];
  isLoading?: boolean;
}

const COLORS = [
  '#1B4332',
  '#2D6A4F',
  '#40916C',
  '#52B788',
  '#74C69D',
  '#95D5B2',
  '#B7E4C7',
];

export default function WasteCompositionChart({
  data = [],
  isLoading,
}: WasteCompositionChartProps) {
  const chartData = data.map((item) => ({
    name: item.class_name,
    value: item.count,
    percentage: item.percentage,
  }));

  return (
    <Card className="p-5 flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-text-primary">Waste Composition</h3>
        <p className="text-xs text-text-secondary">Distribution by detected waste category</p>
      </div>

      <div className="flex-1 min-h-[280px] w-full flex items-center justify-center">
        {isLoading ? (
          <div className="text-sm text-text-secondary animate-pulse">Loading chart data...</div>
        ) : chartData.length === 0 ? (
          <div className="text-sm text-text-secondary">No composition data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const dataPoint = payload[0].payload;
                    return (
                      <div className="bg-surface p-2.5 rounded-lg shadow-md border border-gray-100 text-xs">
                        <p className="font-semibold text-text-primary">{dataPoint.name}</p>
                        <p className="text-text-secondary mt-0.5">
                          Count: <span className="font-medium text-text-primary">{dataPoint.value}</span>
                        </p>
                        <p className="text-text-secondary">
                          Share: <span className="font-medium text-accent">{dataPoint.percentage}%</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
