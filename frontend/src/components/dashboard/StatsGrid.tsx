import { Scale, Trash2, Recycle, AlertTriangle } from 'lucide-react';
import Card from '../ui/Card';
import type { DashboardStats } from '../../types';

interface StatsGridProps {
  stats?: DashboardStats;
  isLoading?: boolean;
}

export default function StatsGrid({ stats, isLoading }: StatsGridProps) {
  const totalWeight = stats?.total_weight_kg ?? 0;
  const plasticItems = stats?.total_plastic_items ?? stats?.plastic_items ?? 0;
  const recyclableItems = stats?.total_recyclable_items ?? stats?.recyclable_items ?? 0;
  const contaminationRate = ((stats?.avg_contamination_rate ?? 0) * 100).toFixed(1);

  const statItems = [
    {
      title: 'Total Waste Audited',
      value: isLoading ? '...' : `${totalWeight.toLocaleString()} kg`,
      description: `${stats?.total_audits ?? 0} audits recorded`,
      icon: Scale,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
    },
    {
      title: 'Plastic Items',
      value: isLoading ? '...' : plasticItems.toLocaleString(),
      description: 'Single-use & rigid plastics',
      icon: Trash2,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
    },
    {
      title: 'Recyclable Items',
      value: isLoading ? '...' : recyclableItems.toLocaleString(),
      description: 'Clean recyclable stream',
      icon: Recycle,
      iconColor: 'text-accent',
      iconBg: 'bg-accent/10',
    },
    {
      title: 'Contamination Rate',
      value: isLoading ? '...' : `${contaminationRate}%`,
      description: 'Items in incorrect bins',
      icon: AlertTriangle,
      iconColor: 'text-error',
      iconBg: 'bg-error/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-8">
      {statItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <Card key={idx} className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text-secondary">{item.title}</span>
              <div className={`p-2 rounded-lg ${item.iconBg}`}>
                <Icon className={`w-5 h-5 ${item.iconColor}`} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary tracking-tight">
                {item.value}
              </div>
              <p className="text-xs text-text-secondary mt-1">{item.description}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
